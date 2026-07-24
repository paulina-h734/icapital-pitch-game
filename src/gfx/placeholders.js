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
  DARK_GROUND: 7, // walkable dirt, darkened (editor forest floor)
  DARK_GRASS: 8, // darkened plain grass (dark border, no foliage)
  DARK_GRASS_TREE: 9, // darkened grass + tree
  DARK_GRASS_BUSH: 10, // darkened grass + bush
};
export const TILE_COUNT = 11;
export const TILESET_KEY = 'tiles-atlas';

// Which loaded terrain sprite fills the walkable ground. Green grass by default;
// switch to 'art-dirt' / 'art-dirt-alt' for a pale dirt/brown surface.
const GROUND_A = 'art-dirt';
const GROUND_B = 'art-dirt-alt';

// Queue an image only if its texture isn't already loaded — textures persist
// across scene restarts, so re-running preload on "Run again" would otherwise
// log "Texture key already in use" for every asset.
function loadImageOnce(scene, key, url) {
  if (!scene.textures.exists(key)) scene.load.image(key, url);
}

// Load the CC0 art. Called from GameScene.preload so the images exist before
// create() composites the atlas.
export function preloadArt(scene) {
  loadImageOnce(scene, 'art-grass', grassUrl);
  loadImageOnce(scene, 'art-grass-alt', grassAltUrl);
  loadImageOnce(scene, 'art-dirt', dirtUrl);
  loadImageOnce(scene, 'art-dirt-alt', dirtAltUrl);
  loadImageOnce(scene, 'art-tree', treeUrl);
  loadImageOnce(scene, 'art-bush', bushUrl);
  loadImageOnce(scene, 'art-concrete', concreteUrl);
  loadImageOnce(scene, 'art-curb-src', curbUrl);
  loadImageOnce(scene, 'car-icap', carIcapUrl);
  loadImageOnce(scene, 'car-old', carOldUrl);
}

// Just the two car sprites — so the opening's "choose your vehicle" screen can
// show the real cars before GameScene loads the rest of the art.
export function preloadCars(scene) {
  loadImageOnce(scene, 'car-icap', carIcapUrl);
  loadImageOnce(scene, 'car-old', carOldUrl);
}

export const KYC_STRIPE_KEY = 'kyc-stripe';
export const GRASS_CORNER_KEY = 'grass-round';
export const DIRT_CORNER_KEY = 'dirt-round';
export const GRASS_CORNER_DARK_KEY = 'grass-round-dark';
export const DIRT_CORNER_DARK_KEY = 'dirt-round-dark';
export const CURB_KEY = 'curb';

// The 3 collectible alternatives: which map POI, display name, icon texture, and
// colour. Used by the map markers, the drive-through toast, and the inventory.
export const ASSETS = [
  { alt: 'alt-debris', key: 'pe', name: 'Private Equity', icon: 'icon-pe', color: 0x7db4ff },
  { alt: 'alt-disguise', key: 'pc', name: 'Private Credit', icon: 'icon-pc', color: 0x8fd0a0 },
  { alt: 'alt-caged', key: 'ra', name: 'Real Assets', icon: 'icon-ra', color: 0xf0b46a },
];

export function makePlaceholderTextures(scene) {
  makeTilesAtlas(scene);
  makeKycBarrierTexture(scene);
  makeCurbTexture(scene);
  makeAssetIcons(scene);
  makeArchitectMarker(scene);
  // Grass wedge rounds the driving area's OUTER (convex) corners; dirt wedge
  // rounds its INNER (concave) corners where grass pokes into the road.
  makeCornerOverlay(scene, GRASS_CORNER_KEY, 'art-grass');
  makeCornerOverlay(scene, DIRT_CORNER_KEY, GROUND_A);
  // Dark-forest wedges: same shapes, dusk-washed to match the dark tiles.
  makeCornerOverlay(scene, GRASS_CORNER_DARK_KEY, 'art-grass', true);
  makeCornerOverlay(scene, DIRT_CORNER_DARK_KEY, GROUND_A, true);
  makeTimerBox(scene);
  // Cars are loaded PNGs (keys car-icap / car-old) — nothing to generate.
}

