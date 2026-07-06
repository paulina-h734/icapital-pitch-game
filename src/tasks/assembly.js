// ---------------------------------------------------------------------------
// Architect — the assembly stage at the finish. The collected alternatives snap
// into an allocation. Deliberately a reward, not a puzzle you can fumble.
//   OLD car : place each asset into a slot by hand (drag) — takes time.
//   iCapCar : one-click auto-arrange — instant.
// The run timer stops when onComplete() fires (end of architecting, not the
// finish line). Placeholder shapes; the reporting dashboard comes later.
// ---------------------------------------------------------------------------

const SLOT = 78;
const GAP = 96;

export function runAssembly(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  const els = [];
  const inventory = opts.inventory.length ? opts.inventory : ['alt-debris', 'alt-disguise', 'alt-caged'];
  const n = inventory.length;
  const cx = ui.W / 2;
  const slotY = ui.H * 0.3;
  const homeY = ui.H * 0.3 + 150;
  const slots = [];
  let placed = 0;
  let state = 'placing';

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

  function slotX(i) {
    return cx + (i - (n - 1) / 2) * GAP;
  }

  function assetShape(type, x, y) {
    const s = 22;
    let shape;
    if (type === 'alt-debris') shape = ui.add.rectangle(x, y, s * 1.5, s * 1.5, 0xf0932b).setAngle(45);
    else if (type === 'alt-caged') shape = ui.add.triangle(x, y, 0, -s, s, s, -s, s, 0xf0932b);
    else shape = ui.add.circle(x, y, s, 0xf0932b);
    shape.setStrokeStyle(3, 0x1a1a1a).setDepth(52);
    return shape;
  }

  function done() {
    state = 'done';
    ui.showPrompt({
      title: 'Allocation built',
      body: 'The alternatives are assembled into a clean allocation for your client.',
      hint: 'Press Enter to finish',
    });
  }

  function place(token, i) {
    token.setPosition(slotX(i), slotY);
    token.setData('placed', true);
    slots[i].taken = true;
    if (token.disableInteractive) token.disableInteractive();
    placed += 1;
    if (placed >= n) done();
  }

  function onKey(e) {
    if (e.key !== 'Enter') return;
    if (state === 'auto') {
      tokens.forEach((tk, i) => place(tk, i));
    } else if (state === 'done') {
      finish();
    }
  }

  // slots
  for (let i = 0; i < n; i += 1) {
    const slot = ui.add
      .rectangle(slotX(i), slotY, SLOT, SLOT, 0x1d2740)
      .setStrokeStyle(2, 0x46608f)
      .setDepth(51);
    slots.push({ obj: slot, x: slotX(i), y: slotY, taken: false });
    els.push(slot);
  }

  // asset tokens
  const tokens = inventory.map((type, i) => {
    const tok = assetShape(type, slotX(i), homeY);
    els.push(tok);
    return tok;
  });

  if (opts.isICap) {
    state = 'auto';
    ui.showPrompt({
      title: 'Architect · iCapCar',
      body: 'iCapCar snaps every collected alternative into a clean allocation — one click.',
      hint: 'Press Enter to auto-arrange',
    });
  } else {
    // manual: drag each token into any open slot; snap on release, else return.
    tokens.forEach((tok) => {
      tok.setInteractive({ useHandCursor: true });
      ui.input.setDraggable(tok);
      const home = { x: tok.x, y: tok.y };
      tok.on('drag', (p, dx, dy) => tok.setPosition(dx, dy));
      tok.on('dragend', () => {
        if (tok.getData('placed')) return;
        let best = -1;
        let bestD = 60;
        slots.forEach((sl, i) => {
          if (sl.taken) return;
          const d = Math.hypot(tok.x - sl.x, tok.y - sl.y);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        if (best >= 0) place(tok, best);
        else tok.setPosition(home.x, home.y);
      });
    });
    ui.showPrompt({
      title: 'Assemble the allocation',
      body: 'Place each collected alternative into the allocation — by hand.',
      hint: 'Drag the assets into the slots',
    });
  }
  kb.on('keydown', onKey);
}
