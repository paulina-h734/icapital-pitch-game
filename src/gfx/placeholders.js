import { TILE_SIZE, COLORS } from '../config.js';

// ---------------------------------------------------------------------------
// Runtime-generated placeholder textures. Called once at the top of the game
// scene's create(). When the Kenney packs land, this whole module is replaced
// by real asset loads in a preload() step; everything else references textures
// by key, so the swap stays local.
//
// The map now renders via a culling Phaser tilemap, which needs ONE tileset
// image whose tiles are indexed left-to-right:
//   0 = ground   1 = ground-alt (checker)   2 = tree   3 = bush
// ---------------------------------------------------------------------------

export const TILE_INDEX = {
  GROUND: 0,
  GROUND_ALT: 1,
  TREE: 2,
  BUSH: 3,
  CONCRETE: 4,
  BRIDGE: 5,
};
export const TILE_COUNT = 6;
export const TILESET_KEY = 'tiles-atlas';

export function makePlaceholderTextures(scene) {
  makeTilesAtlas(scene);
  makeCar(scene, 'car-old', 0xb5442f, 0x88301f); // rusty (going it alone)
  makeCar(scene, 'car-icap', 0x2d6cdf, 0x1c4fae); // sleek iCapital blue
}

function makeTilesAtlas(scene) {
  if (scene.textures.exists(TILESET_KEY)) return;
  const g = scene.add.graphics();
  ground(g, 0, COLORS.ground);
  ground(g, 1, COLORS.groundAlt);
  foliage(g, 2, COLORS.tree, COLORS.treeShadow);
  foliage(g, 3, COLORS.bush, COLORS.tree);
  concrete(g, 4, 0xc2c6cf, 0x9aa0ab); // overpass road surface
  concrete(g, 5, 0x5b6472, 0x3a4150); // overpass border / railing
  g.generateTexture(TILESET_KEY, TILE_SIZE * TILE_COUNT, TILE_SIZE);
  g.destroy();
}

// Concrete / bridge tile: flat slab with a subtle inset seam.
function concrete(g, i, fill, edge) {
  const ox = i * TILE_SIZE;
  g.fillStyle(edge, 1);
  g.fillRect(ox, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(fill, 1);
  g.fillRect(ox + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
}

// Flat walkable ground tile at atlas slot `i`.
function ground(g, i, fill) {
  const ox = i * TILE_SIZE;
  g.fillStyle(fill, 1);
  g.fillRect(ox, 0, TILE_SIZE, TILE_SIZE);
}

// Impassable foliage: filled tile with overlapping lumps so tree/bush walls
// read as organic rather than a hard grid edge.
function foliage(g, i, fill, shadow) {
  const ox = i * TILE_SIZE;
  g.fillStyle(shadow, 1);
  g.fillRect(ox, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(fill, 1);
  g.fillCircle(ox + TILE_SIZE * 0.32, TILE_SIZE * 0.36, TILE_SIZE * 0.34);
  g.fillCircle(ox + TILE_SIZE * 0.68, TILE_SIZE * 0.34, TILE_SIZE * 0.32);
  g.fillCircle(ox + TILE_SIZE * 0.5, TILE_SIZE * 0.62, TILE_SIZE * 0.36);
}

// Placeholder rear-view car. Intentionally rough — the user wants a more
// cartoony car, which comes with the art pass.
function makeCar(scene, key, body, windshield) {
  if (scene.textures.exists(key)) return;
  const w = TILE_SIZE - 8;
  const h = TILE_SIZE - 4;
  const g = scene.add.graphics();
  g.fillStyle(body, 1);
  g.fillRoundedRect(0, 0, w, h, 5);
  g.fillStyle(windshield, 1);
  g.fillRoundedRect(3, 3, w - 6, 8, 3); // rear windshield
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(1, 5, 3, 6); // wheels
  g.fillRect(w - 4, 5, 3, 6);
  g.fillRect(1, h - 11, 3, 6);
  g.fillRect(w - 4, h - 11, 3, 6);
  g.generateTexture(key, w, h);
  g.destroy();
}
