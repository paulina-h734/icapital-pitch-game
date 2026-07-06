import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// OpeningScene — the pitch opening, run before GameScene. Sequence:
//   title -> wealth manager's name -> welcome + client's name -> security
//   question (favourite food) -> choose your vehicle -> unlock text -> drive.
// Stores managerName / clientName / clientFood / isICap in the registry, which
// GameScene (and the KYC gates) read. Renders at zoom 1 (screen space).
//   (Avatar "choose your wealth manager" screen -> a name input for now.)
// ---------------------------------------------------------------------------

export default class OpeningScene extends Phaser.Scene {
  constructor() {
    super('Opening');
  }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.els = [];
    this.value = '';
    this.state = 'title';
    this.input.keyboard.on('keydown', this.onKey, this);
    this.showTitle();
  }

  // --- helpers ---------------------------------------------------------------

  clearScreen() {
    this.els.forEach((e) => e.destroy());
    this.els = [];
  }

  label(x, y, str, size, color, extra = {}) {
    const t = this.add
      .text(x, y, str, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, ...extra })
      .setOrigin(0.5)
      .setResolution(2);
    this.els.push(t);
    return t;
  }

  // --- screens ---------------------------------------------------------------

  showTitle() {
    this.state = 'title';
    this.label(this.W / 2, this.H * 0.34, 'iCapital', 46, '#8fd0ff');
    this.label(this.W / 2, this.H * 0.44, 'Drive the Journey', 30, '#eef3ff');
    this.label(this.W / 2, this.H * 0.62, 'Press Enter to begin', 18, '#9fe0b0');
  }

  askInput(state, title, question, onSubmit) {
    this.clearScreen();
    this.state = state;
    this.value = '';
    this.onSubmit = onSubmit;
    this.label(this.W / 2, this.H * 0.32, title, 26, '#8fd0ff');
    this.label(this.W / 2, this.H * 0.42, question, 24, '#eef3ff');
    this.valueText = this.label(this.W / 2, this.H * 0.54, '█', 32, '#ffd27a', {
      fontFamily: 'monospace',
    });
    this.hint = this.label(this.W / 2, this.H * 0.68, 'Type your answer, then press Enter', 15, '#9fb0d0');
  }

  refreshValue() {
    this.valueText.setText(`${this.value}█`);
  }

  askManager() {
    this.askInput('input', 'Wealth manager', "What's your name?", (v) => {
      this.managerName = v;
      this.askClient();
    });
  }

  askClient() {
    this.askInput('input', `Welcome, ${this.managerName}`, "What's your client's name?", (v) => {
      this.clientName = v;
      this.askFood();
    });
  }

  askFood() {
    this.askInput('input', 'Security question', "What's your client's favourite food?", (v) => {
      this.clientFood = v;
      this.chooseVehicle();
    });
  }

  chooseVehicle() {
    this.clearScreen();
    this.state = 'car';
    this.label(this.W / 2, this.H * 0.18, 'Choose your vehicle', 30, '#eef3ff');
    this.carCard(this.W / 2 - 175, 0xb5442f, 'Rusty car', 'Going it alone — every step by hand.', false);
    this.carCard(this.W / 2 + 175, 0x2d6cdf, 'iCapCar', 'On the iCapital platform — it does the work.', true);
  }

  carCard(cx, color, name, sub, isICap) {
    const panel = this.add
      .rectangle(cx, this.H * 0.52, 300, 250, 0x141c30, 0.98)
      .setStrokeStyle(2, 0x46608f)
      .setInteractive({ useHandCursor: true });
    this.els.push(panel);
    this.els.push(this.add.rectangle(cx, this.H * 0.52 - 44, 58, 72, color).setStrokeStyle(3, 0x1a1a1a));
    this.label(cx, this.H * 0.52 + 40, name, 22, '#eef3ff');
    this.label(cx, this.H * 0.52 + 78, sub, 15, '#9fb0d0', { wordWrap: { width: 260 }, align: 'center' });
    panel.on('pointerdown', () => {
      this.isICap = isICap;
      this.showUnlock();
    });
  }

  showUnlock() {
    this.clearScreen();
    this.state = 'unlock';
    const title = this.isICap ? 'iGPS unlocked' : 'Old map unlocked';
    const body = this.isICap
      ? 'iCapCar can unlock special abilities — follow the iGPS to find them all.'
      : 'You have unlocked the old map (very crumpled). You are on your own out there.';
    this.label(this.W / 2, this.H * 0.38, title, 28, this.isICap ? '#7db4ff' : '#f0a08a');
    this.label(this.W / 2, this.H * 0.5, body, 20, '#eef3ff', { wordWrap: { width: 620 }, align: 'center' });
    this.label(this.W / 2, this.H * 0.68, 'Press Enter to drive', 16, '#9fe0b0');
  }

  begin() {
    this.registry.set('managerName', this.managerName);
    this.registry.set('clientName', this.clientName);
    this.registry.set('clientFood', this.clientFood);
    this.registry.set('isICap', this.isICap);
    this.input.keyboard.off('keydown', this.onKey, this);
    this.scene.start('Game');
  }

  // --- input -----------------------------------------------------------------

  onKey(e) {
    if (this.state === 'title') {
      if (e.key === 'Enter') this.askManager();
      return;
    }
    if (this.state === 'unlock') {
      if (e.key === 'Enter') this.begin();
      return;
    }
    if (this.state !== 'input') return; // 'car' waits for a click
    if (e.key === 'Enter') {
      if (this.value.trim().length > 0) this.onSubmit(this.value.trim());
      else this.hint.setText('Please enter something').setColor('#ff9a9a');
    } else if (e.key === 'Backspace') {
      this.value = this.value.slice(0, -1);
      this.refreshValue();
    } else if (e.key.length === 1 && this.value.length < 24) {
      this.value += e.key;
      this.refreshValue();
    }
  }
}
