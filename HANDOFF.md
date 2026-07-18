# Drive the Journey — Engineering Handoff

> For a collaborator (and their Claude Code) picking up this repo. Read
> [`CLAUDE.md`](CLAUDE.md) **first** — that's the product brief (narrative spine,
> build order, non‑goals). This document is the technical *how*: architecture,
> how to run/test, the map editor, and — importantly — the list of fine‑tuned
> decisions that were dialed in by hand and **should not be casually reverted**.
>
> Context that used to live only in the original author's local Claude memory is
> distilled here so nothing is lost across machines.

---

## 1. What this is (30‑second version)

A single‑player top‑down driving game built in **Phaser 3.90 + Vite 7** (vanilla
JS, ES modules). The player drives one of two cars over the **same course**:

- **Rusty car** = "going it alone" — every task is manual (typing, clicking,
  dragging, solving). Slower.
- **iCapCar** = the iCapital platform — tasks auto‑complete, a KYC checkpoint
  waves you through, an overpass materialises with a speed boost. Faster.

A persistent timer + best‑times table makes the contrast undeniable. The whole
thing must run **fully offline** for a live pitch (see the single‑file build).

The map/world is data‑driven and edited with an **in‑game map editor** (below).

---

## 2. Quick start

**Node is installed but NOT on PATH** on the original dev machine
(`C:\Program Files\nodejs`). In Git Bash, prefix commands:

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm install          # esbuild postinstall is pre-approved in package.json (allowScripts)
npm run dev          # dev server → http://localhost:5173
npm run build        # → ONE self-contained dist/index.html (see §7)
npm run preview      # serve the built dist/ (vite preview → :4173)
```

If using the Claude Code **preview launcher**, `.claude/launch.json` defines two
configs: `drive` (dev, :5173) and `drive-build` (`vite preview` of `dist`, :4173).

Deploy target: **GitHub Pages** + the offline single‑file build. `vite.config.js`
sets `base: './'` so paths stay portable for both.

---

## 3. Repo layout (file by file)

```
index.html                     Phaser mount (#game). Do NOT flex-center it (see §8.12).
vite.config.js                 base './', singleFile plugin, assetsInlineLimit (see §7).
CLAUDE.md                      Product brief — source of truth for design intent.
HANDOFF.md                     This file.
src/
  main.js                      Phaser.Game config. scene: [Opening, Game, UI].
  config.js                    ALL tunable constants (tile size, speeds, camera).
  scenes/
    OpeningScene.js            Title → manager name → client name → food → car pick → unlock → start.
    GameScene.js               The world: map render, driving, camera, tasks, gates, overpass, timer.
    UIScene.js                 Screen-space HUD: timer, ASSETS inventory, system-prompt panel, results.
  gfx/
    placeholders.js            Art loading + runtime texture assembly (tile atlas, corner/curb/KYC textures).
  map/
    level1.data.json           THE MAP (canonical). {w,h,tiles[],overpass[],pois[]}.
    level1.js                  Derives MAP_W/MAP_H + TILES enum from the JSON.
    mapStore.js                load/save/export map; localStorage vs committed JSON (see §5).
  editor/
    MapEditor.js               In-game map editor (backtick to toggle). DEV-only. (see §5).
  tasks/
    cagedAlt.js                Alt #1 — solve 3 math clues (mathClues.js). iCap auto-unlocks.
    debrisAlt.js               Alt #2 — click dirt off the asset. iCap vacuums instantly.
    disguiseAlt.js             Alt #3 — drag hat+moustache off the asset. iCap scanner auto-inspects.
    mathClues.js               Randomized +/-/× clue generator for cagedAlt.
    kycGate.js                 KYC checkpoint verify flow (OLD car). iCap path is in GameScene.
    overpassButton.js          "Activate overpass" button. OLD = broken; iCap = materialises.
    assembly.js                ARCHITECT stage at the finish (drag assets into slots / iCap auto-arrange).
  bestTimes.js                 Persistent best times (localStorage) + formatTime().
  assets/art/*.png             Kenney CC0 art, IMPORTED (not public/) so Vite inlines it (see §7).
```

---

## 4. Architecture & runtime flow

### Scenes
Phaser auto‑starts only the **first** scene in the `scene:` array. Order matters:

1. **OpeningScene** (`'Opening'`) auto‑starts. A small `onKey` state machine walks
   through screens (`title → input(manager) → input(client) → input(food) → car
   pick → unlock → begin()`). `begin()` writes to the **registry** and
   `scene.start('Game')`.
2. **GameScene** (`'Game'`) — the world. In `create()` it `scene.launch('UI')`.
3. **UIScene** (`'UI'`) — runs **in parallel** at zoom 1 so HUD/prompts are crisp
   in screen space, independent of the world camera's zoom (3×).

### Cross‑scene data = the registry
Set in `OpeningScene.begin()`, read in GameScene / tasks:
- `managerName` — wealth manager's name (typed in the opening).
- `clientName`, `clientFood` — used by the **KYC gates** (dev defaults: `Jordan`
  / `pizza` if GameScene is launched standalone).
- `isICap` — which car. Drives every branch: car texture, task auto‑complete,
  overpass materialise, KYC auto‑verify.

### One run's lifecycle (GameScene)
`preload()` loads art → `create()` builds map/atlas/driver/camera/gates →
`update()` drives movement + camera + trigger checks. Contact/proximity with a
POI starts a **task** (sets `this.interacting = true`, which pauses driving until
the task's `onComplete` fires). Finish → **assembly** (architect) → timer stops →
`UIScene.showResults()` → "run again" → `location.reload()` (replays the opening).

### The "two runs" pattern
There is ONE game. The iCap run is **conditionals on the old run**, not a second
game. Every task takes `{ isICap }` and branches: the OLD path is the manual
interaction; the iCap path auto‑completes and skips the manual visuals. When
adding or changing a task, keep both branches in the same function.

---

## 5. The map & the map editor  ⭐ (read this before touching the world)

### Map data format — `src/map/level1.data.json`
Current size **99 × 119**. Shape:
```jsonc
{
  "w": 99, "h": 119,
  "tiles":    ["0001110…", …],   // BASE terrain, one digit-string per row
  "overpass": ["0000000…", …],   // overlay, one digit-string per row
  "pois":     [{ "type": "start", "x": 31, "y": 114, "label": "START" }, …]
}
```
Tile digits (`TILES` enum in `level1.js`):
- **base `tiles`**: `0` GROUND (walkable), `1` TREE (impassable), `2` BUSH (impassable).
- **`overpass` overlay**: `0` none, `3` CONCRETE (overpass road), `4` BRIDGE (railing).

**Two layers on purpose.** The overpass is a *separate overlay* on top of the
base terrain so drawing it never destroys the trees/ground underneath. (An
earlier single‑layer version stored concrete in `tiles` and deleted the forest —
do not go back to that.) See §6 for how it renders.

### Current POIs (tile coords)
```
start        (31,114)     alt-caged   (80,75)
alt-debris   (31,83)      kyc1        (31,71)
alt-disguise (45,111)     overpass    (41,64)
kyc2         (61,11)      finish      (76,11)
```
Flow: start (bottom) → collect 3 alts in the lower field → KYC 1 → document
forest + overpass button → KYC 2 → finish/architect (top).

### The in‑game map editor — `src/editor/MapEditor.js`
**DEV‑only** (gated by `import.meta.env.DEV`; absent from the production build).
Press **backtick `` ` ``** in the dev server to toggle it.

- **Terrain brushes:** Ground / Tree / Bush / Concrete / Bridge. Pick one,
  **left‑drag** on the canvas to paint. (Concrete/Bridge paint the *overpass*
  overlay; the other three paint base terrain and clear any overpass there —
  handled in `GameScene.paintTile`.)
- **Place POI:** pick Start / Debris / Disguise / Caged / KYC 1 / KYC 2 /
  Overpass / Finish, then **click** a tile to move it there.
- **Pan:** Arrows / WASD. **Zoom:** mouse wheel.
- **Actions:** **Save** (localStorage), **Export** (downloads `level1.data.json`),
  **Reset** (clears the localStorage save, restarts the scene), **Exit** (`` ` ``).

### ⚠️ The localStorage‑vs‑committed‑JSON gotcha (this bites people)
`mapStore.loadMap()` load priority:
1. a browser **localStorage** save from the editor (if dims match + start is on
   ground), else
2. the committed **`level1.data.json`**.

So once you use the editor, **your browser is playing your localStorage copy, not
the JSON on disk.** To make an edit canonical:
1. In the editor, click **Export** → it downloads `level1.data.json`.
2. Replace `src/map/level1.data.json` with that file and commit it.
3. **Bump the storage key** `KEY = 'drive.level1.map.vN'` in `mapStore.js`
   (currently `v5`) whenever the committed map's **dimensions change** — this
   discards everyone's stale localStorage so they actually see the new JSON.
   (For same‑dimension edits, collaborators can instead Reset / clear
   `localStorage['drive.level1.map.v5']`.)

localStorage is per‑browser, so your editor save does **not** travel with the
repo. Only the committed JSON does.

---

## 6. Rendering & art pipeline

- **Not pixel art.** `main.js` uses `antialias: true`, renders the canvas at
  `RENDER_SCALE` (=3) × resolution with a matching camera zoom of 3, so the
  visible tile count (13×9, `VIEW_TILES_*`) is unchanged but crisp.
- **Tilemap.** `GameScene.drawMap()` builds an index grid and a culling Phaser
  tilemap layer from one tileset image, `tiles-atlas`.
- **The atlas is assembled at runtime** in `placeholders.js` `makeTilesAtlas()` by
  compositing the imported Kenney PNGs onto a canvas texture. 7 frames:
  `GROUND, GROUND_ALT, GRASS, GRASS_TREE, GRASS_BUSH, CONCRETE, BRIDGE`.
  - Walkable ground = **dirt** (`art-dirt`). Impassable border = **grass** with
    trees/bushes scattered sparsely (see §8.7). Overpass = **asphalt** + orange
    kerb overlays (see §8.8).
- **Textures also generated at runtime:** the KYC candy‑stripe (`kyc-stripe`),
  the rounded‑corner wedges (`grass-round`, `dirt-round`), the overpass kerb
  (`curb`). All in `placeholders.js`.
- **Cars** are imported PNGs used directly as textures `car-icap` / `car-old`,
  scaled down in `createDriver()`.

Art lives in `src/assets/art/` and is **imported** (e.g. `import grassUrl from
'../assets/art/grass.png'`) — this is what lets the single‑file build inline it.

---

## 7. The offline single‑file build (don't break this)

`npm run build` produces **one** `dist/index.html` (~1.4 MB) that runs by
double‑click (`file://`), no server, no internet — the pitch requirement.

How it works, and what to preserve:
- Art is in **`src/assets/art/`** and **imported** in `placeholders.js` (NOT in a
  `public/` folder — `public/` files are copied verbatim and would stay external).
- `vite.config.js`: `assetsInlineLimit: 100000000` inlines every asset as a
  `data:` URI, and **`vite-plugin-singlefile`** inlines the JS/CSS into the HTML.
- The result is one inline `<script type="module">` with no external fetches →
  runs from `file://`.

If you add art, put it in `src/assets/art/` and `import` it. If you add a
runtime‑fetched asset by URL/path, it will break the offline build.

To reshare after changes: `npm run build`, then send `dist/index.html`. (The last
build was copied to the author's `Downloads/icapital-drive.html`.)

Note: the production build strips `import.meta.env.DEV` code — the **map editor,
`M` overview, and `window.__game`** exist only in `npm run dev`.

---

## 8. FINE‑TUNED DECISIONS — please don't casually revert ⭐

These were dialed in by hand (often after visible bugs). Each has a reason. If you
need to change one, do it deliberately and re‑verify, don't "clean it up."

1. **Camera = per‑axis corridor‑aware smooth follow** (`GameScene.updateCamera`).
   We do NOT use Phaser `startFollow`/`setBounds` — both misbehave when zoomed
   (bounds clamp is wrong at zoom, and hand‑rolled scroll math was off by a fixed
   amount). Instead: `cam.useBounds=false`, drive with `cam.centerOn()` reading
   `cam.midPoint`, clamp the *centre* via `clampCenter()`. Tuned constants in
   `config.js`: `CAM_TRAVEL_SMOOTH 0.18`, `CAM_CROSS_SMOOTH 0.045`,
   `CORRIDOR_RATIO 1.6`, `CORRIDOR_SCAN_CAP 14`. Verify camera against
   `cam.worldView`/`midPoint`, never a hand formula.
2. **Movement = continuous arcade physics** (velocity + slide along walls),
   normalized so diagonals aren't faster. Not tile‑stepped. `CAR_SPEED = 210`
   (same for both cars — honest timing; see §9 on making runs quicker).
3. **Render: antialiased, `RENDER_SCALE=3`, zoom 3, NOT `pixelArt`.** The one
   exception: the **tileset atlas uses NEAREST filtering** (`setFilter` in
   `makeTilesAtlas`) to kill atlas edge‑bleed seams (a tile's edge sampling the
   neighbouring atlas cell). Don't make the whole game nearest, and don't drop the
   nearest filter on the atlas (the green seams come back).
4. **Overpass is a two‑layer overlay** (`tiles` + `overpass`), rendered by
   `stampCell()`: hidden ⇒ renders/collides as the base terrain underneath;
   materialised ⇒ concrete (passable) + bridge (wall). Never fold concrete/bridge
   into base `tiles`.
5. **Overpass is invisible & passable until materialised**; the speed boost
   (`OVERPASS_BOOST 1.8`) applies only to the iCapCar on CONCRETE tiles
   (`speedMultiplier`). OLD car's button says "broken".
6. **Border rounding** (`addBorderRounding`): OUTER/convex corners get a grass
   wedge, INNER/concave corners get a dirt wedge (`grass-round`/`dirt-round`
   textures). Wedges on overpass cells go into `this.overpassUnderRounding` and
   are **hidden in `activateOverpass()`** so they don't sit on the concrete.
   Collision is unchanged (purely cosmetic).
7. **Foliage scatter** (`foliageIndex`) uses a **2D bit‑avalanche hash** so trees/
   bushes don't line up in rows/columns. ~80% plain grass / 12% tree / 8% bush.
   Don't replace with a simple `(x*a+y*b)%n` hash — it bands.
8. **Overpass kerbs** (`addOverpassCurbs`) are the real Kenney orange/white kerb,
   placed as oriented overlay sprites on the **W/E sides only** (no horizontal
   caps across the open ends of the vertical road), and **hidden until
   `activateOverpass`**.
9. **KYC gate**: a candy‑striped customs boom (`kyc-stripe`). OLD car = manual
   verify (client name → favourite food, wrong answer is a soft retry, never a
   dead‑end). iCap = **auto‑opens without stopping** + a non‑invasive "Welcome,
   [client] ✓" speech bubble (handled in `GameScene.startKycGate`, not
   `kycGate.js`). Uses the registry `clientName`/`clientFood`.
10. **Timer** starts on the driver's **first movement** (shows `0:00.0` until
    then), ticks **before** the `update()` early‑outs (so manual tasks cost time),
    and stops at the **end of the architect/assembly stage** — NOT at the finish
    line (a deliberate call so the manual‑vs‑one‑click assembly time counts).
11. **Opening → registry → Game**, and results "run again" = `location.reload()`
    (which replays the opening). If you make replay skip the opening, preserve the
    registry values.
12. **Canvas centering**: `#game` in `index.html` is **not** flex‑centered —
    Phaser's `Scale.FIT` + `CENTER_BOTH` centers it. Having both stacked pushes
    the canvas off‑center.
13. **Cars** point up (north) at angle 0 (rear‑view). `orient()` maps facing →
    angle. `createDriver()` scales the tall PNG to ~1 tile and sets a snug body.
14. **Alt‑task interaction details** (already fine‑tuned): the covered/disguised
    asset art appears at the **first** system prompt; debris = click the dirt off;
    disguise = two draggable pieces (hat + moustache) that **stay on screen** once
    pulled; the on‑map disguise marker wears the disguise and fades on collect;
    map markers match the collectible shapes (◇ debris, ○ disguise, △ caged).

---

## 9. Where the group's planned changes touch (map for dividing work)

You explicitly do NOT need to implement these yet — this just points each at the
right files and flags which fine‑tuned bits to respect.

- **"Whole run needs to be quicker."** Prefer **shortening the course in the map
  editor** (move POIs closer / trim the forest, then Export + commit the JSON +
  bump `mapStore` key if dims change). Bumping `CAR_SPEED` in `config.js` is the
  **last resort** (keep it equal for both cars — honest timing, §8.2). The iCap
  boost is `OVERPASS_BOOST`.
- **Move the Architect to the beginning (needs ideation).** Today it's
  `assembly.js` `runAssembly()`, invoked from `GameScene.startFinish()` at the
  finish POI, and the **timer stops when it completes** (§8.10). Moving it earlier
  means rethinking that timer‑stop and the "collected assets snap into an
  allocation" reward flow. Coordinate before moving.
- **Marketplace feature (info/guide at the start of the iCap run).** Marketplace =
  *visibility* per `CLAUDE.md`. Today it's only the paper‑map‑vs‑iGPS unlock text
  in `OpeningScene.showUnlock()`. A guide screen would be a new opening step
  (extend the OpeningScene state machine) shown only when `isICap`.
- **Live paper map + GPS, top‑right.** No minimap exists yet (deferred in
  `CLAUDE.md`). It belongs in **UIScene** (screen space): render a small map from
  `GameScene`'s `tiles`/`pois` + driver position; OLD car = crumpled paper map,
  iCap = live iGPS minimap. Read map data via `GameScene.getMapData()`.
- **Reporting.** Today's "reporting" is `UIScene.showResults()` + `bestTimes.js`.
  Consolidated Reporting (the finish dashboard) is deferred in `CLAUDE.md`;
  build on `showResults`.
- **Prettier / change words.** Copy lives in `OpeningScene` labels, each task's
  prompt strings (`tasks/*.js`), and `UIScene`. Visual polish: POI markers are
  still placeholder shapes (`GameScene.createPoi`), and the HUD is basic.
- **Customization (car color, wealth‑manager avatars).** Cars are just PNGs; the
  Racing Pack has black/blue/green/red. To offer colors, add PNGs to
  `src/assets/art/`, import them, and let the opening pick a texture key that
  `createDriver()` uses. Avatar picker for the wealth manager was intentionally
  deferred to a name input (`CLAUDE.md`).

---

## 10. How to run & test the way this was built

The dev preview runs headless/backgrounded, which throttles `requestAnimationFrame`
— so scripted checks must **drive the loop manually**. In `npm run dev`,
`window.__game` is exposed (DEV only).

- **Step the game loop** in an eval: `for (let i=0;i<N;i++){ t+=16; g.step(t,16); }`
  (real gameplay won't advance otherwise).
- **After any edit, confirm the module loaded** before trusting evals:
  `!!window.__game && !!document.querySelector('canvas')` — a syntax error blanks
  the page and you'll test stale code.
- **Screenshots** often time out on the throttled iframe. Reliable capture:
  `g.step(...)` a frame, then `document.querySelector('canvas').toDataURL('image/png')`,
  save the base64 to a file, decode with Node (`Buffer.from(b64,'base64')`), and
  view the PNG. To frame a specific spot without triggering a task, set
  `scene.interacting = true`, `cam.centerOn(x,y)`, then step + capture.
- **Verify the camera** against `cam.worldView` / `cam.midPoint`, never a
  hand‑rolled scroll formula.
- **Restarting the dev server** leaves an open browser tab on a stale HMR bundle —
  hard‑refresh (Ctrl+Shift+R) if the world looks wrong.

Lint/format: none configured beyond the code style in place — match the
surrounding style (JSDoc‑ish block comments, small pure helpers).

---

## 11. Gotchas checklist

- Editing `level1.data.json` but the game ignores it → you have a localStorage
  save overriding it (§5). Reset in the editor or clear the key.
- Green seams between tiles → the atlas NEAREST filter got dropped (§8.3).
- Trees/bushes lining up in rows → someone simplified `foliageIndex` (§8.7).
- Green wedges sitting on the overpass concrete → `overpassUnderRounding` isn't
  being hidden on materialise (§8.6).
- Offline `dist/index.html` shows a blank page → an asset was referenced by
  path/URL instead of imported, or `public/` was reintroduced (§7).
- Canvas off‑center → `#game` got flex‑centered again (§8.12).
- Timer counts during setup / doesn't count task time → the start‑on‑first‑move or
  tick‑before‑early‑out logic changed (§8.10).

---

Questions the doc doesn't answer are almost always resolved by reading
`CLAUDE.md` (intent) + the relevant `src/` file (they carry explanatory comments).
