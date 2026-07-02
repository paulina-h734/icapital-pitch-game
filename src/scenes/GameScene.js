import Phaser from 'phaser';
import { TILE_SIZE, MOVE_MS, RENDER_SCALE } from '../config.js';
import { makePlaceholderTextures } from '../gfx/placeholders.js';
import {
  buildLevel,
  isBlocked,
  TILES,
  POIS,
  MAP_W,
  MAP_H,
  START,
} from '../map/level1.js';

// ---------------------------------------------------------------------------
// GameScene — open-world roaming: free 4-directional grid movement with hard
// corners, a tight centered camera (the zoom is what obscures the map), and
// green tree/bush boundaries. No fog. Press M for a debug full-map overview.
// Tasks / KYC / forest layer on in later steps.
// ---------------------------------------------------------------------------

const FOLIAGE_KEY = {
  [TILES.TREE]: 'tile-tree',
  [TILES.BUSH]: 'tile-bush',
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    makePlaceholderTextures(this);
    this.tiles = buildLevel();
    this.drawMap();
    this.drawPois();
    this.createDriver();
    this.setupCamera();
    this.setupInput();

    this.moving = false;
    this.facing = 'up';
    this.overview = false;
  }

  // Stamp every tile once into a single background RenderTexture (cheap: no
  // per-tile game objects). Ground uses a subtle checker so motion reads.
  drawMap() {
    const rt = this.add.renderTexture(0, 0, MAP_W * TILE_SIZE, MAP_H * TILE_SIZE);
    rt.setOrigin(0, 0);
    rt.setDepth(0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = this.tiles[y][x];
        let key;
        if (tile === TILES.GROUND) {
          key = (x + y) % 2 === 0 ? 'tile-ground' : 'tile-ground-alt';
        } else {
          key = FOLIAGE_KEY[tile];
        }
        rt.draw(key, x * TILE_SIZE, y * TILE_SIZE);
      }
    }
    this.mapRT = rt;
  }

  // Placeholder markers for each point of interest, so the route reads and
  // matches the sketch. Step 2 replaces these with the real task/gate objects.
  drawPois() {
    const ORANGE = 0xf0932b; // alts (research & diligence)
    const BLUE = 0x2d6cdf; // KYC customs
    const RED = 0xe24b4a; // finish
    const s = TILE_SIZE * 0.4;

    POIS.forEach((p) => {
      const { px, py } = this.tileToWorld(p.x, p.y);
      let marker;
      switch (p.type) {
        case 'alt-debris': // ◇ diamond
          marker = this.add.rectangle(px, py, s * 1.4, s * 1.4, ORANGE).setAngle(45);
          break;
        case 'alt-disguise': // ○ circle
          marker = this.add.circle(px, py, s, ORANGE);
          break;
        case 'alt-caged': // △ triangle
          marker = this.add.triangle(px, py, 0, s, s, -s, -s, -s, ORANGE);
          break;
        case 'kyc1':
        case 'kyc2': // KYC gate
          marker = this.add.rectangle(px, py, TILE_SIZE * 0.9, TILE_SIZE * 0.6, BLUE);
          break;
        case 'finish': // finish flag
          marker = this.add.rectangle(px, py, TILE_SIZE * 0.7, TILE_SIZE * 0.7, RED);
          break;
        case 'start':
        default:
          marker = null; // the car spawns here; no marker needed
          break;
      }
      if (marker) marker.setStrokeStyle(2, 0x1a1a1a).setDepth(5);

      this.add
        .text(px, py - TILE_SIZE * 0.75, p.label, {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(RENDER_SCALE)
        .setDepth(6);
    });
  }

  createDriver() {
    this.grid = { x: START.x, y: START.y };
    const { px, py } = this.tileToWorld(this.grid.x, this.grid.y);
    this.driver = this.add.image(px, py, 'car-old');
    this.driver.setDepth(10);
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
    this.keys = this.input.keyboard.addKeys('W,A,S,D,M');
    // Stop arrow keys / WASD from scrolling the host page.
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,W,A,S,D,M');
    this.keys.M.on('down', () => this.toggleOverview());
  }

  update() {
    if (!this.overview) this.handleMovement();
  }

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
