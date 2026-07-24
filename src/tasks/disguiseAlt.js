// ---------------------------------------------------------------------------
// Disguise-alt task (Research & Diligence). Something about this asset looks
// off — you inspect it closely before trusting it, and find it's harmless.
//
//   OLD car : drag BOTH pieces of the disguise (hat + moustache) off the asset
//             -> press E to collect. Dragged-off pieces stay on screen for the
//             rest of the prompt.
//   iCapCar : the scanner auto-inspects on entry (step 3 stub).
//
// The disguised asset is shown from the first prompt (you interact with the
// asset itself). Placeholder visuals + a reveal animation come at the style
// stage. GameScene also fades the disguise off the map marker on collect.
// ---------------------------------------------------------------------------

const PULL_OFF_DIST = 60; // px a piece must be dragged (from its own spot) to come free

export function runDisguiseAltTask(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  const els = [];
  let state = opts.isICap ? 'collect' : 'inspect';
  let removed = 0;
  const needed = 2;

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

  function makeDraggable(obj) {
    // Measure the pull from the piece's OWN resting spot (not the asset centre),
    // so each piece detaches after the same short drag regardless of where it sits.
    const startX = obj.x;
    const startY = obj.y;
    obj.setInteractive({ useHandCursor: true });
    ui.input.setDraggable(obj);
    obj.on('drag', (pointer, dragX, dragY) => obj.setPosition(dragX, dragY));
    obj.on('dragend', () => {
      if (obj.getData('off')) return;
      if (Math.hypot(obj.x - startX, obj.y - startY) > PULL_OFF_DIST) {
        obj.setData('off', true);
        obj.disableInteractive(); // pulled free; it stays where it was dropped
        removed += 1;
        if (removed >= needed) {
          state = 'collect';
          showCollect();
        }
      }
    });
    els.push(obj);
  }

  function build() {
    // The disguised asset is its real icon (Private Credit) wearing the hat +
    // moustache you drag off.
    const asset = ui.add.image(cx, cy, 'icon-pc').setDisplaySize(120, 120);
    els.push(asset);
    if (!opts.isICap) {
      const hat = ui.add.image(cx, cy - 54, 'icon-hat').setDisplaySize(108, 72);
      const moustache = ui.add.image(cx, cy + 24, 'icon-mustache').setDisplaySize(92, 50);
      makeDraggable(hat);
      makeDraggable(moustache);
    }
  }

  function showCollect() {
    ui.showPrompt({
      title: 'Inspected',
      body: "Up close it's harmless — the disguise was hiding nothing untoward. Now you actually know, instead of guessing.",
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
      body: "iCapCar's scanner inspected the asset automatically — the disguise hid nothing.",
      hint: 'Press E to collect',
    });
  } else {
    ui.showPrompt({
      title: 'Disguise',
      body: "Something about this asset looks off. Inspect it closely before you trust it — pull the disguise off.",
      hint: 'Drag the hat and the moustache off the asset',
    });
  }
  kb.on('keydown', onKey);
}
