import Phaser from 'phaser';
import { TILE_SIZE, MOVE_MS, RENDER_SCALE } from '../config.js';
import {
  makePlaceholderTextures,
  TILESET_KEY,
  TILE_INDEX,
} from '../gfx/placeholders.js';
import { isBlocked, TILES, MAP_W, MAP_H } from '../map/level1.js';
import { loadMap, saveMap } from '../map/mapStore.js';
import MapEditor from '../editor/MapEditor.js';

// ---------------------------------------------------------------------------
// GameScene — open-world roaming: free 4-directional grid movement with hard
// corners, a tight centered camera (the zoom is what obscures the map), and
// green tree/bush boundaries. No fog.
//   M = debug full-map overview.   ` (backtick) = in-game map editor.
// The map is loaded from mapStore (edited copy in localStorage, else default)
// and rendered through a culling tilemap layer so it scales to any size.
// ---------------------------------------------------------------------------

const POI_COLORS = {
  alt: 0xf0932b, // research & diligence
  kyc: 0x2d6cdf, // KYC customs
  finish: 0xe24b4a,
  start: 0x2ecc71,
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    makePlaceholderTextures(this);

    const map = loadMap();
    this.tiles = map.tiles;
    this.pois = map.pois;

    this.drawMap();
    this.drawPois();
    this.createDriver();
    this.setupCamera();
    this.setupInput();

    this.moving = false;
    this.facing = 'up';
    this.overview = false;
    this.editing = false;

    this.editor = new MapEditor(this);
    this.events.once('shutdown', () => this.editor.destroy());
  }

  // Render the map through a culling tilemap layer: only on-screen tiles are
  // drawn, so the world scales to any size without a giant texture.
  drawMap() {
    const indexGrid = this.tiles.map((row, y) =>
      row.map((tile, x) => this.tileIndex(x, y, tile)),
    );
    this.map = this.make.tilemap({
      data: indexGrid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = this.map.addTilesetImage(TILESET_KEY, TILESET_KEY, TILE_SIZE, TILE_SIZE);
    this.layer = this.map.createLayer(0, tileset, 0, 0).setDepth(0);
  }

  // Tile type + position -> tileset index (ground checkers by parity).
  tileIndex(x, y, tile) {
    if (tile === TILES.GROUND) {
      return (x + y) % 2 === 0 ? TILE_INDEX.GROUND : TILE_INDEX.GROUND_ALT;
    }
    return tile === TILES.TREE ? TILE_INDEX.TREE : TILE_INDEX.BUSH;
  }

  // Live edit: change one tile in both the data grid and the rendered layer.
  paintTile(x, y, value) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    if (this.tiles[y][x] === value) return false;
    this.tiles[y][x] = value;
    this.map.putTileAt(this.tileIndex(x, y, value), x, y, false, this.layer);
    return true;
  }

  // Placeholder markers for each point of interest. Labels only show in the
  // editor; in play the markers stand in for the future task/gate objects.
  drawPois() {
    this.poiObjects = {};
    this.pois.forEach((p) => this.createPoi(p));
  }

  createPoi(p) {
    const { px, py } = this.tileToWorld(p.x, p.y);
    const s = TILE_SIZE * 0.4;
    let marker;
    switch (p.type) {
      case 'alt-debris': // ◇ diamond
        marker = this.add.rectangle(px, py, s * 1.4, s * 1.4, POI_COLORS.alt).setAngle(45);
        break;
      case 'alt-disguise': // ○ circle
        marker = this.add.circle(px, py, s, POI_COLORS.alt);
        break;
      case 'alt-caged': // △ triangle
        marker = this.add.triangle(px, py, 0, s, s, -s, -s, -s, POI_COLORS.alt);
        break;
      case 'kyc1':
      case 'kyc2':
        marker = this.add.rectangle(px, py, TILE_SIZE * 0.9, TILE_SIZE * 0.6, POI_COLORS.kyc);
        break;
      case 'finish':
        marker = this.add.rectangle(px, py, TILE_SIZE * 0.7, TILE_SIZE * 0.7, POI_COLORS.finish);
        break;
      case 'start':
      default:
        marker = this.add.rectangle(px, py, TILE_SIZE * 0.6, TILE_SIZE * 0.6, POI_COLORS.start);
        break;
    }
    marker.setStrokeStyle(2, 0x1a1a1a).setDepth(5);

    const label = this.add
      .text(px, py - TILE_SIZE * 0.75, p.label, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setResolution(RENDER_SCALE)
      .setDepth(6)
      .setVisible(false);

    this.poiObjects[p.type] = { marker, label };
  }

  // Editor: move a POI to a new tile (updates data + marker + label).
  movePoi(type, x, y) {
    const poi = this.pois.find((p) => p.type === type);
    if (!poi) return;
    poi.x = x;
    poi.y = y;
    const { px, py } = this.tileToWorld(x, y);
    const obj = this.poiObjects[type];
    obj.marker.setPosition(px, py);
    obj.label.setPosition(px, py - TILE_SIZE * 0.75);
  }

  createDriver() {
    const start = this.startPoi();
    this.grid = { x: start.x, y: start.y };
    const { px, py } = this.tileToWorld(this.grid.x, this.grid.y);
    this.driver = this.add.image(px, py, 'car-old');
    this.driver.setDepth(10);
  }

  startPoi() {
    return this.pois.find((p) => p.type === 'start') || { x: 1, y: 1 };
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    // Zoom matches the render supersample so the framebuffer stays high-res
    // while the visible tile count (VIEW_TILES) is unchanged.
    cam.setZoom(RENDER_SCALE);
    cam.startFollow(this.driver, true, 0.15, 0.15);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,M,BACKTICK');
    // Stop these keys from scrolling the host page.
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,M,BACKTICK');
    this.keys.M.on('down', () => {
      if (!this.editing) this.toggleOverview();
    });
    this.keys.BACKTICK.on('down', () => this.editor.toggle());
  }

  update() {
    if (this.editing) {
      this.editor.update();
      return;
    }
    if (!this.overview) this.handleMovement();
  }

  // --- editor hooks ----------------------------------------------------------

  setEditing(on) {
    this.editing = on;
    this.driver.setVisible(!on);
    Object.values(this.poiObjects).forEach((o) => o.label.setVisible(on));
  }

  respawnDriverAtStart() {
    this.tweens.killTweensOf(this.driver);
    const start = this.startPoi();
    this.grid = { x: start.x, y: start.y };
    const { px, py } = this.tileToWorld(start.x, start.y);
    this.driver.setPosition(px, py);
    this.moving = false;
  }

  getMapData() {
    return { tiles: this.tiles, pois: this.pois };
  }

  persist() {
    saveMap(this.getMapData());
  }

  // ---------------------------------------------------------------------------

  handleMovement() {
    if (this.moving) return;

    let dx = 0;
    let dy = 0;
    let facing = this.facing;
    if (this.left()) {
      dx = -1;
      facing = 'left';
    } else if (this.right()) {
      dx = 1;
      facing = 'right';
    } else if (this.up()) {
      dy = -1;
      facing = 'up';
    } else if (this.down()) {
      dy = 1;
      facing = 'down';
    }

    if (dx === 0 && dy === 0) return;

    this.orient(facing);

    const tx = this.grid.x + dx;
    const ty = this.grid.y + dy;
    if (!this.canEnter(tx, ty)) return;

    this.moving = true;
    const { px, py } = this.tileToWorld(tx, ty);
    this.tweens.add({
      targets: this.driver,
      x: px,
      y: py,
      duration: MOVE_MS,
      ease: 'Linear',
      onComplete: () => {
        this.grid.x = tx;
        this.grid.y = ty;
        this.moving = false;
      },
    });
  }

  // Placeholder orientation: rotate the rear-view box toward travel. Real art
  // will use a dedicated rear-view sprite for up/down and a flipped side sprite
  // for left/right (per the page-7 sketch).
  orient(facing) {
    this.facing = facing;
    switch (facing) {
      case 'up':
        this.driver.setAngle(0);
        break;
      case 'down':
        this.driver.setAngle(180);
        break;
      case 'right':
        this.driver.setAngle(90);
        break;
      case 'left':
        this.driver.setAngle(-90);
        break;
      default:
        break;
    }
  }

  // Debug: zoom out to frame the whole map, or snap back to the play camera.
  toggleOverview() {
    const cam = this.cameras.main;
    this.overview = !this.overview;
    if (this.overview) {
      cam.stopFollow();
      const zoom = Math.min(
        cam.width / (MAP_W * TILE_SIZE),
        cam.height / (MAP_H * TILE_SIZE),
      );
      cam.setZoom(zoom * 0.95);
      cam.centerOn((MAP_W * TILE_SIZE) / 2, (MAP_H * TILE_SIZE) / 2);
    } else {
      cam.setZoom(RENDER_SCALE);
      cam.startFollow(this.driver, true, 0.15, 0.15);
    }
  }

  // --- helpers ---------------------------------------------------------------

  canEnter(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return false;
    return !isBlocked(this.tiles[ty][tx]);
  }

  tileToWorld(tx, ty) {
    return {
      px: tx * TILE_SIZE + TILE_SIZE / 2,
      py: ty * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  left() {
    return this.cursors.left.isDown || this.keys.A.isDown;
  }

  right() {
    return this.cursors.right.isDown || this.keys.D.isDown;
  }

  up() {
    return this.cursors.up.isDown || this.keys.W.isDown;
  }

  down() {
    return this.cursors.down.isDown || this.keys.S.isDown;
  }
}
