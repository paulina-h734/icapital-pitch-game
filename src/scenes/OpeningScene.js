import Phaser from 'phaser';
import { FONT_TITLE, FONT_BODY } from '../config.js';
import { preloadCars } from '../gfx/placeholders.js';
import { drawPanel } from '../gfx/panel.js';
import { loadBestTimes, resetBestTimes, formatTime } from '../bestTimes.js';

// ---------------------------------------------------------------------------
// OpeningScene — the pitch opening, run before GameScene. Sequence:
//   title -> wealth manager's name -> welcome + client's name -> security
//   question (favourite food) -> choose your vehicle -> unlock text -> drive.
// Stores managerName / clientName / clientFood / isICap in the registry, which
// GameScene (and the KYC gates) read. Renders at zoom 1 (screen space).
//
// Styling: a persistent backdrop (gradient + a little road) sits under every
// screen; a short fade/"blink" plays between screens (transition()).
// ---------------------------------------------------------------------------

const FADE = [8, 12, 24]; // blink colour between pages (near-bg navy)

export default class OpeningScene extends Phaser.Scene {
  constructor() {
    super('Opening');
  }

  preload() {
    preloadCars(this); // real car sprites for the "choose your vehicle" screen
  }

  init(data) {
    this.startData = data || {};
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.els = [];
    this.value = '';
    this.state = 'title';
    this.transitioning = false;

    this.makeBackdrop(); // persistent — never cleared between screens
    this.input.keyboard.on('keydown', this.onKey, this);

    const data = this.startData || {};
    if (data.names) {
      this.managerName = data.names.managerName;
      this.clientName = data.names.clientName;
      this.clientFood = data.names.clientFood;
    }
    if (data.mode === 'results') {
      this.isICap = data.isICap;
      this.showResults(data); // finish -> results page
    } else if (data.mode === 'car') {
      this.chooseVehicle(); // "run again" re-enters at the car pick, keeping names
    } else {
      this.showTitle();
    }
    this.cameras.main.fadeIn(320, ...FADE); // intro blink-in
  }

  // --- persistent backdrop ---------------------------------------------------

  makeBackdrop() {
    const { W, H } = this;
    const g = this.add.graphics().setDepth(-10);
    // bright daytime sky — a clear blue up top easing to a deeper blue lower down
    g.fillGradientStyle(0x54a2e2, 0x54a2e2, 0x2f74bf, 0x2f74bf, 1);
    g.fillRect(0, 0, W, H);
    // lighter-grey road band along the bottom, with a top-edge accent + dashes
    const roadTop = H * 0.82;
    g.fillStyle(0x3b3f48, 1);
    g.fillRect(0, roadTop, W, H - roadTop);
    g.fillStyle(0x5c616c, 1); // top-edge highlight
    g.fillRect(0, roadTop, W, 3);
    g.fillStyle(0xd6dae2, 1);
    const ly = roadTop + (H - roadTop) * 0.5;
    for (let x = 24; x < W; x += 66) g.fillRect(x, ly, 36, 5);
    this.bg = g;
    this.makeClouds();
  }

