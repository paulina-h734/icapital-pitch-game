import Phaser from 'phaser';
import { TILE_SIZE, RENDER_SCALE } from '../config.js';
import { MAP_W, MAP_H, TILES } from '../map/level1.js';
import { exportJson, clearSaved } from '../map/mapStore.js';

// ---------------------------------------------------------------------------
// MapEditor — in-game map builder. Toggle with the backtick (`) key.
//
//   • Pick a terrain brush (Ground / Tree / Bush) and left-drag to paint.
//   • Pick a POI (Start, the 3 alts, KYC 1/2, Finish) and click to place it.
//   • Arrows / WASD pan the camera; mouse wheel zooms.
//   • Save persists to the browser; Export downloads the map as JSON to commit
//     as the canonical layout; Reset restores the default sketch layout.
//
// The HUD is a small DOM overlay so the controls are clickable; painting itself
// happens on the Phaser canvas via pointer events.
// ---------------------------------------------------------------------------

const EDIT_ZOOM = RENDER_SCALE * 0.55;
const PAN_SPEED = 16; // world px / frame

const BRUSHES = [
  { id: 'ground', label: 'Ground', val: TILES.GROUND },
  { id: 'tree', label: 'Tree', val: TILES.TREE },
  { id: 'bush', label: 'Bush', val: TILES.BUSH },
  { id: 'concrete', label: 'Concrete', val: TILES.CONCRETE },
  { id: 'bridge', label: 'Bridge', val: TILES.BRIDGE },
  { id: 'erase-op', label: 'Erase OP', clearOp: true }, // remove overpass overlay
  { id: 'shade', label: 'Shade', shade: 1 }, // paint the screen-dim zone
  { id: 'unshade', label: 'Unshade', shade: 0 },
];

const POI_BUTTONS = [
  { key: 'start', label: 'Start' },
  { key: 'alt-debris', label: 'Debris' },
  { key: 'alt-disguise', label: 'Disguise' },
  { key: 'alt-caged', label: 'Caged' },
  { key: 'kyc1', label: 'KYC 1' },
  { key: 'kyc2', label: 'KYC 2' },
  { key: 'overpass', label: 'Overpass' },
  { key: 'finish', label: 'Finish' },
  { key: 'sign-subscription', label: 'Sub. sign' },
  { key: 'sign-express', label: 'Exp. sign' },
];

export default class MapEditor {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.tool = 'terrain'; // 'terrain' | 'poi'
    this.brush = BRUSHES[0];
    this.selectedPoi = 'start';
    this.painting = false;
    this.overpassHidden = false;
    this.buttons = [];

    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onWheel = this.onWheel.bind(this);

