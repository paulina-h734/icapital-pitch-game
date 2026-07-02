import Phaser from 'phaser';
import { TILE_SIZE, VIEW_TILES_X, VIEW_TILES_Y, RENDER_SCALE } from './config.js';
import GameScene from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b1020',
  // Flat-vector art wants smooth (antialiased) scaling, not pixel-art nearest
  // neighbour. Render at RENDER_SCALE× resolution; the camera zooms to match so
  // the visible tile count is unchanged.
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_TILES_X * TILE_SIZE * RENDER_SCALE,
    height: VIEW_TILES_Y * TILE_SIZE * RENDER_SCALE,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);

// Expose in dev for debugging / preview inspection.
if (import.meta.env?.DEV) {
  window.__game = game;
}