  // A big, cartoony flat-vector cloud (white puffs + a soft under-shadow, in the
  // game's CC0 art style) drifting across the upper sky. Clouds live outside
  // `els` so they persist, and drift is driven in update() for a smooth wrap.
  makeCloudTexture() {
    if (this.textures.exists('cloud')) return;
    const w = 420;
    const h = 240;
    const tex = this.textures.createCanvas('cloud', w, h);
    const ctx = tex.getContext();
    const NAVY = '#173453';
    const GREY = '#d9dde3';
    const LW = 8; // outline thickness (thinner), drawn as an inflated navy silhouette
    // Puffs sit with a margin from the top so the outline isn't clipped/flattened.
    const puffs = [
      [152, 120, 50],
      [214, 92, 64],
      [280, 120, 52],
      [116, 156, 44],
      [196, 158, 58],
      [264, 158, 54],
      [330, 156, 42],
    ];
    const bx = 112;
    const by = 140;
    const bw = 224;
    const bh = 52;
    const disc = (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // 1) white body
    ctx.fillStyle = '#ffffff';
    puffs.forEach(([x, y, r]) => disc(x, y, r));
    ctx.fillRect(bx, by, bw, bh);
    // 2) grey underside, confined to the body (source-atop) so it hugs the bottom
    //    contour like a shading rim rather than floating bumps in the middle. The
    //    fill overshoots the body on all sides so the clip rounds its corners to
    //    the cloud's own outline (no square corner peeking out).
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = GREY;
    ctx.fillRect(48, 166, 324, 70);
    [[150, 170, 30], [206, 172, 34], [262, 170, 32], [312, 166, 24]].forEach(([x, y, r]) =>
      disc(x, y, r),
    );
    // 3) thin navy outline behind everything (destination-over): inflated silhouette
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = NAVY;
    puffs.forEach(([x, y, r]) => disc(x, y, r + LW));
    ctx.fillRect(bx - LW, by - LW, bw + LW * 2, bh + LW * 2);
    ctx.globalCompositeOperation = 'source-over';
    tex.refresh();
  }

  makeClouds() {
    this.makeCloudTexture();
    const { W, H } = this;
    const margin = 260;
    // [x fraction, y fraction, scale, speed px/s]
    const defs = [
      [0.12, 0.15, 1.0, 11],
      [0.55, 0.09, 0.7, 15],
      [0.82, 0.2, 1.3, 9],
      [0.33, 0.28, 0.85, 13],
    ];
    this.clouds = defs.map(([fx, fy, scale, speed]) => {
      const img = this.add
        .image(W * fx, H * fy, 'cloud')
        .setScale(scale)
        .setAlpha(0.95)
        .setDepth(-5);
      return { img, speed, margin: margin * scale };
    });
  }

  update(_time, delta) {
    if (!this.clouds) return;
    const dx = delta / 1000;
    for (const c of this.clouds) {
      c.img.x += c.speed * dx;
      if (c.img.x - c.margin > this.W) c.img.x = -c.margin; // wrap smoothly off-screen
    }
  }

  // --- helpers ---------------------------------------------------------------

  clearScreen() {
    // Kill only the current screen's tweens (button pulse etc.) — the persistent
    // cloud drift lives outside `els` and must keep running.
    this.els.forEach((e) => {
      this.tweens.killTweensOf(e);
      e.destroy();
    });
    this.els = [];
  }

  // Fade to the blink colour, swap screens, fade back. Input is ignored while
  // a transition is in flight.
  transition(next) {
    if (this.transitioning) return;
    this.transitioning = true;
    const cam = this.cameras.main;
    cam.fadeOut(150, ...FADE);
    cam.once('camerafadeoutcomplete', () => {
      next();
      cam.fadeIn(160, ...FADE);
      this.transitioning = false;
    });
  }

  label(x, y, str, size, color, extra = {}) {
    const t = this.add
      .text(x, y, str, { fontFamily: FONT_BODY, fontSize: `${size}px`, color, ...extra })
      .setOrigin(0.5)
      .setResolution(2);
    this.els.push(t);
    return t;
  }

  // A light-grey, bevelled rounded panel in the inventory/timer style: drop
  // shadow, dark border, grey face, thin light highlight along the top. Drawn
  // around its own centre so it can be scaled/pulsed. Returns the graphics.
  roundedPanel(x, y, w, h, r, base = 0xc6c6c6) {
    const g = drawPanel(this, x, y, w, h, r, base);
    this.els.push(g);
    return g;
  }

  // Toggle-on-hover white sheen sized to a panel (added at its centre).
  hoverSheen(x, y, w, h, r, alpha = 0.2) {
    const g = this.add.graphics().setPosition(x, y).setVisible(false);
    g.fillStyle(0xffffff, alpha);
    g.fillRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, Math.max(2, r - 2));
    this.els.push(g);
    return g;
  }

  // Left-aligned text (for laying out a document). Defaults to the body font.
  leftText(x, y, str, size, color, font = FONT_BODY, wrap) {
    const style = { fontFamily: font, fontSize: `${size}px`, color };
    if (wrap) style.wordWrap = { width: wrap };
    const t = this.add.text(x, y, str, style).setOrigin(0, 0.5).setResolution(2);
    this.els.push(t);
    return t;
  }

  // A cream "sheet of paper" over the backdrop — drop shadow, paper fill, a
  // subtle tan border — for document-style screens (the route briefing).
  paperSheet(x, y, w, h) {
    const g = this.add.graphics().setPosition(x, y);
    const hw = w / 2;
    const hh = h / 2;
    const r = 14;
    g.fillStyle(0x0a1428, 0.45);
    g.fillRoundedRect(-hw + 7, -hh + 11, w, h, r); // drop shadow
    g.fillStyle(0xf5f0e4, 1);
    g.fillRoundedRect(-hw, -hh, w, h, r); // paper
    g.lineStyle(2, 0xd8ccb2, 1);
    g.strokeRoundedRect(-hw, -hh, w, h, r); // subtle border
    this.els.push(g);
    return g;
  }

