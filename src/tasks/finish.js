// ---------------------------------------------------------------------------
// Placeholder finish. Reaching the finish after KYC 2 ends the run. The real
// finish — portfolio assembly (Architect) + the reporting dashboard, and the
// persistent best-times table — comes in the deferred stages.
// ---------------------------------------------------------------------------

export function runFinish(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;

  function done() {
    kb.off('keydown', onKey);
    ui.hidePrompt();
    onComplete();
  }

  function onKey(e) {
    if (e.key === 'Enter') done();
  }

  ui.showPrompt({
    title: 'Finish',
    body: "You delivered your client into alternatives — start to finish. (Placeholder finish: portfolio assembly, the reporting dashboard and the run timer come next.)",
    hint: 'Press Enter',
  });
  kb.on('keydown', onKey);
}
