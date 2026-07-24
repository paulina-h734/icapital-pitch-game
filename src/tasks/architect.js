import Phaser from 'phaser';
import { FONT_TITLE, FONT_BODY } from '../config.js';

// ---------------------------------------------------------------------------
// Architect the allocation — runs at the START of a run (after car select,
// before driving). The client already holds a traditional Stocks + Bonds core;
// the advisor completes the portfolio by adding the 3 alternatives — which are
// exactly the 3 alts you then go source on the drive.
//
//   Rusty car : drag each alternative piece into its slice of the pie (a gentle,
//               labelled, snap-on-close task — slow but hard to fumble).
//   iCapCar   : one "Build with iCapital" button auto-allocates the model.
//
// Drawn in screen space on the UIScene (over the world). onComplete() lets the
// GameScene begin driving. The run clock is already ticking (GameScene starts it
// as this opens), so the manual architect costs the rusty car time.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;

// Target allocation. Core (Stocks/Bonds) is pre-placed; the 3 alts start empty.
const SEGMENTS = [
  { key: 'stocks', label: 'Stocks', pct: 40, color: 0x3f5c86, alt: false },
  { key: 'bonds', label: 'Bonds', pct: 25, color: 0x51748f, alt: false },
  { key: 'pe', label: 'Private Equity', short: 'PE', pct: 12, color: 0x7db4ff, alt: true },
  { key: 'pc', label: 'Private Credit', short: 'PC', pct: 12, color: 0x8fd0a0, alt: true },
  { key: 'ra', label: 'Real Assets', short: 'RA', pct: 11, color: 0xf0b46a, alt: true },
];