  // A raised, pulsing light-grey rounded button. Hover adds a sheen.
  bigButton(x, y, text, onClick) {
    const w = 300;
    const h = 82;
    const r = 22;
    const panel = this.roundedPanel(x, y, w, h, r);
    const sheen = this.hoverSheen(x, y, w, h, r);
    const txt = this.add
      .text(x, y, text, { fontFamily: FONT_TITLE, fontSize: '38px', color: '#25344c' })
      .setOrigin(0.5)
      .setResolution(2);
    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.els.push(txt, hit);
    this.tweens.add({
      targets: [panel, sheen, txt, hit],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 780,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    hit.on('pointerover', () => sheen.setVisible(true));
    hit.on('pointerout', () => sheen.setVisible(false));
    hit.on('pointerdown', onClick);
    return panel;
  }

  // --- screens ---------------------------------------------------------------

  showTitle() {
    this.clearScreen(); // so returning here (e.g. "Return home") wipes the prior page
    // Every landing on the title — a fresh launch or a "Return home" — clears the
    // best-times scoreboard. ("Run again" goes to car select, so it's preserved.)
    resetBestTimes();
    this.state = 'title';
    const { W, H } = this;
    // bubble-letter title: white fill + thick navy outline + soft shadow, so it
    // pops against the (also white) clouds and the sky.
    const title = this.label(W / 2, H * 0.27, 'iCapital', 104, '#ffffff', { fontFamily: FONT_TITLE });
    title.setStroke('#173453', 14);
    title.setShadow(3, 5, 'rgba(10,24,48,0.45)', 8, false, true);
    const sub = this.label(W / 2, H * 0.42, 'DRIVE THE JOURNEY', 46, '#ffffff', {
      fontFamily: FONT_TITLE,
    });
    sub.setStroke('#173453', 7);
    if (sub.setLetterSpacing) sub.setLetterSpacing(8);
    this.label(W / 2, H * 0.52, 'An advisor’s road to alternatives', 22, '#eaf3ff', {
      fontStyle: 'bold',
    });
    this.bigButton(W / 2, H * 0.67, '▶  PLAY', () => this.transition(() => this.askManager()));
    this.label(W / 2, H * 0.78, 'or press Enter', 20, '#eaf3ff', { fontStyle: 'bold' });
  }

  askInput(state, title, question, onSubmit) {
    this.clearScreen();
    this.state = state;
    this.value = '';
    this.onSubmit = onSubmit;
    const { W, H } = this;
    this.label(W / 2, H * 0.31, title, 40, '#ffffff', {
      fontFamily: FONT_TITLE,
      stroke: '#173453',
      strokeThickness: 8,
    });
    this.label(W / 2, H * 0.43, question, 27, '#eef6ff');
    // framed light-grey input field, so the caret has an intentional home
    this.roundedPanel(W / 2, H * 0.56, 520, 68, 16);
    this.valueText = this.label(W / 2, H * 0.56, '|', 36, '#25344c', {
      fontFamily: FONT_BODY,
      fontStyle: 'bold',
    });
    this.hint = this.label(W / 2, H * 0.69, 'Type your answer, then press Enter', 20, '#eaf3ff', {
      fontStyle: 'bold',
    });
  }

  refreshValue() {
    this.valueText.setText(`${this.value}|`);
  }

  askManager() {
    this.askInput('input', 'Wealth manager', "What's your name?", (v) => {
      this.managerName = v;
      this.transition(() => this.askClient());
    });
  }

  askClient() {
    this.askInput('input', `Welcome, ${this.managerName}`, "What's your client's name?", (v) => {
      this.clientName = v;
      this.transition(() => this.askFood());
    });
  }

  askFood() {
    this.askInput('input', 'Security question', "What's your client's favourite food?", (v) => {
      this.clientFood = v;
      this.transition(() => this.chooseVehicle());
    });
  }

  chooseVehicle() {
    this.clearScreen();
    this.state = 'car';
    this.label(this.W / 2, this.H * 0.15, 'Choose your vehicle', 42, '#ffffff', {
      fontFamily: FONT_TITLE,
      stroke: '#173453',
      strokeThickness: 8,
    });
    this.carCard(this.W / 2 - 195, 'car-old', 'Rusty car', false);
    this.carCard(this.W / 2 + 195, 'car-icap', 'iCapCar', true);
  }

  carCard(cx, carKey, name, isICap) {
    const cy = this.H * 0.52;
    const w = 330;
    const h = 300;
    const r = 22;
    const panel = this.roundedPanel(cx, cy, w, h, r);
    const sheen = this.hoverSheen(cx, cy, w, h, r, 0.16);
    // the actual car sprite, scaled to ~150px tall (roomier now the subtitle's gone)
    const car = this.add.image(cx, cy - 34, carKey);
    car.setScale(150 / car.height);
    this.els.push(car);
    this.label(cx, cy + 96, name, 30, '#25344c', { fontFamily: FONT_TITLE });
    const hit = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    this.els.push(hit);
    hit.on('pointerover', () => sheen.setVisible(true));
    hit.on('pointerout', () => sheen.setVisible(false));
    hit.on('pointerdown', () => {
      this.isICap = isICap;
      // iCap goes straight to the briefing; the rusty car gets its unlock screen.
      this.transition(() => (isICap ? this.showBriefingIntro() : this.showUnlock()));
    });
  }

  showUnlock() {
    this.clearScreen();
    this.state = 'unlock';
    const title = this.isICap ? 'iGPS unlocked' : 'Old map unlocked';
    const body = this.isICap
      ? 'iCapCar can unlock special abilities — follow the iGPS to find them all.'
      : 'You have unlocked the old map (very crumpled). You are on your own out there.';
    this.label(this.W / 2, this.H * 0.36, title, 42, this.isICap ? '#d6ecff' : '#ffd0ba', {
      fontFamily: FONT_TITLE,
      stroke: '#173453',
      strokeThickness: 8,
    });
    this.label(this.W / 2, this.H * 0.5, body, 24, '#eef6ff', {
      wordWrap: { width: 680 },
      align: 'center',
    });
    this.label(
      this.W / 2,
      this.H * 0.66,
      this.isICap ? 'Press Enter to continue' : 'Press Enter to drive',
      21,
      '#c9f5d8',
      { fontStyle: 'bold' },
    );
  }

  // iCap-only: announce the briefing before opening it (a little "you've got
  // mail" beat) — the platform has plotted the route for you.
  showBriefingIntro() {
    this.clearScreen();
    this.state = 'briefIntro';
    const { W, H } = this;
    this.label(W / 2, H * 0.34, 'New briefing received', 46, '#ffffff', {
      fontFamily: FONT_TITLE,
      stroke: '#173453',
      strokeThickness: 8,
    });
    this.label(
      W / 2,
      H * 0.48,
      'Your iGPS has plotted the whole journey. Open the briefing to see the road ahead.',
      24,
      '#eef6ff',
      { wordWrap: { width: 720 }, align: 'center' },
    );
    this.label(W / 2, H * 0.64, 'Press Enter to open', 21, '#eaf3ff', { fontStyle: 'bold' });
  }

  // iCap-only route briefing, laid out as a printed guide on a sheet of paper
  // over the backdrop. The platform maps the whole trip up front (the rusty car
  // gets no such preview). Runs before the game, so it's not timed.
  showBriefing() {
    this.clearScreen();
    this.state = 'brief';
    const { W, H } = this;
    const pw = Math.min(920, W * 0.9);
    const ph = Math.min(660, H * 0.88);
    const cx = W / 2;
    const cy = H * 0.5;
    const left = cx - pw / 2 + 46; // inner left margin
    const top = cy - ph / 2;
    this.paperSheet(cx, cy, pw, ph);

    // letterhead + divider
    this.leftText(left, top + 52, 'iGPS · Route Briefing', 40, '#1c2b45', FONT_TITLE);
    const rule = this.add.graphics();
    rule.fillStyle(0xcdbb9a, 1);
    rule.fillRect(left, top + 84, pw - 92, 3);
    this.els.push(rule);
    this.leftText(
      left,
      top + 116,
      "The iCapital platform maps the whole journey — here's the road ahead:",
      19,
      '#5a6478',
      FONT_BODY,
      pw - 92,
    );

    const stops = [
      ['iGPS', 'Your live map of the whole route'],
      ['Architect', "Set the client's target allocation"],
      ['Research & diligence', 'Collect 3 vetted alternatives'],
      ['KYC customs', 'Identity verified automatically'],
      ['Document Center', 'The overpass carries you over the paperwork'],
      ['Consolidated reporting', 'One clean view at the finish'],
    ];
    const rowsTop = top + 156;
    const rowH = (ph - 156 - 66) / stops.length;
    stops.forEach(([stop, desc], i) => {
      const y = rowsTop + i * rowH + rowH / 2;
      const dot = this.add.circle(left + 18, y, 17, 0x2d6cdf);
      const num = this.add
        .text(left + 18, y, `${i + 1}`, { fontFamily: FONT_TITLE, fontSize: '20px', color: '#ffffff' })
        .setOrigin(0.5)
        .setResolution(2);
      this.els.push(dot, num);
      this.leftText(left + 52, y - 11, stop, 24, '#1c2b45', FONT_TITLE);
      this.leftText(left + 52, y + 15, desc, 17, '#5a6478', FONT_BODY, pw - 160);
    });

    this.label(cx, top + ph - 32, 'Press Enter to begin', 21, '#2d6cdf', { fontStyle: 'bold' });
  }

  // The results page (after FINISH) — best times + Return home / Run again, in
  // the same opening style.
  showResults(data) {
    this.clearScreen();
    this.state = 'results';
    const { W, H } = this;
    const best = data.best || loadBestTimes();
    this.label(W / 2, H * 0.15, 'Run complete', 48, '#ffffff', {
      fontFamily: FONT_TITLE,
      stroke: '#173453',
      strokeThickness: 8,
    });
    this.label(W / 2, H * 0.26, 'BEST TIMES', 22, '#eaf3ff', { fontStyle: 'bold' });
    this.resultRow(W / 2, H * 0.4, 'Rusty car', best.old, data.isICap === false);
    this.resultRow(W / 2, H * 0.53, 'iCapCar', best.icap, data.isICap === true);
    // Return home = full reset (clears best times); Run again = keep names, re-pick car.
    this.bigButton(W / 2 - 175, H * 0.75, 'Return home', () => this.goHome());
    this.bigButton(W / 2 + 175, H * 0.75, 'Run again', () =>
      this.transition(() => this.chooseVehicle()),
    );
  }

  // One best-time row on a light-grey panel: car name (left) + time (right);
  // the just-finished car's time is highlighted.
  resultRow(cx, cy, name, ms, highlight) {
    const w = 480;
    const h = 68;
    this.roundedPanel(cx, cy, w, h, 16);
    this.els.push(
      this.add
        .text(cx - w / 2 + 28, cy, name, { fontFamily: FONT_TITLE, fontSize: '27px', color: '#25344c' })
        .setOrigin(0, 0.5)
        .setResolution(2),
    );
    this.els.push(
      this.add
        .text(cx + w / 2 - 28, cy, formatTime(ms), {
          fontFamily: 'monospace',
          fontSize: '30px',
          color: highlight ? '#1c6bd0' : '#40464f',
        })
        .setOrigin(1, 0.5)
        .setResolution(2),
    );
  }

  goHome() {
    // showTitle() clears the best times; just wipe the names and head back.
    this.managerName = undefined;
    this.clientName = undefined;
    this.clientFood = undefined;
    this.transition(() => this.showTitle()); // back to the landing page
  }

  begin() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.registry.set('managerName', this.managerName);
    this.registry.set('clientName', this.clientName);
    this.registry.set('clientFood', this.clientFood);
    this.registry.set('isICap', this.isICap);
    this.input.keyboard.off('keydown', this.onKey, this);
    const cam = this.cameras.main;
    cam.fadeOut(240, 0, 0, 0); // fade to black into the game
    cam.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  // --- input -----------------------------------------------------------------

  onKey(e) {
    if (this.transitioning) return;
    if (this.state === 'title') {
      if (e.key === 'Enter') this.transition(() => this.askManager());
      return;
    }
    if (this.state === 'unlock') {
      if (e.key === 'Enter') this.begin(); // rusty car only now — straight to driving
      return;
    }
    if (this.state === 'briefIntro') {
      if (e.key === 'Enter') this.transition(() => this.showBriefing());
      return;
    }
    if (this.state === 'brief') {
      if (e.key === 'Enter') this.begin();
      return;
    }
    if (this.state !== 'input') return; // 'car' waits for a click
    if (e.key === 'Enter') {
      if (this.value.trim().length > 0) this.onSubmit(this.value.trim());
      else this.hint.setText('Please enter something').setColor('#ff9a9a');
    } else if (e.key === 'Backspace') {
      this.value = this.value.slice(0, -1);
      this.refreshValue();
    } else if (e.key.length === 1 && this.value.length < 24) {
      this.value += e.key;
      this.refreshValue();
    }
  }
}
