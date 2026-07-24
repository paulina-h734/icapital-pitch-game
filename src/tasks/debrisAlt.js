// ---------------------------------------------------------------------------
// Debris-alt task (Research & Diligence). The asset is buried under a pile of
// dirt/garbage — you can't judge what you can't see, so you clear it before it
// enters the book.
//
//   OLD car : click (or press Space) to knock a clump off the pile, one at a
//             time, until the asset is uncovered -> press E.
//   iCapCar : the car's built-in vacuum clears it instantly (handled elsewhere).
// ---------------------------------------------------------------------------

// Pile of dirt/garbage clumps over the asset: [dx, dy, w, h, colour]. Browns are
// dirt; the olive/grey ones read as garbage. Removed one-by-one as you dig.
const CLUMPS = [
  [2, -2, 58, 46, 0x5a3d26],
  [-46, -18, 42, 32, 0x6b4a2f],
  [-14, -30, 40, 32, 0x7a5636],
  [20, -26, 42, 32, 0x5a3d26],
  [48, -6, 36, 30, 0x6b4a2f],
  [-54, 12, 38, 30, 0x5a3d26],
  [-20, 4, 46, 36, 0x7a5636],
  [16, 8, 44, 34, 0x6b4a2f],
  [48, 22, 36, 30, 0x5a3d26],
  [-42, 32, 38, 30, 0x6b6b55],
  [-6, 36, 36, 30, 0x4a4a44],
  [28, 34, 38, 30, 0x7a5636],
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
      const clump = ui.add.ellipse(cx + dx, cy + dy, w, h, color).setStrokeStyle(2, 0x2e1f13);
      clumps.push(clump);
      els.push(clump);
    }
    // One invisible dig zone over the whole pile; each click knocks a clump off.
    zone = ui.add.rectangle(cx, cy, 200, 160, 0xffffff, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', dig);
    els.push(zone);
  }

  function dig() {
    if (clumps.length === 0) return;
    const c = clumps.pop();
    scene.tweens.add({
      targets: c,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 130,
      ease: 'Quad.easeIn',
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
