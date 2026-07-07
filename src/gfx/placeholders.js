import Phaser from 'phaser';
import { TILE_SIZE } from '../config.js';
// Import the art so Vite bundles it (and inlines it as data URIs in the
// single-file build) rather than leaving it as separate public/ files.
import grassUrl from '../assets/art/grass.png';
import grassAltUrl from '../assets/art/grass_alt.png';
import dirtUrl from '../assets/art/dirt.png';
import dirtAltUrl from '../assets/art/dirt_alt.png';
import treeUrl from '../assets/art/tree.png';
import bushUrl from '../assets/art/bush.png';
import concreteUrl from '../assets/art/concrete.png';
import curbUrl from '../assets/art/curb.png';
import carIcapUrl from '../assets/art/car-icap.png';
import carOldUrl from '../assets/art/car-old.png';

// ---------------------------------------------------------------------------
// World textures. Terrain + cars now come from real Kenney CC0 art (public/art,
// loaded in GameScene.preload via preloadArt). The map renders through a culling
// Phaser tilemap, which needs ONE tileset image whose tiles are indexed
// left-to-right; we composite that atlas from the loaded sprites at runtime.
//   0 = ground   1 = ground-alt (checker)   2 = tree   3 = bush
//   4 = concrete 5 = bridge  (overpass — kept custom-generated per the brief)
//
// Art direction (trial): terrain + green trees from Kenney "Top-down Tanks
// Remastered"; cars from Kenney "Racing Pack" (blue = iCapCar, red = rusty).
// Swap GROUND_A/GROUND_B to the dirt keys for a brown driving surface.
// ---------------------------------------------------------------------------

// Atlas slots. Impassable borders now render as a continuous GRASS field with
// trees/bushes scattered only sporadically (GameScene.foliageIndex picks which
// border cells get foliage) — a grassy edge rather than a solid wall of trees.
export const TILE_INDEX = {
  GROUND: 0, // walkable dirt
  GROUND_ALT: 1, // walkable dirt (checker)
  GRASS: 2, // impassable border — plain grass
  GRASS_TREE: 3, // impassable border — grass + tree
  GRASS_BUSH: 4, // impassable border — grass + bush
  CONCRETE: 5, // overpass road
  BRIDGE: 6, // overpass border
};
export const TILE_COUNT = 7;
export const TILESET_KEY = 'tiles-atlas';

// Which loaded terrain sprite fills the walkable ground. Green grass by default;
// switch to 'art-dirt' / 'art-dirt-alt' for a pale dirt/brown surface.
const GROUND_A = 'art-dirt';
const GROUND_B = 'art-dirt-alt';

// Load the CC0 art. Called from GameScene.preload so the images exist before
// create() composites the atlas.
export function preloadArt(scene) {
  scene.load.image('art-grass', grassUrl);
  scene.load.image('art-grass-alt', grassAltUrl);
  scene.load.image('art-dirt', dirtUrl);
  scene.load.image('art-dirt-alt', dirtAltUrl);
  scene.load.image('art-tree', treeUrl);
  scene.load.image('art-bush', bushUrl);
  scene.load.image('art-concrete', concreteUrl);
  scene.load.image('art-curb-src', curbUrl);
  scene.load.image('car-icap', carIcapUrl);
  scene.load.image('car-old', carOldUrl);
}

export const KYC_STRIPE_KEY = 'kyc-stripe';
export const GRASS_CORNER_KEY = 'grass-round';
export const DIRT_CORNER_KEY = 'dirt-round';
export const CURB_KEY = 'curb';

export function makePlaceholderTextures(scene) {
  makeTilesAtlas(scene);
  makeKycBarrierTexture(scene);
  makeCurbTexture(scene);
  // Grass wedge rounds the driving area's OUTER (convex) corners; dirt wedge
  // rounds its INNER (concave) corners where grass pokes into the road.
  makeCornerOverlay(scene, GRASS_CORNER_KEY, 'art-grass');
  makeCornerOverlay(scene, DIRT_CORNER_KEY, GROUND_A);
  // Cars are loaded PNGs (keys car-icap / car-old) — nothing to generate.
}

