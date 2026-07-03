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
  let state = opts.isICap ? 'collect' : 'intro';
  let idx = 0;
  let input = '';

  function finish() {
    kb.off('keydown', onKey);
    ui.hidePrompt();
    onComplete();
  }

  function showClue(warn) {
    input = '';
    ui.showPrompt({
      title: `Diligence clue ${idx + 1} of 3`,
      body: `${clues[idx].text} = ?`,
      hint: warn ? "That doesn't reconcile — check it and try again" : 'Type your answer, then press Enter',
      warn: !!warn,
    });
  }

  function showUnlock() {
    ui.showPrompt({
      title: 'Verified',
      body: 'The asset passed diligence and the cage opens. Diligence is what keeps a bad alt out of your client’s book.',
      hint: 'Press E to collect',
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

  if (opts.isICap) {
    ui.showPrompt({
      title: 'iCapCar · diligence',
      body: 'iCapCar ran full diligence on this alternative and cleared the cage automatically.',
      hint: 'Press E to collect',
    });
  } else {
    ui.showPrompt({
      title: 'Diligence cage',
      body: "This alternative is sealed until it's verified — nothing enters your client's book on faith. Crack 3 quick diligence clues to unlock it.",
      hint: 'Press Enter to begin',
    });
  }
  kb.on('keydown', onKey);
}