export function runArchitect(scene, ui, opts, onComplete) {
  const W = ui.scale.width;
  const H = ui.scale.height;
  const cx = W / 2;
  const cy = H * 0.46;
  const R = 150;
  const r = 84;
  const isICap = !!opts.isICap;
  const client = opts.clientName || 'your client';

  const els = [];
  const keep = (o) => {
    els.push(o);
    return o;
  };
  const label = (x, y, str, size, color, extra = {}) =>
    keep(
      ui.add
        .text(x, y, str, { fontFamily: FONT_BODY, fontSize: `${size}px`, color, ...extra })
        .setOrigin(0.5)
        .setResolution(2)
        .setDepth(62),
    );

  // Lay out each segment's arc + label/socket positions.
  const segs = SEGMENTS.map((s) => ({ ...s, span: (s.pct / 100) * TAU, filled: !s.alt }));
  let a = TOP;
  for (const s of segs) {
    s.a0 = a;
    s.a1 = a + s.span;
    s.mid = a + s.span / 2;
    a = s.a1;
    const midR = (R + r) / 2;
    s.sx = cx + Math.cos(s.mid) * midR;
    s.sy = cy + Math.sin(s.mid) * midR;
    s.lx = cx + Math.cos(s.mid) * (R + 46);
    s.ly = cy + Math.sin(s.mid) * (R + 46);
  }

  keep(ui.add.rectangle(0, 0, W, H, 0x0b1020, 0.93).setOrigin(0).setDepth(60));
  const pie = keep(ui.add.graphics().setDepth(61));

  const drawPie = () => {
    pie.clear();
    for (const s of segs) {
      pie.beginPath();
      pie.arc(cx, cy, R, s.a0, s.a1, false);
      pie.arc(cx, cy, r, s.a1, s.a0, true);
      pie.closePath();
      pie.fillStyle(s.filled ? s.color : 0x161d30, 1);
      pie.fillPath();
      pie.lineStyle(2, 0x0b1020, 1);
      pie.strokePath();
    }
  };
  drawPie();

  // Title + hole label.
  label(cx, H * 0.13, 'Architect the allocation', 30, '#8fd0ff', { fontFamily: FONT_TITLE });
  label(cx, H * 0.19, `Complete ${client}'s portfolio — add the 3 alternatives.`, 18, '#eef3ff');
  label(cx, cy, client, 17, '#cfe0ff', { wordWrap: { width: r * 1.6 }, align: 'center' });

  // Radial segment labels; alt labels start dim and brighten when filled.
  for (const s of segs) {
    s.text = label(s.lx, s.ly, `${s.label}\n${s.pct}%`, 14, s.alt ? '#7f8db0' : '#dfe7f5', {
      align: 'center',
    });
  }

  // Empty alt slots: a ring with the alternative's icon, ghosted until filled.
  for (const s of segs) {
    if (!s.alt) continue;
    s.ring = keep(ui.add.circle(s.sx, s.sy, 24).setStrokeStyle(2, 0xffffff, 0.5).setDepth(62));
    s.iconImg = keep(
      ui.add
        .image(s.sx, s.sy, `icon-${s.key}`)
        .setDisplaySize(30, 30)
        .setTintFill(0xaab6d0)
        .setAlpha(0.55)
        .setDepth(63),
    );
  }

  const prompt = label(cx, H * 0.9, '', 16, '#9fe0b0');
  let complete = false;

  const fillSeg = (s) => {
    if (s.filled) return;
    s.filled = true;
    drawPie();
    s.text.setColor('#eef3ff');
    if (s.ring) s.ring.destroy();
    if (s.iconImg) {
      s.iconImg.clearTint().setAlpha(1); // grey ghost -> real coloured icon
      scene.tweens.add({
        targets: s.iconImg,
        scale: { from: s.iconImg.scale * 1.35, to: s.iconImg.scale },
        duration: 240,
        ease: 'Back.out',
      });
    }
    if (segs.every((x) => x.filled) && !complete) {
      complete = true;
      prompt.setText('Allocation complete — press Enter to drive').setColor('#9fe0b0');
    }
  };

  // --- cleanup / finish ------------------------------------------------------
  const onEnter = (e) => {
    if (e.key !== 'Enter' || !complete) return;
    ui.input.keyboard.off('keydown', onEnter);
    ui.input.off('drag', onDrag);
    ui.input.off('dragend', onDragEnd);
    els.forEach((o) => o && o.scene && o.destroy());
    tokens.forEach((t) => t && t.scene && t.destroy());
    onComplete();
  };

  // --- rusty: draggable tokens ---------------------------------------------
  const tokens = [];
  function onDrag(pointer, obj, dragX, dragY) {
    obj.setPosition(dragX, dragY);
  }
  function onDragEnd(pointer, obj) {
    const target = segs.find((s) => s.key === obj.getData('key'));
    const home = obj.getData('home');
    if (target && !target.filled && Phaser.Math.Distance.Between(obj.x, obj.y, target.sx, target.sy) < 115) {
      fillSeg(target);
      obj.destroy();
      tokens.splice(tokens.indexOf(obj), 1);
    } else {
      scene.tweens.add({ targets: obj, x: home.x, y: home.y, duration: 160, ease: 'Back.out' });
    }
  }

  if (isICap) {
    prompt.setText('Press Build to construct the model allocation');
    const btn = keep(
      ui.add
        .rectangle(cx, H * 0.8, 300, 52, 0x2d6cdf)
        .setStrokeStyle(2, 0x6f9ff0)
        .setDepth(62)
        .setInteractive({ useHandCursor: true }),
    );
    const btnText = label(cx, H * 0.8, 'Build with iCapital', 20, '#ffffff');
    btn.once('pointerdown', () => {
      btn.disableInteractive();
      btnText.setText('Building…');
      const empties = segs.filter((s) => s.alt && !s.filled);
      empties.forEach((s, i) => scene.time.delayedCall(180 * (i + 1), () => fillSeg(s)));
      scene.time.delayedCall(180 * (empties.length + 1) + 60, () => {
        btn.destroy();
        btnText.destroy();
      });
    });
  } else {
    prompt.setText('Drag each alternative into its slice of the pie');
    const tray = segs.filter((s) => s.alt);
    tray.forEach((s, i) => {
      const tx = cx + (i - (tray.length - 1) / 2) * 190;
      const ty = H * 0.82;
      const token = ui.add.container(tx, ty).setDepth(63).setSize(68, 68);
      const body = ui.add.circle(0, 0, 32, 0x141c30).setStrokeStyle(3, s.color);
      const ic = ui.add.image(0, 0, `icon-${s.key}`).setDisplaySize(40, 40);
      const cap = ui.add
        .text(0, 46, s.label, { fontFamily: FONT_BODY, fontSize: '12px', color: '#9fb0d0' })
        .setOrigin(0.5)
        .setResolution(2);
      token.add([body, ic, cap]);
      token.setData('key', s.key);
      token.setData('home', { x: tx, y: ty });
      token.setInteractive();
      ui.input.setDraggable(token);
      tokens.push(token);
    });
    ui.input.on('drag', onDrag);
    ui.input.on('dragend', onDragEnd);
  }

  ui.input.keyboard.on('keydown', onEnter);
}