// A wedge of `srcKey` filling one cell's outer (NE) corner, its inner edge an
// arc — laid on a corner cell it rounds off that corner. Rotated 0/90/180/270
// by the caller for the four orientations.
function makeCornerOverlay(scene, key, srcKey) {
  if (scene.textures.exists(key)) return;
  const T = TILE_SIZE;
  const tex = scene.textures.createCanvas(key, T, T);
  const ctx = tex.getContext();
  const src = scene.textures.get(srcKey).getSourceImage();
  ctx.save();
  ctx.beginPath();
  ctx.rect(T / 2, 0, T / 2, T / 2); // NE quadrant
  ctx.clip();
  ctx.drawImage(src, 0, 0, 64, 64, 0, 0, T, T);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(T / 2, T / 2, T / 2, 0, Math.PI * 2); // carve the rounded inner edge
  ctx.fill();
  ctx.restore();
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// Custom KYC "customs" boom: a tileable diagonal candy-stripe used as a barrier
// TileSprite across the checkpoint corridor (the gate is our art, per the brief).
function makeKycBarrierTexture(scene) {
  if (scene.textures.exists(KYC_STRIPE_KEY)) return;
  const S = 32;
  const tex = scene.textures.createCanvas(KYC_STRIPE_KEY, S, S);
  const ctx = tex.getContext();
  ctx.fillStyle = '#e0492e';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#f4efe6';
  ctx.lineWidth = 8;
  for (let x = -S; x < S * 2; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + S, S);
    ctx.stroke();
  }
  tex.refresh();
}

// Composite the 6-tile atlas onto a canvas texture from the loaded sprites.
function makeTilesAtlas(scene) {
  if (scene.textures.exists(TILESET_KEY)) return;
  const T = TILE_SIZE;
  const canvasTex = scene.textures.createCanvas(TILESET_KEY, T * TILE_COUNT, T);
  const ctx = canvasTex.getContext();
  const src = (k) => scene.textures.get(k).getSourceImage();
  const cell = (i) => i * T;

  const groundA = src(GROUND_A);
  const groundB = src(GROUND_B);
  const grass = src('art-grass');
  const tree = src('art-tree');
  const bush = src('art-bush');
  const concrete = src('art-concrete');

  // Walkable dirt + checker variant.
  ctx.drawImage(groundA, cell(TILE_INDEX.GROUND), 0, T, T);
  ctx.drawImage(groundB, cell(TILE_INDEX.GROUND_ALT), 0, T, T);
  // Border grass: plain, plus grass-with-tree and grass-with-bush variants. The
  // foliage is inset so grass shows around it — scattered trees on a lawn, not a
  // cell-filling wall. All three collide (grass = impassable border).
  ctx.drawImage(grass, cell(TILE_INDEX.GRASS), 0, T, T);
  ctx.drawImage(grass, cell(TILE_INDEX.GRASS_TREE), 0, T, T);
  ctx.drawImage(tree, cell(TILE_INDEX.GRASS_TREE) + 3, 1, T - 6, T - 4);
  ctx.drawImage(grass, cell(TILE_INDEX.GRASS_BUSH), 0, T, T);
  ctx.drawImage(bush, cell(TILE_INDEX.GRASS_BUSH) + 8, 8, T - 16, T - 16);
  // Overpass road: real Kenney blue-grey asphalt, cropped from the tile's clean
  // centre so no kerb markings tile through. Bridge cells render as plain
  // asphalt too — their orange/white Kenney kerb is added as an oriented overlay
  // sprite (GameScene.addOverpassCurbs) so it faces outward on each edge.
  ctx.drawImage(concrete, 34, 34, 60, 60, cell(TILE_INDEX.CONCRETE), 0, T, T);
  ctx.drawImage(concrete, 34, 34, 60, 60, cell(TILE_INDEX.BRIDGE), 0, T, T);

  canvasTex.refresh();
  // Nearest sampling on the tileset kills atlas edge-bleed (a tile's edge
  // picking up the neighbouring atlas cell's colour); crisp at our integer zoom.
  canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// Overpass kerb: the orange/white striped edge cropped from the left curb of a
// real Kenney straight-road tile. Placed as an oriented overlay on each overpass
// edge cell (kerb faces WEST at angle 0; caller rotates for the other sides).
function makeCurbTexture(scene) {
  if (scene.textures.exists(CURB_KEY)) return;
  const T = TILE_SIZE;
  const tex = scene.textures.createCanvas(CURB_KEY, T, T);
  const ctx = tex.getContext();
  const src = scene.textures.get('art-curb-src').getSourceImage();
  ctx.drawImage(src, 4, 0, 60, 128, 0, 0, T, T); // left kerb + concrete
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