    this.buildHud();
  }

  toggle() {
    if (this.active) this.exit();
    else this.enter();
  }

  enter() {
    this.active = true;
    this.scene.setEditing(true);
    // setEditing shows the overpass; keep the toggle button in sync.
    this.overpassHidden = false;
    if (this.overpassBtn) this.overpassBtn.textContent = 'Overpass: shown';

    const cam = this.scene.cameras.main;
    cam.setZoom(EDIT_ZOOM);
    const start = this.scene.startPoi();
    const { px, py } = this.scene.tileToWorld(start.x, start.y);
    cam.centerOn(px, py);

    const input = this.scene.input;
    input.on('pointerdown', this.onDown);
    input.on('pointermove', this.onMove);
    input.on('pointerup', this.onUp);
    input.on('wheel', this.onWheel);

    this.hud.style.display = 'block';
    this.refreshButtons();
  }

  exit() {
    this.active = false;
    this.painting = false;
    this.scene.persist();

    const input = this.scene.input;
    input.off('pointerdown', this.onDown);
    input.off('pointermove', this.onMove);
    input.off('pointerup', this.onUp);
    input.off('wheel', this.onWheel);

    this.scene.respawnDriverAtStart();
    this.scene.setEditing(false);

    // Hand the camera back to the scene's corridor-aware follow.
    const cam = this.scene.cameras.main;
    cam.setZoom(RENDER_SCALE);
    this.scene.centerCameraOn(this.scene.driver.x, this.scene.driver.y);

    this.hud.style.display = 'none';
  }

  update() {
    if (!this.active) return;
    const cam = this.scene.cameras.main;
    const s = this.scene;
    let dx = 0;
    let dy = 0;
    if (s.left()) dx = -1;
    else if (s.right()) dx = 1;
    if (s.up()) dy = -1;
    else if (s.down()) dy = 1;
    if (dx || dy) {
      cam.scrollX += (dx * PAN_SPEED) / cam.zoom;
      cam.scrollY += (dy * PAN_SPEED) / cam.zoom;
    }
  }

  // --- pointer -> tile -------------------------------------------------------

  tileAt(pointer) {
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE),
    };
  }

  paintAt(x, y) {
    if (this.brush.shade !== undefined) this.scene.paintShade(x, y, this.brush.shade);
    else if (this.brush.clearOp) this.scene.clearOverpassCell(x, y);
    else this.scene.paintTile(x, y, this.brush.val);
  }

  onDown(pointer) {
    const { x, y } = this.tileAt(pointer);
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    if (this.tool === 'terrain') {
      this.painting = true;
      this.paintAt(x, y);
    } else {
      this.scene.movePoi(this.selectedPoi, x, y);
      this.scene.persist();
    }
  }

  onMove(pointer) {
    if (!this.painting || this.tool !== 'terrain') return;
    const { x, y } = this.tileAt(pointer);
    this.paintAt(x, y);
  }

  onUp() {
    if (this.painting) {
      this.painting = false;
      this.scene.persist();
    }
  }

  onWheel(pointer, over, dx, dy) {
    const cam = this.scene.cameras.main;
    const z = Phaser.Math.Clamp(cam.zoom - dy * 0.0015, 0.35, RENDER_SCALE);
    cam.setZoom(z);
  }

  // --- HUD -------------------------------------------------------------------

  buildHud() {
    const hud = document.createElement('div');
    hud.style.cssText =
      'position:fixed;top:10px;left:10px;z-index:9999;display:none;' +
      'font-family:sans-serif;font-size:12px;color:#eee;background:rgba(15,18,30,0.92);' +
      'border:1px solid #33405e;border-radius:8px;padding:10px 12px;width:210px;' +
      'user-select:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);';

    hud.appendChild(this.row('MAP EDITOR', true));
    hud.appendChild(this.group('Brush', BRUSHES.map((b) =>
      this.button(b.label, () => this.setBrush(b), { kind: 'brush', id: b.id }),
    )));
    hud.appendChild(this.group('Place POI', POI_BUTTONS.map((p) =>
      this.button(p.label, () => this.setPoi(p.key), { kind: 'poi', id: p.key }),
    )));
    this.overpassBtn = this.button('Overpass: shown', () => this.toggleOverpassView());
    hud.appendChild(this.group('View', [this.overpassBtn]));

    hud.appendChild(this.group('Actions', [
      this.button('Save', () => this.scene.persist()),
      this.button('Export', () => this.doExport()),
      this.button('Reset', () => this.doReset()),
      this.button('Exit (`)', () => this.exit()),
    ]));

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:8px;line-height:1.5;color:#9fb0d0;font-size:11px;';
    hint.innerHTML =
      'Left-drag to paint terrain. Pick a POI then click to place it.<br>' +
      'Arrows/WASD pan · wheel zooms.';
    hud.appendChild(hint);

    document.body.appendChild(hud);
    this.hud = hud;
    this.refreshButtons();
  }

  row(text, header) {
    const d = document.createElement('div');
    d.textContent = text;
    d.style.cssText = header
      ? 'font-weight:bold;letter-spacing:1px;margin-bottom:8px;color:#fff;'
      : 'margin:6px 0 3px;color:#9fb0d0;';
    return d;
  }

  group(title, btns) {
    const wrap = document.createElement('div');
    wrap.appendChild(this.row(title, false));
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
    btns.forEach((b) => box.appendChild(b));
    wrap.appendChild(box);
    return wrap;
  }

  button(label, onClick, meta) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText =
      'flex:0 0 auto;cursor:pointer;border:1px solid #3a4a68;' +
      'background:#1d2740;color:#dfe7f5;border-radius:5px;' +
      'padding:4px 8px;font-size:11px;';
    b.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };
    if (meta) {
      b.dataset.kind = meta.kind;
      b.dataset.id = String(meta.id);
      this.buttons.push(b);
    }
    return b;
  }

  refreshButtons() {
    this.buttons.forEach((b) => {
      const active =
        (b.dataset.kind === 'brush' &&
          this.tool === 'terrain' &&
          this.brush.id === b.dataset.id) ||
        (b.dataset.kind === 'poi' &&
          this.tool === 'poi' &&
          this.selectedPoi === b.dataset.id);
      b.style.background = active ? '#2f6cdf' : '#1d2740';
      b.style.borderColor = active ? '#5b8cf0' : '#3a4a68';
    });
  }

  setBrush(brush) {
    this.tool = 'terrain';
    this.brush = brush;
    this.refreshButtons();
  }

  setPoi(key) {
    this.tool = 'poi';
    this.selectedPoi = key;
    this.refreshButtons();
  }

  toggleOverpassView() {
    this.overpassHidden = !this.overpassHidden;
    this.scene.setOverpassHidden(this.overpassHidden);
    this.overpassBtn.textContent = this.overpassHidden ? 'Overpass: hidden' : 'Overpass: shown';
  }

  doExport() {
    const json = exportJson(this.scene.getMapData());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level1.data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  doReset() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Reset the map to the default sketch layout?')) return;
    clearSaved();
    this.hud.style.display = 'none';
    this.scene.scene.restart();
  }

  destroy() {
    if (this.hud && this.hud.parentNode) this.hud.parentNode.removeChild(this.hud);
    const input = this.scene.input;
    input.off('pointerdown', this.onDown);
    input.off('pointermove', this.onMove);
    input.off('pointerup', this.onUp);
    input.off('wheel', this.onWheel);
  }
}
