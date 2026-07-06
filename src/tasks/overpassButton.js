// ---------------------------------------------------------------------------
// Document Center — the "activate overpass" button at the forest entrance.
// Same button for both cars:
//   OLD car : nothing happens — the overpass stays a rumour. You take the
//             document forest the hard way.
//   iCapCar : the platform recognises the car and materialises a concrete
//             overpass (speed boost) over the subscription forest. The actual
//             overpass road + boost are built in step 3; message stubbed here.
// Re-pressable (rising-edge triggered by the caller); just dismiss with Enter.
// ---------------------------------------------------------------------------

export function runOverpassButton(scene, ui, opts, onComplete) {
  const kb = scene.input.keyboard;

  function done() {
    kb.off('keydown', onKey);
    ui.hidePrompt();
    onComplete(!!opts.isICap); // materialised only on the iCapCar
  }

  function onKey(e) {
    if (e.key === 'Enter') done();
  }

  if (opts.isICap) {
    ui.showPrompt({
      title: 'Overpass · iCapCar recognised',
      body: 'Materialising the document overpass — a concrete road straight over the subscription forest. Follow it through.',
      hint: 'Press Enter',
    });
  } else {
    ui.showPrompt({
      title: 'Activate overpass',
      body: "You press the button. Nothing happens — the overpass stays a rumour. Maybe it's broken. Looks like it's the document forest the hard way.",
      hint: 'Press Enter',
    });
  }
  kb.on('keydown', onKey);
}
