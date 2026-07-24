import Phaser from 'phaser';
import { formatTime } from '../bestTimes.js';
import { FONT_BODY, FONT_TITLE } from '../config.js';
import { ASSETS } from '../gfx/placeholders.js';
import { drawPanel } from '../gfx/panel.js';

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
    this.buildDarkness();
    this.buildInventory();
    this.buildPrompt();
    this.buildTimer();
    this.hidePrompt();
  }

  // A full-screen dim that sits above the game world but below the HUD, driven by
  // GameScene when the car enters a painted shade zone.
  buildDarkness() {
    // Opaque fill, but the object alpha starts at 0 (setDarkness drives it).
    this.darkness = this.add
      .rectangle(0, 0, this.W, this.H, 0x080b16)
      .setOrigin(0)
      .setDepth(5)
      .setAlpha(0);
  }

  setDarkness(a) {
    if (this.darkness) this.darkness.setAlpha(a);
  }

  // --- run timer (top centre) ------------------------------------------------

  buildTimer() {
    this.timerBox = this.add
      .image(this.W / 2, 0, 'timer-box')
      .setOrigin(0.5, 0)
      .setDepth(40)
      .setVisible(false);
    this.timerText = this.add
      .text(this.W / 2, 29, '0:00.0', {
        fontFamily: 'monospace',
        fontSize: '34px',
        color: '#222222',
      })
      .setOrigin(0.5, 0.5)
      .setResolution(2)
      .setDepth(41)
      .setVisible(false);
  }

  setTimer(ms) {
    if (!this.timerText) return;
    this.timerText.setText(formatTime(ms)).setVisible(true);
    this.timerBox.setVisible(true);
  }

  hideTimer() {
    this.timerText.setVisible(false);
    this.timerBox.setVisible(false);
  }

  // The finish payoff (consolidated report + best-times) now lives in
  // src/tasks/report.js (runReport), drawn on this scene's screen-space canvas.

  // --- inventory HUD ---------------------------------------------------------

  // Bottom-left "portfolio" HUD in the same cover-screen text-box style: a
  // rounded light-grey panel with rounded, recessed slots. One fixed slot per
  // alternative (PE / PC / RA); each shows a grey silhouette until collected,
  // then the real coloured icon pops in.
  buildInventory() {
    const size = 64;
    const gap = 10;
    const pad = 14;
    const titleH = 30;
    const n = ASSETS.length;
    const panelW = n * size + (n - 1) * gap + pad * 2;
    const panelH = titleH + size + pad * 2;
    const ox = 14; // bottom-left
    const oy = this.H - panelH - 14;
    const D = 20;

    const els = [];
    // Periphery: the rounded cover-screen panel (shadow, dark outline, light
    // highlight tucked under it, grey face).
    els.push(drawPanel(this, ox + panelW / 2, oy + panelH / 2, panelW, panelH, 16).setDepth(D));
    els.push(
      this.add
        .text(ox + pad, oy + pad - 2, 'PORTFOLIO', {
          fontFamily: FONT_TITLE,
          fontSize: '18px',
          color: '#25344c',
        })
        .setResolution(2)
        .setDepth(D + 3),
    );

    this.invSlots = [];
    const slotY = oy + pad + titleH;
    ASSETS.forEach((a, i) => {
      const sx = ox + pad + i * (size + gap);
      // Slot: a rounded, recessed socket in the same palette — dark outline,
      // grey face, dark inner shadow at the top and a light rim at the bottom.
      const r = 12;
      const sg = this.add.graphics().setDepth(D + 1);
      sg.fillStyle(0x565656, 1);
      sg.fillRoundedRect(sx, slotY, size, size, r); // dark outline
      sg.fillStyle(0x8f8f8f, 1);
      sg.fillRoundedRect(sx + 3, slotY + 3, size - 6, size - 6, r - 2); // grey face
      // Inner shadow/highlight kept on the flat top/bottom edges (inset by the
      // corner radius) so they don't poke past the rounded corners.
      sg.fillStyle(0x6d6d6d, 1);
      sg.fillRect(sx + 3 + r, slotY + 4, size - 6 - 2 * r, 3); // top inner shadow
      sg.fillStyle(0xb4b4b4, 1);
      sg.fillRect(sx + 3 + r, slotY + size - 7, size - 6 - 2 * r, 3); // bottom inner highlight
      els.push(sg);
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
    const pad = 34;
    const px = 60;
    const ph = 198;
    const py = this.H - ph - 44;
    const pw = this.W - px * 2;

    // Dim sits below the task graphics (default depth 0) but above the world.
    this.dim = this.add.rectangle(0, 0, this.W, this.H, 0x0b1020, 0.5).setOrigin(0).setDepth(-1);
    // Light-grey rounded panel — the same "cover screen" text-box style. No
    // header now (the tasks dropped their titles), so the body starts near the top.
    const panel = drawPanel(this, px + pw / 2, py + ph / 2, pw, ph, 24).setDepth(30);
    this.pBody = this.add
      .text(px + pad, py + 24, '', {
        fontFamily: FONT_BODY,
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#242424',
        wordWrap: { width: pw - pad * 2 },
        lineSpacing: 6,
      })
      .setResolution(2)
      .setDepth(31);
    this.pInput = this.add
      .text(px + pad, py + 108, '', { fontFamily: 'monospace', fontSize: '34px', color: '#20406e' })
      .setResolution(2)
      .setDepth(31);
    this.pHint = this.add
      .text(px + pad, py + ph - 42, '', {
        fontFamily: FONT_BODY,
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#2e6d3a',
      })
      .setResolution(2)
      .setDepth(31);

    this.promptEls = [this.dim, panel, this.pBody, this.pInput, this.pHint];
  }

  showPrompt({ body = '', input = '', hint = '', warn = false }) {
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
