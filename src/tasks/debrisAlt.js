// ---------------------------------------------------------------------------
// Debris-alt task (Research & Diligence). The asset is buried under debris —
// you can't judge what you can't see, so you clear it before it enters the book.
//
//   OLD car : click the debris repeatedly to brush it off the asset -> press E.
//   iCapCar : the car's built-in vacuum clears it instantly (step 3 stub).
//
// The dirt-covered asset is shown from the first prompt (you interact with the
// asset itself). Placeholder visuals + the removal style (bits one-by-one) come
// at the style stage; the clearing is intentionally counter-less.
// ---------------------------------------------------------------------------

const CLICKS_NEEDED = 12;

export function runDebrisAltTask(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  const els = [];
  let state = opts.isICap ? 'collect' : 'clearing';
  let clicks = 0;
  let dirt = null;

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
    // The asset under the debris is a diamond, matching its map marker.
    const asset = ui.add
      .rectangle(cx, cy, 66, 66, 0xf0932b)
      .setStrokeStyle(3, 0x1a1a1a)
      .setAngle(45);
    els.push(asset);
    if (!opts.isICap) {
      dirt = ui.add
        .rectangle(cx, cy, 150, 120, 0x6b4a2f)
        .setStrokeStyle(3, 0x3f2c1c)
        .setInteractive({ useHandCursor: true });
      dirt.on('pointerdown', onDig);
      els.push(dirt);
    }
  }

  function onDig() {
    clicks += 1;
    dirt.setAlpha(Math.max(0, 1 - clicks / CLICKS_NEEDED));
    if (clicks >= CLICKS_NEEDED) {
      dirt.disableInteractive().setVisible(false);
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
      hint: 'Click the debris to brush it away',
    });
  }
  kb.on('keydown', onKey);
}
