import Phaser from 'phaser';
import {
  TILE_SIZE,
  RENDER_SCALE,
  CAR_SPEED,
  CAM_TRAVEL_SMOOTH,
  CAM_CROSS_SMOOTH,
  CORRIDOR_RATIO,
  CORRIDOR_SCAN_CAP,
} from '../config.js';
import {
  makePlaceholderTextures,
  TILESET_KEY,
  TILE_INDEX,
} from '../gfx/placeholders.js';
import { TILES, MAP_W, MAP_H } from '../map/level1.js';
import { loadMap, saveMap } from '../map/mapStore.js';
import MapEditor from '../editor/MapEditor.js';

// ---------------------------------------------------------------------------
// GameScene — open-world roaming: continuous 8-directional driving (physics
// velocity + slide-along-walls), a tight camera with a Stardew-style deadzone
// (the car moves within a centered box before the view scrolls), and green
// tree/bush boundaries. No fog. Map is a culling tilemap layer.
//   M = debug full-map overview.   ` (backtick) = in-game map editor.
// Debug tools (editor + overview) are dev-only; stripped from the pitch build.
// ---------------------------------------------------------------------------

const DEV = Boolean(import.meta.env?.DEV);

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

    this.facing = 'up';
    this.overview = false;
    this.editing = false;

    // Debug map editor — dev-only so it never ships in the pitch build.
    if (DEV) {
      this.editor = new MapEditor(this);
      this.events.once('shutdown', () => this.editor.destroy());
    }
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
    // Trees and bushes collide; ground (indices 0/1) is walkable.
    this.layer.setCollisionByExclusion([TILE_INDEX.GROUND, TILE_INDEX.GROUND_ALT]);
  }

  // Tile type + position -> tileset index (ground checkers by parity).
  tileIndex(x, y, tile) {
    if (tile === TILES.GROUND) {
      return (x + y) % 2 === 0 ? TILE_INDEX.GROUND : TILE_INDEX.GROUND_ALT;
    }
    return tile === TILES.TREE ? TILE_INDEX.TREE : TILE_INDEX.BUSH;
  }

  // Live edit: change one tile in the data grid, the rendered layer, and its
  // collision flag (so painting walls blocks the car immediately on play).
  paintTile(x, y, value) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    if (this.tiles[y][x] === value) return false;
    this.tiles[y][x] = value;
    const tile = this.map.putTileAt(this.tileIndex(x, y, value), x, y, false, this.layer);
    if (tile) tile.setCollision(value !== TILES.GROUND);
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
    const { px, py } = this.tileToWorld(start.x, start.y);
    this.driver = this.physics.add.image(px, py, 'car-old').setDepth(10);
    // Body a touch smaller than the tile so the car threads gaps cleanly.
    this.driver.body.setSize(TILE_SIZE * 0.7, TILE_SIZE * 0.7, true);
    this.driver.setCollideWorldBounds(true);

    this.physics.world.setBounds(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    this.physics.add.collider(this.driver, this.layer);
  }

  startPoi() {
    return this.pois.find((p) => p.type === 'start') || { x: 1, y: 1 };
  }

  setupCamera() {
    const cam = this.cameras.main;
    // Zoom matches the render supersample so the framebuffer stays high-res
    // while the visible tile count (VIEW_TILES) is unchanged. We drive the
    // camera manually (updateCamera) so it can be corridor-aware, using Phaser's
    // own centerOn/midPoint (which handle zoom correctly) and clamping the
    // centre ourselves — Phaser's built-in bounds clamp mis-behaves when zoomed.
    cam.setZoom(RENDER_SCALE);
    cam.useBounds = false;
    this.centerCameraOn(this.driver.x, this.driver.y);
  }

  // Clamp a desired camera CENTRE (world coords) so the visible region stays
  // inside the map. Half-view uses width/zoom because the zoom shrinks the
  // visible area around the centre.
  clampCenter(x, y) {
    const cam = this.cameras.main;
    const hvW = cam.width / (2 * cam.zoom);
    const hvH = cam.height / (2 * cam.zoom);
    const worldW = MAP_W * TILE_SIZE;
    const worldH = MAP_H * TILE_SIZE;
    const cx = worldW <= hvW * 2 ? worldW / 2 : Phaser.Math.Clamp(x, hvW, worldW - hvW);
    const cy = worldH <= hvH * 2 ? worldH / 2 : Phaser.Math.Clamp(y, hvH, worldH - hvH);
    return [cx, cy];
  }

  centerCameraOn(x, y) {
    const [cx, cy] = this.clampCenter(x, y);
    this.cameras.main.centerOn(cx, cy);
  }

  // Follow the car directly with per-axis smoothing. We measure how corridor-
  // like the spot is: on a vertical stretch the X (cross) axis is damped so
  // side-to-side wiggle doesn't scroll and side streets aren't chased, while Y
  // (travel) stays responsive — and vice versa. The cross/travel split blends
  // continuously via the weights, so bends and junctions glide. In the open,
  // both axes are responsive.
  updateCamera() {
    const cam = this.cameras.main;
    const car = this.driver;
    const cx = Math.floor(car.x / TILE_SIZE);
    const cy = Math.floor(car.y / TILE_SIZE);

    const [l, r] = this.freeSpan(cx, cy, 1, 0);
    const [u, d] = this.freeSpan(cx, cy, 0, 1);
    const hSpan = l + r + 1;
    const vSpan = u + d + 1;

    // Continuous "is this a corridor along that axis" weights (0..1).
    const ramp = CORRIDOR_RATIO - 1;
    const vWeight = Phaser.Math.Clamp((vSpan / hSpan - 1) / ramp, 0, 1); // vertical -> X cross
    const hWeight = Phaser.Math.Clamp((hSpan / vSpan - 1) / ramp, 0, 1); // horizontal -> Y cross

    // Blend the smoothing per axis: damped where it's the cross axis of a
    // corridor, responsive otherwise.
    const spread = CAM_CROSS_SMOOTH - CAM_TRAVEL_SMOOTH;
    const smoothX = CAM_TRAVEL_SMOOTH + spread * vWeight;
    const smoothY = CAM_TRAVEL_SMOOTH + spread * hWeight;

    const nextX = cam.midPoint.x + (car.x - cam.midPoint.x) * smoothX;
    const nextY = cam.midPoint.y + (car.y - cam.midPoint.y) * smoothY;
    const [clampedX, clampedY] = this.clampCenter(nextX, nextY);
    cam.centerOn(clampedX, clampedY);
  }

  // Count contiguous walkable tiles from (cx,cy) in +/- (dirX,dirY), capped.
  freeSpan(cx, cy, dirX, dirY) {
    let neg = 0;
    while (neg < CORRIDOR_SCAN_CAP && this.walkable(cx - dirX * (neg + 1), cy - dirY * (neg + 1))) neg++;
    let pos = 0;
    while (pos < CORRIDOR_SCAN_CAP && this.walkable(cx + dirX * (pos + 1), cy + dirY * (pos + 1))) pos++;
    return [neg, pos];
  }

  walkable(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    return this.tiles[y][x] === TILES.GROUND;
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,M,BACKTICK');
    // Stop these keys from scrolling the host page.
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,M,BACKTICK');
    // Debug tools are dev-only.
    if (DEV) {
      this.keys.M.on('down', () => {
        if (!this.editing) this.toggleOverview();
      });
      this.keys.BACKTICK.on('down', () => this.editor.toggle());
    }
  }

  update() {
    if (this.editing) {
      this.editor?.update();
      return;
    }
    if (this.overview) return;
    this.handleMovement();
    this.updateCamera();
  }

  // --- editor hooks ----------------------------------------------------------

  setEditing(on) {
    this.editing = on;
    if (on) this.driver.body.setVelocity(0, 0);
    this.driver.setVisible(!on);
    Object.values(this.poiObjects).forEach((o) => o.label.setVisible(on));
  }

  respawnDriverAtStart() {
    const start = this.startPoi();
    const { px, py } = this.tileToWorld(start.x, start.y);
    this.driver.body.reset(px, py); // repositions and zeroes velocity
  }

  getMapData() {
    return { tiles: this.tiles, pois: this.pois };
  }

  persist() {
    saveMap(this.getMapData());
  }

  // ---------------------------------------------------------------------------

  // Continuous 8-directional driving: set the body velocity from held keys
  // (normalized so diagonals aren't faster); physics slides the car along
  // tree/bush walls.
  handleMovement() {
    let vx = 0;
    let vy = 0;
    if (this.left()) vx -= 1;
    if (this.right()) vx += 1;
    if (this.up()) vy -= 1;
    if (this.down()) vy += 1;

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) {
      v.normalize().scale(CAR_SPEED);
      this.orient(vx, vy);
    }
    this.driver.body.setVelocity(v.x, v.y);
  }

  // Placeholder orientation: rotate the rear-view box toward travel (vertical
  // takes priority so diagonals read as forward/back). Real art will use a
  // rear-view sprite for up/down and a flipped side sprite for left/right.
  orient(vx, vy) {
    let facing = this.facing;
    if (vy < 0) facing = 'up';
    else if (vy > 0) facing = 'down';
    else if (vx < 0) facing = 'left';
    else if (vx > 0) facing = 'right';
    if (facing === this.facing) return;

    this.facing = facing;
    const angle = { up: 0, down: 180, right: 90, left: -90 }[facing];
    this.driver.setAngle(angle);
  }

  // Debug: zoom out to frame the whole map, or snap back to the play camera.
  toggleOverview() {
    const cam = this.cameras.main;
    this.overview = !this.overview;
    if (this.overview) {
      const zoom = Math.min(
        cam.width / (MAP_W * TILE_SIZE),
        cam.height / (MAP_H * TILE_SIZE),
      );
      cam.setZoom(zoom * 0.95);
      cam.centerOn((MAP_W * TILE_SIZE) / 2, (MAP_H * TILE_SIZE) / 2);
    } else {
      cam.setZoom(RENDER_SCALE);
      this.centerCameraOn(this.driver.x, this.driver.y);
    }
  }

  // --- helpers ---------------------------------------------------------------

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
