import Phaser from 'phaser';
import { formatTime } from '../bestTimes.js';

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
    this.buildTimer();
    this.setInventory(0);
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

  // Final results overlay: this run's time + the persistent best-times table.
  showResults({ ms, isICap, best }, onAgain) {
    const { W, H } = this;
    const els = [];
    const add = (o) => {
      els.push(o.setDepth(60));
      return o;
    };
    add(this.add.rectangle(0, 0, W, H, 0x0b1020, 0.9).setOrigin(0));
    add(
      this.add
        .text(W / 2, H * 0.16, 'Run complete', {
          fontFamily: 'sans-serif',
          fontSize: '30px',
          color: '#eef3ff',
        })
        .setOrigin(0.5)
        .setResolution(2),
    );
    add(
      this.add
        .text(W / 2, H * 0.3, `${isICap ? 'iCapCar' : 'Rusty car'}  ·  ${formatTime(ms)}`, {
          fontFamily: 'monospace',
          fontSize: '40px',
          color: isICap ? '#7db4ff' : '#f0a08a',
        })
        .setOrigin(0.5)
        .setResolution(2),
    );
    // best-times table
    add(
      this.add
        .text(W / 2, H * 0.46, 'BEST TIMES', { fontFamily: 'sans-serif', fontSize: '16px', color: '#9fb0d0' })
        .setOrigin(0.5)
        .setResolution(2),
    );
    const row = (y, label, val, color) => {
      add(this.add.text(W / 2 - 90, y, label, { fontFamily: 'sans-serif', fontSize: '20px', color }).setOrigin(0, 0.5).setResolution(2));
      add(this.add.text(W / 2 + 110, y, formatTime(val), { fontFamily: 'monospace', fontSize: '20px', color }).setOrigin(1, 0.5).setResolution(2));
    };
    row(H * 0.53, 'RUSTY CAR', best.old, '#f0a08a');
    row(H * 0.59, 'iCAPCAR', best.icap, '#7db4ff');
    add(
      this.add
        .text(W / 2, H * 0.72, 'Press Enter to run again', {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#9fe0b0',
        })
        .setOrigin(0.5)
        .setResolution(2),
    );

    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      this.input.keyboard.off('keydown', onKey);
      els.forEach((o) => o.destroy());
      onAgain();
    };
    // Attach a beat later so the Enter that finished assembly doesn't
    // immediately dismiss this screen.
    this.time.delayedCall(400, () => this.input.keyboard.on('keydown', onKey));
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
