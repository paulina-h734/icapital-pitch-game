import { TILE_SIZE, COLORS } from '../config.js';

// ---------------------------------------------------------------------------
// Runtime-generated placeholder textures. Called once at the top of the game
// scene's create(). When the Kenney packs land, this whole module is replaced
// by real asset loads in a preload() step; everything else references textures
// by key, so the swap stays local.
// ---------------------------------------------------------------------------

export function makePlaceholderTextures(scene) {
  makeGround(scene, 'tile-ground', COLORS.ground);
  makeGround(scene, 'tile-ground-alt', COLORS.groundAlt);
  makeFoliage(scene, 'tile-tree', COLORS.tree, COLORS.treeShadow);
  makeFoliage(scene, 'tile-bush', COLORS.bush, COLORS.tree);
  makeCar(scene);
}

// Flat walkable ground tile (subtle so the checkerboard reads as motion).
function makeGround(scene, key, fill) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

// Impassable foliage: a filled tile with overlapping lumps so tree/bush walls
// read as organic rather than a hard grid edge.
function makeFoliage(scene, key, fill, shadow) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(shadow, 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(fill, 1);
  g.fillCircle(TILE_SIZE * 0.32, TILE_SIZE * 0.36, TILE_SIZE * 0.34);
  g.fillCircle(TILE_SIZE * 0.68, TILE_SIZE * 0.34, TILE_SIZE * 0.32);
  g.fillCircle(TILE_SIZE * 0.5, TILE_SIZE * 0.62, TILE_SIZE * 0.36);
  g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  g.destroy();
}

// Placeholder rear-view car. Intentionally rough — the user wants a more
// cartoony car, which comes with the art pass.
function makeCar(scene) {
  if (scene.textures.exists('car-old')) return;
  const w = TILE_SIZE - 8;
  const h = TILE_SIZE - 4;
  const g = scene.add.graphics();
  g.fillStyle(0xb5442f, 1); // rusty red-brown
  g.fillRoundedRect(0, 0, w, h, 5);
  g.fillStyle(0x88301f, 1);
  g.fillRoundedRect(3, 3, w - 6, 8, 3); // rear windshield
  g.fillStyle(0x1a1a1a, 1);
  g.fillRect(1, 5, 3, 6); // wheels
  g.fillRect(w - 4, 5, 3, 6);
  g.fillRect(1, h - 11, 3, 6);
  g.fillRect(w - 4, h - 11, 3, 6);
  g.generateTexture('car-old', w, h);
  g.destroy();
}