// The stopwatch chip: a light-grey, bevelled UPSIDE-DOWN trapezoid (wide at the
// top, tapering down) that hangs from the top border. Text is drawn over it.
// Trace a rounded-corner polygon path (each vertex softened with a quad curve).
function roundedPolyPath(ctx, pts, radius) {
  const n = pts.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y) || 1;
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y) || 1;
    const r1 = Math.min(radius, d1 / 2);
    const r2 = Math.min(radius, d2 / 2);
    const p1 = { x: curr.x + ((prev.x - curr.x) * r1) / d1, y: curr.y + ((prev.y - curr.y) * r1) / d1 };
    const p2 = { x: curr.x + ((next.x - curr.x) * r2) / d2, y: curr.y + ((next.y - curr.y) * r2) / d2 };
    if (i === 0) ctx.moveTo(p1.x, p1.y);
    else ctx.lineTo(p1.x, p1.y);
    ctx.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y);
  }
  ctx.closePath();
}

// The stopwatch chip: an upside-down trapezoid with ROUNDED corners, drawn in
// the same cover-screen text-box palette (drop shadow, dark outline, grey face,
// light highlight tucked under the top of the outline).
function makeTimerBox(scene) {
  if (scene.textures.exists('timer-box')) return;
  const W = 236;
  const H = 64;
  const R = 11;
  const pts = [
    { x: 10, y: 5 },
    { x: W - 10, y: 5 },
    { x: W - 40, y: H - 8 },
    { x: 40, y: H - 8 },
  ];
  const tex = scene.textures.createCanvas('timer-box', W, H);
  const ctx = tex.getContext();
  ctx.lineJoin = 'round';
  // drop shadow
  ctx.save();
  ctx.translate(0, 4);
  ctx.fillStyle = 'rgba(10,20,40,0.32)';
  roundedPolyPath(ctx, pts, R);
  ctx.fill();
  ctx.restore();
  // grey face
  ctx.fillStyle = '#c6c6c6';
  roundedPolyPath(ctx, pts, R);
  ctx.fill();
  // light highlight rim along the top, clipped to the shape
  ctx.save();
  roundedPolyPath(ctx, pts, R);
  ctx.clip();
  ctx.fillStyle = '#eef0f2';
  ctx.fillRect(0, 5, W, 7);
  ctx.restore();
  // dark outline on top
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#565656';
  roundedPolyPath(ctx, pts, R);
  ctx.stroke();
  tex.refresh();
}

