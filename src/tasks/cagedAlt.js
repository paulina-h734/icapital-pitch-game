import { generateClues } from './mathClues.js';

// ---------------------------------------------------------------------------
// Caged-alt task (Research & Diligence). The alternative is sealed in a
// "diligence cage": nothing enters the client's book until it's verified.
//
//   OLD car : solve 3 randomized math "diligence clues" (one at a time, wrong
//             answers are a soft retry) -> cage opens -> press E to collect.
//   iCapCar : the platform's diligence engine clears the cage on entry -> press
//             E to collect. (Wired for step 3; branch stubbed here.)
//
// Driving is already paused by the caller (scene.interacting). We own a keydown
// listener for the duration and call onComplete() when the asset is collected.
// ---------------------------------------------------------------------------

export function runCagedAltTask(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  const clues = generateClues(3);
  const els = [];
  const cageParts = [];
  let state = opts.isICap ? 'collect' : 'intro';
  let idx = 0;
  let input = '';

  const cx = ui.W / 2;
  const cy = ui.H * 0.3;

  // The caged asset is a triangle behind cage bars, shown from the first prompt;
  // the bars fade away when the clues are cracked.
  function build() {
    // The caged asset is its real icon (Real Assets) behind clean steel bars.
    const asset = ui.add.image(cx, cy, 'icon-ra').setDisplaySize(110, 110);
    els.push(asset);
    const STEEL = 0x8892a6;
    const OUTLINE = 0x173453;
    const LW = 3;
    const fullW = 172;
    const barTh = 16;
    const barW = 10;
    const barH = 148;
    const gap = 36;
    const rects = [
      [cx - fullW / 2, cy - 72 - barTh / 2, fullW, barTh], // top rail
      [cx - fullW / 2, cy + 72 - barTh / 2, fullW, barTh], // bottom rail
    ];
    for (let i = -2; i <= 2; i += 1) rects.push([cx + i * gap - barW / 2, cy - barH / 2, barW, barH]);
    // One graphics for the whole cage: an inflated navy silhouette (the outline)
    // with the steel fills on top. The fills cover every joint, so where the bars
    // meet the rails there's no internal border — it reads as one shape.
    const cage = ui.add.graphics();
    cage.fillStyle(OUTLINE, 1);
    rects.forEach(([x, y, w, h]) => cage.fillRect(x - LW, y - LW, w + 2 * LW, h + 2 * LW));
    cage.fillStyle(STEEL, 1);
    rects.forEach(([x, y, w, h]) => cage.fillRect(x, y, w, h));
    cageParts.push(cage);
    els.push(cage);
  }

  // Lift the whole cage up and off the asset, then fade — reads as the cage
  // being pulled open. (Called immediately for iCap; on solve for the old car.)
  function openCage() {
    scene.tweens.add({
      targets: cageParts,
      y: '-=260',
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeIn',
    });
  }

  function finish() {
    kb.off('keydown', onKey);
    els.forEach((e) => e.destroy());
    els.length = 0;
    ui.hidePrompt();
    onComplete();
  }

  function showClue(warn) {
    input = '';
    ui.showPrompt({
      body: `${clues[idx].text} = ?`,
      hint: warn
        ? "That doesn't reconcile, check it and try again"
        : `Clue ${idx + 1} of 3 · type your answer, then press Enter`,
      warn: !!warn,
    });
  }

  function showUnlock() {
    ui.showPrompt({
      body: 'The asset passed diligence and the cage opens.',
      hint: 'Press E to collect real assets',
    });
  }

  function onKey(e) {
    if (state === 'intro') {
      if (e.key === 'Enter') {
        state = 'math';
        showClue(false);
      }
      return;
    }
    if (state === 'math') {
      if (e.key === 'Enter') {
        if (input === '') return;
        if (parseInt(input, 10) === clues[idx].answer) {
          idx += 1;
          if (idx >= clues.length) {
            state = 'collect';
            openCage();
            showUnlock();
          } else {
            showClue(false);
          }
        } else {
          showClue(true);
        }
      } else if (e.key === 'Backspace') {
        input = input.slice(0, -1);
        ui.setInput(input);
      } else if (/^[0-9]$/.test(e.key) && input.length < 4) {
        input += e.key;
        ui.setInput(input);
      }
      return;
    }
    if (state === 'collect' && (e.key === 'e' || e.key === 'E')) {
      finish();
    }
  }

  build();
  if (opts.isICap) {
    openCage();
    ui.showPrompt({
      body: 'iCapCar ran full diligence on this alternative and cleared the cage automatically.',
      hint: 'Press E to collect real assets',
    });
  } else {
    ui.showPrompt({
      body: 'This asset is sealed away until its diligence criteria is met. Crack three quick diligence clues to unlock it.',
      hint: 'Press Enter to begin',
    });
  }
  kb.on('keydown', onKey);
}
