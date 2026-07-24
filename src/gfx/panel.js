// ---------------------------------------------------------------------------
// Shared "cover screen" text-box style — a light-grey bevelled rounded panel:
// drop shadow, dark outline, a light highlight tucked UNDER the outline, and a
// grey face leaving that highlight as a top rim. Used by the opening screens,
// the in-game system prompts, and buttons so everything matches.
//
// Draws around (x, y) as its centre and returns the Graphics so the caller can
// depth/track/scale it.
// ---------------------------------------------------------------------------

export function drawPanel(scene, x, y, w, h, r = 16, base = 0xc6c6c6, shadow = true) {
  const g = scene.add.graphics().setPosition(x, y);
  const hw = w / 2;
  const hh = h / 2;
  const ri = Math.max(2, r - 2);
  if (shadow) {
    g.fillStyle(0x0a1428, 0.4);
    g.fillRoundedRect(-hw, -hh + 6, w, h, r); // drop shadow
  }
  g.fillStyle(0x565656, 1);
  g.fillRoundedRect(-hw, -hh, w, h, r); // dark outline
  g.fillStyle(0xeef0f2, 1);
  g.fillRoundedRect(-hw + 3, -hh + 3, w - 6, h - 6, ri); // light highlight, under the outline
  g.fillStyle(base, 1);
  g.fillRoundedRect(-hw + 3, -hh + 9, w - 6, h - 12, ri); // grey face, leaving a top highlight rim
  return g;
}
