// ---------------------------------------------------------------------------
// Debris-alt task (Research & Diligence). The asset is buried under a pile of
// dirt/garbage — you can't judge what you can't see, so you clear it before it
// enters the book.
//
//   OLD car : click (or press Space) to knock a clump off the pile, one at a
//             time, until the asset is uncovered -> press E.
//   iCapCar : the car's built-in vacuum clears it instantly (handled elsewhere).
// ---------------------------------------------------------------------------

// Pile of dirt clumps over the asset: [dx, dy, w, h, colour] — all browns, drawn
// as chunky, thick-outlined organic blobs and removed one-by-one as you dig.
const CLUMPS = [
  [2, -2, 62, 50, 0x8a6540],
  [-46, -18, 46, 36, 0x6b4a2f],
  [-14, -30, 44, 36, 0x9a744a],
  [20, -26, 46, 36, 0x7d5638],
  [48, -6, 40, 34, 0x6b4a2f],
  [-54, 12, 42, 34, 0x8a6540],
  [-20, 4, 50, 40, 0x7d5638],
  [16, 8, 48, 38, 0x9a744a],
  [48, 22, 40, 34, 0x6b4a2f],
  [-42, 32, 42, 34, 0x7d5638],
  [-6, 36, 40, 34, 0x8a6540],
  [28, 34, 42, 34, 0x6b4a2f],
];

export function runDebrisAltTask(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  const els = [];
  const clumps = [];
  let state = opts.isICap ? 'collect' : 'clearing';
  let zone = null;

  const cx = ui.W / 2;
  const cy = ui.H * 0.32;

  function cleanup() {
    kb.off('keydown', onKey);
    els.forEach((e) => e.destroy());
    els.length = 0;
    ui.hidePrompt();
  }

  function finish() {
    cleanup();
    onComplete();
  }

  function build() {
    // The asset under the pile is its real icon (Private Equity).
    els.push(ui.add.image(cx, cy, 'icon-pe').setDisplaySize(112, 112));
    if (opts.isICap) return;
    for (const [dx, dy, w, h, color] of CLUMPS) {
      clumps.push(makeBlob(cx + dx, cy + dy, w, h, color));
    }
    // One invisible dig zone over the whole pile; each click knocks a clump off.
    zone = ui.add.rectangle(cx, cy, 200, 160, 0xffffff, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', dig);
    els.push(zone);
  }

  // An organic lumpy blob (jittered polygon) so each clump looks like a random
  // chunk of dirt rather than a uniform ellipse. Centred on its own position so
  // it can scale/spin away when dug.
  function makeBlob(x, y, w, h, color) {
    const g = ui.add.graphics().setPosition(x, y);
    g.fillStyle(color, 1);
    g.lineStyle(4, 0x241810, 1);
    g.beginPath();
    const n = 10;
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      const ang = base + (i / n) * Math.PI * 2;
      const jr = 0.66 + Math.random() * 0.36;
      const px = Math.cos(ang) * (w / 2) * jr;
      const py = Math.sin(ang) * (h / 2) * jr;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
    els.push(g);
    return g;
  }

  function dig() {
    if (clumps.length === 0) return;
    const c = clumps.pop();
    // Cartoony "poof": a little overshoot, a hop up, then collapse and fade.
    scene.tweens.add({
      targets: c,
      scale: 0,
      y: c.y - 14,
      angle: c.x < cx ? -35 : 35,
      alpha: 0,
      duration: 180,
      ease: 'Back.easeIn',
      onComplete: () => c.destroy(),
    });
    if (clumps.length === 0) {
      if (zone) zone.disableInteractive();
      state = 'collect';
      showCollect();
    }
  }

  function showCollect() {
    ui.showPrompt({
      title: 'Inspected',
      body: 'The asset checks out under all that debris — nothing hidden. Clearing it is how you know.',
      hint: 'Press E to collect',
    });
  }

  function onKey(e) {
    if (state === 'clearing' && (e.key === ' ' || e.code === 'Space')) {
      e.preventDefault?.();
      dig();
      return;
    }
    if (state === 'collect' && (e.key === 'e' || e.key === 'E')) finish();
  }

  build();
  if (opts.isICap) {
    ui.showPrompt({
      title: 'iCapCar · diligence',
      body: "iCapCar's built-in vacuum cleared the debris and inspected the asset automatically.",
      hint: 'Press E to collect',
    });
  } else {
    ui.showPrompt({
      title: 'Debris',
      body: "This asset is buried under debris — you can't judge what you can't see. Clear it before it enters your client's book.",
      hint: 'Click or press Space to clear the pile',
    });
  }
  kb.on('keydown', onKey);
}
