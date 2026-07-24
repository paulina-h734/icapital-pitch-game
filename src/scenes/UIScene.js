import Phaser from 'phaser';
import { formatTime } from '../bestTimes.js';
import { FONT_BODY, FONT_TITLE } from '../config.js';
import { ASSETS } from '../gfx/placeholders.js';

// ---------------------------------------------------------------------------
// UIScene — runs in parallel above GameScene at zoom 1, so HUD/prompts render
// crisp in screen space (unaffected by the world camera's zoom). Two pieces:
//   • an asset inventory HUD (top-left)
//   • a lower-third system prompt panel that pauses gameplay (driven by tasks)
// It's a dumb renderer; task controllers call showPrompt/setInput/hidePrompt.
// ---------------------------------------------------------------------------

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.buildInventory();
    this.buildPrompt();
    this.buildTimer();
    this.hidePrompt();
  }

  // --- run timer (top centre) ------------------------------------------------

  buildTimer() {
    this.timerText = this.add
      .text(this.W / 2, 18, '0:00.0', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#eef3ff',
      })
      .setOrigin(0.5, 0)
      .setResolution(2)
      .setDepth(40)
      .setVisible(false);
  }

  setTimer(ms) {
    if (!this.timerText) return;
    this.timerText.setText(formatTime(ms)).setVisible(true);
  }

  hideTimer() {
    this.timerText.setVisible(false);
  }

  // The finish payoff (consolidated report + best-times) now lives in
  // src/tasks/report.js (runReport), drawn on this scene's screen-space canvas.

  // --- inventory HUD ---------------------------------------------------------

  // Bottom-right "portfolio" HUD styled like a scaled-down Minecraft inventory:
  // a light-grey panel with beveled dark-grey slots. One fixed slot per
  // alternative (PE / PC / RA); each shows a grey silhouette until collected,
  // then the real coloured icon pops in.
  buildInventory() {
    const size = 62;
    const gap = 8;
    const pad = 12;
    const titleH = 26;
    const n = ASSETS.length;
    const panelW = n * size + (n - 1) * gap + pad * 2;
    const panelH = titleH + size + pad * 2;
    const ox = 14; // bottom-left
    const oy = this.H - panelH - 14;
    const D = 20;

    const els = [];
    // Panel: light grey with an outset bevel (light top-left, dark bottom-right).
    this.bevel(els, ox, oy, panelW, panelH, 0xc6c6c6, 0xefefef, 0x555555, 3, D);
    els.push(
      this.add
        .text(ox + pad, oy + pad - 1, 'PORTFOLIO', {
          fontFamily: FONT_TITLE,
          fontSize: '17px',
          color: '#222222',
        })
        .setResolution(2)
        .setDepth(D + 3),
    );

    this.invSlots = [];
    const slotY = oy + pad + titleH;
    ASSETS.forEach((a, i) => {
      const sx = ox + pad + i * (size + gap);
      // Slot: dark grey with an inset bevel (dark top-left, light bottom-right).
      this.bevel(els, sx, slotY, size, size, 0x8b8b8b, 0x373737, 0xdcdcdc, 3, D + 1);
      const icon = this.add
        .image(sx + size / 2, slotY + size / 2, a.icon)
        .setDisplaySize(size * 0.72, size * 0.72)
        .setTintFill(0x6a6a6a) // grey silhouette until collected
        .setDepth(D + 2);
      els.push(icon);
      this.invSlots.push({ icon, alt: a.alt, filled: false });
    });
    // Tracked so the HUD can hide while a system prompt is up.
    this.invEls = els;
  }

  // A beveled rectangle: base fill + a light top/left edge and dark bottom/right
  // edge (or vice-versa) for the raised/inset look. Pushes all rects into `els`.
  bevel(els, x, y, w, h, base, tl, br, t, depth) {
    const add = (rx, ry, rw, rh, color) =>
      els.push(this.add.rectangle(rx, ry, rw, rh, color).setOrigin(0, 0).setDepth(depth));
    add(x, y, w, h, base);
    add(x, y, w, t, tl); // top
    add(x, y, t, h, tl); // left
    add(x, y + h - t, w, t, br); // bottom
    add(x + w - t, y, t, h, br); // right
  }

  // Light up the collected alternative's slot: grey silhouette -> real icon.
  addAsset(altType) {
    const slot = this.invSlots.find((s) => s.alt === altType);
    if (!slot || slot.filled) return;
    slot.filled = true;
    slot.icon.clearTint();
    this.tweens.add({
      targets: slot.icon,
      scale: { from: slot.icon.scale * 1.4, to: slot.icon.scale },
      duration: 280,
      ease: 'Back.out',
    });
  }

  setInventoryVisible(on) {
    this.invEls.forEach((el) => el.setVisible(on));
  }

  // --- system prompt (lower third) ------------------------------------------

  buildPrompt() {
    const pad = 30;
    const px = 60;
    const ph = 240;
    const py = this.H - ph - 44;
    const pw = this.W - px * 2;

    // Dim sits below the task graphics (default depth 0) but above the world.
    this.dim = this.add.rectangle(0, 0, this.W, this.H, 0x0b1020, 0.5).setOrigin(0).setDepth(-1);
    // Light-grey Minecraft-style panel with a raised bevel.
    const panelEls = [];
    this.bevel(panelEls, px, py, pw, ph, 0xc6c6c6, 0xefefef, 0x565656, 4, 30);
    this.pTitle = this.add
      .text(px + pad, py + 20, '', { fontFamily: FONT_TITLE, fontSize: '22px', color: '#222222' })
      .setResolution(2)
      .setDepth(31);
    this.pBody = this.add
      .text(px + pad, py + 60, '', {
        fontFamily: FONT_BODY,
        fontSize: '20px',
        color: '#373737',
        wordWrap: { width: pw - pad * 2 },
        lineSpacing: 5,
      })
      .setResolution(2)
      .setDepth(31);
    this.pInput = this.add
      .text(px + pad, py + 150, '', { fontFamily: 'monospace', fontSize: '30px', color: '#20406e' })
      .setResolution(2)
      .setDepth(31);
    this.pHint = this.add
      .text(px + pad, py + ph - 34, '', { fontFamily: FONT_BODY, fontSize: '15px', color: '#2e6d3a' })
      .setResolution(2)
      .setDepth(31);

    this.promptEls = [this.dim, ...panelEls, this.pTitle, this.pBody, this.pInput, this.pHint];
  }

  showPrompt({ title = '', body = '', input = '', hint = '', warn = false }) {
    this.pTitle.setText(title);
    this.pBody.setText(body);
    this.setInput(input);
    this.pHint.setText(hint).setColor(warn ? '#a33a3a' : '#2e6d3a');
    this.promptEls.forEach((el) => el.setVisible(true));
    this.setInventoryVisible(false); // tracker hides while a prompt is up
  }

  setInput(input) {
    this.pInput.setText(input ? `> ${input}` : '');
  }

  hidePrompt() {
    this.promptEls.forEach((el) => el.setVisible(false));
    this.setInventoryVisible(true);
  }
}