// A wedge of `srcKey` filling one cell's outer (NE) corner, its inner edge an
// arc — laid on a corner cell it rounds off that corner. Rotated 0/90/180/270
// by the caller for the four orientations.
function makeCornerOverlay(scene, key, srcKey, dark) {
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
  if (dark) {
    // Dusk-wash the wedge, confined to the drawn shape, so it matches dark tiles.
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    applyDarkWash(ctx, 0, 0, T);
    ctx.restore();
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// Architect-phase marker: a little work site — a wooden fence with a red toolbox
// sitting in the middle. Bold navy outlines to match the cartoon style.
function makeArchitectMarker(scene) {
  if (scene.textures.exists('architect-marker')) return;
  const W = 104;
  const H = 86;
  const tex = scene.textures.createCanvas('architect-marker', W, H);
  const ctx = tex.getContext();
  const NAVY = '#173453';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const woodPlank = (x, y, w, h) => {
    ctx.fillStyle = '#b07a44';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
  };
  // fence: two posts + two rails behind the toolbox
  woodPlank(14, 30, 13, 50);
  woodPlank(78, 30, 13, 50);
  woodPlank(10, 42, 85, 10);
  woodPlank(10, 62, 85, 10);
  // toolbox body
  const bx = 34;
  const bw = 36;
  const by = 42;
  const bh = 26;
  ctx.fillStyle = '#d84b3a';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.rect(bx, by, bw, bh);
  ctx.fill();
  ctx.stroke();
  // lid
  ctx.fillStyle = '#b83a2b';
  ctx.beginPath();
  ctx.rect(bx - 3, by - 9, bw + 6, 13);
  ctx.fill();
  ctx.stroke();
  // handle
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(bx + bw / 2, by - 9, 10, Math.PI, 0);
  ctx.stroke();
  // latch
  ctx.fillStyle = NAVY;
  ctx.fillRect(bx + bw / 2 - 3, by + 4, 6, 9);
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

// Flat-vector icons for the 3 alternatives, drawn on transparent canvases:
// Private Equity = briefcase, Private Credit = coin, Real Assets = building.
// Navy detailing on the asset's colour, matching the game's palette.
const ICON_DARK = '#152036';
function makeAssetIcons(scene) {
  makeIcon(scene, 'icon-pe', '#7db4ff', drawBriefcase);
  makeIcon(scene, 'icon-pc', '#8fd0a0', drawCoin);
  makeIcon(scene, 'icon-ra', '#f0b46a', drawBuilding);
  makeIcon(scene, 'icon-hat', '#2b2b3a', drawHat); // disguise pieces (Private Credit)
  makeIcon(scene, 'icon-mustache', '#2b2320', drawMustache);
  makeIcon(scene, 'overpass-btn', '#d84b3a', drawBtnUp); // overpass button (raised)
  makeIcon(scene, 'overpass-btn-down', '#d84b3a', drawBtnDown); // overpass button (pressed)
  makeIcon(scene, 'finish-flag', '#000000', drawFinishFlag);
}

function makeIcon(scene, key, fill, draw) {
  if (scene.textures.exists(key)) return;
  const S = 64;
  const tex = scene.textures.createCanvas(key, S, S);
  const ctx = tex.getContext();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, S, fill, ICON_DARK);
  tex.refresh();
}

function drawBriefcase(ctx, S, fill, dark) {
  const c = S / 2;
  ctx.strokeStyle = dark;
  ctx.lineWidth = S * 0.06;
  ctx.beginPath();
  ctx.arc(c, S * 0.32, S * 0.13, Math.PI * 1.08, Math.PI * -0.08); // handle
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(S * 0.16, S * 0.34, S * 0.68, S * 0.44, S * 0.07);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = S * 0.05;
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.fillRect(S * 0.16, S * 0.5, S * 0.68, S * 0.045); // latch strip
  ctx.beginPath();
  ctx.roundRect(c - S * 0.055, S * 0.465, S * 0.11, S * 0.1, S * 0.02); // clasp
  ctx.fill();
}

function drawCoin(ctx, S, fill, dark) {
  const c = S / 2;
  const r = S * 0.33;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = S * 0.055;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r * 0.72, 0, Math.PI * 2);
  ctx.lineWidth = S * 0.03;
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.font = `700 ${S * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', c, c + S * 0.03);
}

function drawBuilding(ctx, S, fill, dark) {
  ctx.beginPath();
  ctx.roundRect(S * 0.26, S * 0.2, S * 0.48, S * 0.6, S * 0.04);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = dark;
  ctx.lineWidth = S * 0.05;
  ctx.stroke();
  ctx.fillStyle = dark;
  const cols = [0.34, 0.53];
  const rows = [0.28, 0.44];
  const w = S * 0.1;
  for (const gx of cols) for (const gy of rows) ctx.fillRect(S * gx, S * gy, w, w);
  ctx.beginPath();
  ctx.roundRect(S * 0.43, S * 0.62, S * 0.14, S * 0.18, S * 0.02); // door
  ctx.fill();
}

function drawHat(ctx, S, fill) {
  const c = S / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(c, S * 0.66, S * 0.42, S * 0.11, 0, 0, Math.PI * 2); // brim
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(S * 0.29, S * 0.22, S * 0.42, S * 0.46, S * 0.04); // crown
  ctx.fill();
  ctx.fillStyle = '#6b6b82';
  ctx.fillRect(S * 0.29, S * 0.55, S * 0.42, S * 0.07); // band
}

// Overpass button, two baked states: raised (up) and pressed-in (down). Same
// dark socket; the face + chevron sit high when up, low + dimmed when down.
function drawBtnUp(ctx, S, fill, dark) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(S * 0.14, S * 0.42, S * 0.72, S * 0.42, S * 0.1); // socket
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(S * 0.16, S * 0.16, S * 0.68, S * 0.46, S * 0.1); // raised face
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.roundRect(S * 0.2, S * 0.2, S * 0.6, S * 0.12, S * 0.06); // top highlight
  ctx.fill();
  btnChevron(ctx, S, dark, 0.48);
}

function drawBtnDown(ctx, S, fill, dark) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(S * 0.14, S * 0.42, S * 0.72, S * 0.42, S * 0.1); // socket
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(S * 0.18, S * 0.36, S * 0.64, S * 0.4, S * 0.09); // pressed-in face (low)
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.roundRect(S * 0.18, S * 0.36, S * 0.64, S * 0.4, S * 0.09); // shadow (dimmed)
  ctx.fill();
  btnChevron(ctx, S, dark, 0.64);
}

function btnChevron(ctx, S, dark, yc) {
  ctx.strokeStyle = dark;
  ctx.lineWidth = S * 0.07;
  ctx.beginPath();
  ctx.moveTo(S * 0.34, S * yc);
  ctx.lineTo(S * 0.5, S * (yc - 0.16));
  ctx.lineTo(S * 0.66, S * yc);
  ctx.stroke();
}

// Bullseye/target for the finish.
// A checkered race flag on a pole, planted at the finish. Pole runs down the
// canvas so the marker can be anchored with its base on the finish tile.
function drawFinishFlag(ctx, S) {
  const px = S * 0.28; // pole x
  // pole
  ctx.fillStyle = '#3a3f4d';
  ctx.fillRect(px - S * 0.028, S * 0.1, S * 0.056, S * 0.82);
  // knob on top
  ctx.beginPath();
  ctx.arc(px, S * 0.1, S * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#c4c4c4';
  ctx.fill();
  // checkered flag panel to the right of the pole top
  const fx = px + S * 0.03;
  const fy = S * 0.14;
  const fw = S * 0.54;
  const fh = S * 0.34;
  const cols = 5;
  const rows = 3;
  const cw = fw / cols;
  const ch = fh / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1a1a' : '#f4efe6';
      ctx.fillRect(fx + c * cw, fy + r * ch, cw + 0.5, ch + 0.5);
    }
  }
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = S * 0.02;
  ctx.strokeRect(fx, fy, fw, fh);
}

function drawMustache(ctx, S, fill) {
  const c = S / 2;
  ctx.fillStyle = fill;
  // Symmetric handlebar: dips at the centre (under the nose), sweeps out and
  // down, and the tips curl back up. Right half mirrors the left.
  const half = (sx) => {
    ctx.moveTo(c, S * 0.42);
    ctx.bezierCurveTo(c + sx * S * 0.08, S * 0.36, c + sx * S * 0.22, S * 0.36, c + sx * S * 0.34, S * 0.42);
    ctx.bezierCurveTo(c + sx * S * 0.46, S * 0.48, c + sx * S * 0.5, S * 0.4, c + sx * S * 0.46, S * 0.38);
    ctx.bezierCurveTo(c + sx * S * 0.44, S * 0.5, c + sx * S * 0.3, S * 0.54, c + sx * S * 0.18, S * 0.52);
    ctx.bezierCurveTo(c + sx * S * 0.08, S * 0.5, c + sx * S * 0.03, S * 0.52, c, S * 0.48);
  };
  ctx.beginPath();
  half(-1);
  half(1);
  ctx.closePath();
  ctx.fill();
}

// Dusk wash for the dark forest: a flat translucent film over the border art.
// (The light/dark seam is blended instead by scattering opposite-shade trees &
// bushes across it — see GameScene.foliageIndex / foliageIndexDark.)
function applyDarkWash(ctx, x0, y0, size) {
  ctx.fillStyle = 'rgba(8,16,12,0.42)';
  ctx.fillRect(x0, y0, size, size);
}

// Composite the tile atlas onto a canvas texture from the loaded sprites.
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
  // Dark forest variants — the SAME border art (dark walkable dirt, plus plain
  // grass / grass+tree / grass+bush) with the dusk dither on top, so a painted
  // dark forest scatters trees & bushes exactly like the light green border.
  ctx.drawImage(groundA, cell(TILE_INDEX.DARK_GROUND), 0, T, T);
  applyDarkWash(ctx, cell(TILE_INDEX.DARK_GROUND), 0, T);

  ctx.drawImage(grass, cell(TILE_INDEX.DARK_GRASS), 0, T, T);
  applyDarkWash(ctx, cell(TILE_INDEX.DARK_GRASS), 0, T);

  ctx.drawImage(grass, cell(TILE_INDEX.DARK_GRASS_TREE), 0, T, T);
  ctx.drawImage(tree, cell(TILE_INDEX.DARK_GRASS_TREE) + 3, 1, T - 6, T - 4);
  applyDarkWash(ctx, cell(TILE_INDEX.DARK_GRASS_TREE), 0, T);

  ctx.drawImage(grass, cell(TILE_INDEX.DARK_GRASS_BUSH), 0, T, T);
  ctx.drawImage(bush, cell(TILE_INDEX.DARK_GRASS_BUSH) + 8, 8, T - 16, T - 16);
  applyDarkWash(ctx, cell(TILE_INDEX.DARK_GRASS_BUSH), 0, T);

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
