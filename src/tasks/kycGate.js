// ---------------------------------------------------------------------------
// KYC Customs gate (Identity Solutions). A barrier across the road that only
// opens once the client's identity is confirmed. Requires all 3 alternatives
// collected first (you can't clear a client mid-diligence).
//
//   OLD car : re-enter the client's name, then their favourite food. A wrong
//             answer is a SOFT instant retry — never a dead-end.
//   iCapCar : Identity Solutions auto-verifies on arrival (step 3 stub).
//
// onComplete(passed): true opens the gate; false leaves it shut (e.g. you still
// owe diligence) so the player turns back.
// ---------------------------------------------------------------------------

export function runKycGate(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;
  let state;
  let input = '';

  function finish(passed) {
    kb.off('keydown', onKey);
    ui.hidePrompt();
    onComplete(passed);
  }

  const norm = (s) => s.trim().toLowerCase();

  function askName(warn) {
    state = 'name';
    ui.showPrompt({
      title: 'Security checkpoint',
      body: "Identity check — verify your client's name.",
      input,
      hint: warn ? "That doesn't match — try again" : 'Type the name, then press Enter',
      warn: !!warn,
    });
  }

  function askFood(warn) {
    state = 'food';
    input = '';
    ui.showPrompt({
      title: 'Security checkpoint',
      body: "Second factor — verify your client's favourite food.",
      input,
      hint: warn ? "That doesn't match — try again" : 'Type the answer, then press Enter',
      warn: !!warn,
    });
  }

  function success() {
    state = 'success';
    ui.showPrompt({
      title: 'Identity verified',
      body: `Welcome, ${opts.clientName}. Identity Solutions confirmed your client — the gate is open.`,
      hint: 'Press Enter to proceed',
    });
  }

  function onKey(e) {
    if (state === 'blocked' || state === 'success' || state === 'icap') {
      if (e.key === 'Enter') finish(state !== 'blocked');
      return;
    }
    // name / food entry
    if (e.key === 'Enter') {
      if (input.trim() === '') return;
      const expected = state === 'name' ? opts.clientName : opts.clientFood;
      if (norm(input) === norm(expected)) {
        if (state === 'name') {
          input = '';
          askFood(false);
        } else {
          success();
        }
      } else {
        input = '';
        if (state === 'name') askName(true);
        else askFood(true);
      }
    } else if (e.key === 'Backspace') {
      input = input.slice(0, -1);
      ui.setInput(input);
    } else if (e.key.length === 1 && input.length < 24) {
      input += e.key;
      ui.setInput(input);
    }
  }

  if (!opts.allCollected) {
    state = 'blocked';
    ui.showPrompt({
      title: 'KYC customs',
      body: `Customs can't clear this client yet — you've verified ${opts.collectedCount} of 3 alternatives. Finish your diligence, then come back.`,
      hint: 'Press Enter to turn back',
    });
  } else if (opts.isICap) {
    state = 'icap';
    ui.showPrompt({
      title: 'iCapCar · Identity Solutions',
      body: `Identity Solutions verified ${opts.clientName} automatically. Welcome — have a nice day, ${opts.clientName}.`,
      hint: 'Press Enter to continue',
    });
  } else {
    askName(false);
  }
  kb.on('keydown', onKey);
}
