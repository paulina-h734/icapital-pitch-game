import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// UIScene — runs in parallel above GameScene at zoom 1, so HUD/prompts render
// crisp in screen space (unaffected by the world camera's zoom). Two pieces:
//   • an asset inventory HUD (top-left)
//   • a lower-third system prompt panel that pauses gameplay (driven by tasks)
// It's a dumb renderer; task controllers call showPrompt/setInput/hidePrompt.
// ---------------------------------------------------------------------------

const TOTAL_ALTS = 3;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.buildInventory();
    this.buildPrompt();
    this.setInventory(0);
    this.hidePrompt();
  }

  // --- inventory HUD ---------------------------------------------------------

  buildInventory() {
    const x = 24;
    const slotY = this.H - 44; // bottom-left
    const label = this.add
      .text(x, slotY - 22, 'ASSETS', { fontFamily: 'sans-serif', fontSize: '15px', color: '#cfe0ff' })
      .setResolution(2);
    this.invSlots = [];
    for (let i = 0; i < TOTAL_ALTS; i++) {
      const slot = this.add
        .rectangle(x + i * 34, slotY, 28, 28, 0x1d2740)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3a4a68);
      this.invSlots.push(slot);
    }
    this.invCount = this.add
      .text(x + TOTAL_ALTS * 34 + 8, slotY + 6, `0 / ${TOTAL_ALTS}`, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#9fb0d0',
      })
      .setResolution(2);
    // Tracked so the tracker can hide while a system prompt is up.
    this.invEls = [label, ...this.invSlots, this.invCount];
  }

  setInventory(count) {
    this.invSlots.forEach((slot, i) => slot.setFillStyle(i < count ? 0xf0932b : 0x1d2740));
    if (this.invCount) this.invCount.setText(`${count} / ${TOTAL_ALTS}`);
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

    this.dim = this.add.rectangle(0, 0, this.W, this.H, 0x0b1020, 0.5).setOrigin(0);
    this.panel = this.add
      .rectangle(px, py, pw, ph, 0x141c30, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, 0x46608f);
    this.pTitle = this.add
      .text(px + pad, py + 22, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#8fd0ff' })
      .setResolution(2);
    this.pBody = this.add
      .text(px + pad, py + 58, '', {
        fontFamily: 'sans-serif',
        fontSize: '21px',
        color: '#eef3ff',
        wordWrap: { width: pw - pad * 2 },
        lineSpacing: 5,
      })
      .setResolution(2);
    this.pInput = this.add
      .text(px + pad, py + 150, '', { fontFamily: 'monospace', fontSize: '30px', color: '#ffd27a' })
      .setResolution(2);
    this.pHint = this.add
      .text(px + pad, py + ph - 34, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#9fe0b0' })
      .setResolution(2);

    this.promptEls = [this.dim, this.panel, this.pTitle, this.pBody, this.pInput, this.pHint];
  }

  showPrompt({ title = '', body = '', input = '', hint = '', warn = false }) {
    this.pTitle.setText(title);
    this.pBody.setText(body);
    this.setInput(input);
    this.pHint.setText(hint).setColor(warn ? '#ff9a9a' : '#9fe0b0');
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
