import { formatTime } from '../bestTimes.js';
import { FONT_TITLE, FONT_BODY } from '../config.js';
import { drawPanel } from '../gfx/panel.js';

// ---------------------------------------------------------------------------
// The finish beat: final time on top, the consolidated report in the middle,
// and a FINISH button (opening-style) on the bottom. FINISH hands off to the
// results page (OpeningScene 'results' mode: best times + Return home / Run
// again). The report layout itself is rough for now — to be cleaned up later.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;

const HOLDINGS = [
  { label: 'Stocks', pct: 40, color: 0x3f5c86, value: '$1.00M' },
  { label: 'Bonds', pct: 25, color: 0x51748f, value: '$625K' },
  { label: 'Private Equity', pct: 12, color: 0x7db4ff, value: '$300K', icon: 'icon-pe' },
  { label: 'Private Credit', pct: 12, color: 0x8fd0a0, value: '$300K', icon: 'icon-pc' },
  { label: 'Real Assets', pct: 11, color: 0xf0b46a, value: '$275K', icon: 'icon-ra' },
];
const TOTAL = '$2.5M';

export function runReport(scene, ui, opts, onFinish) {
  const W = ui.scale.width;
  const H = ui.scale.height;
  const isICap = !!opts.isICap;
  const client = opts.clientName || 'Your client';
  const accent = isICap ? '#7db4ff' : '#f0a08a';

  const els = [];
  const keep = (o) => {
    if (o.depth === 0) o.setDepth(62);
    els.push(o);
    return o;
  };
  const txt = (x, y, str, size, color, extra = {}) =>
    keep(
      ui.add
        .text(x, y, str, { fontFamily: FONT_BODY, fontSize: `${size}px`, color, ...extra })
        .setResolution(2),
    );

  keep(ui.add.rectangle(0, 0, W, H, 0x0b1020, 0.95).setOrigin(0).setDepth(60).setInteractive());

  // --- TOP: final time ------------------------------------------------------
  txt(W / 2, H * 0.05, "This allocation's time", 20, '#9fb0d0', { fontFamily: FONT_TITLE }).setOrigin(
    0.5,
  );
  txt(W / 2, H * 0.115, formatTime(opts.ms), 58, accent, { fontFamily: 'monospace' }).setOrigin(0.5);

  // --- MIDDLE: the consolidated report -------------------------------------
  txt(W / 2, H * 0.2, `${client}'s portfolio`, 26, '#eef3ff', { fontFamily: FONT_TITLE }).setOrigin(
    0.5,
  );
  txt(
    W / 2,
    H * 0.245,
    isICap
      ? 'One consolidated report — every holding, one view, updated live.'
      : 'Statements from every custodian and fund — you reconcile them yourself.',
    15,
    accent,
  ).setOrigin(0.5);

  // funded allocation donut (left)
  const cx = W * 0.27;
  const cy = H * 0.54;
  const R = 120;
  const r = 64;
  const donut = keep(ui.add.graphics().setDepth(61));
  let a = TOP;
  for (const h of HOLDINGS) {
    const a1 = a + (h.pct / 100) * TAU;
    donut.beginPath();
    donut.arc(cx, cy, R, a, a1, false);
    donut.arc(cx, cy, r, a1, a, true);
    donut.closePath();
    donut.fillStyle(h.color, 1);
    donut.fillPath();
    donut.lineStyle(2, 0x0b1020, 1);
    donut.strokePath();
    a = a1;
  }
  txt(cx, cy - 12, TOTAL, 24, '#eef3ff').setOrigin(0.5);
  txt(cx, cy + 16, 'total value', 13, '#9fb0d0').setOrigin(0.5);

  // right side: the report
  const rx = W * 0.52;
  const rw = W * 0.44;
  const boxTop = H * 0.31;
  const boxH = H * 0.46;
  if (isICap) {
    keep(
      ui.add
        .rectangle(rx, boxTop, rw, boxH, 0x141c30, 0.98)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x2d6cdf)
        .setDepth(61),
    );
    txt(rx + 24, boxTop + 22, 'Consolidated report', 20, '#8fd0ff');
    keep(
      ui.add
        .rectangle(rx + rw - 96, boxTop + 34, 76, 22, 0x14361f)
        .setOrigin(0, 0)
        .setStrokeStyle(1, 0x2e7d46),
    );
    txt(rx + rw - 88, boxTop + 37, 'LIVE', 13, '#8fe0a0');
    let y = boxTop + 74;
    for (const h of HOLDINGS) {
      if (h.icon) keep(ui.add.image(rx + 32, y + 15, h.icon).setDisplaySize(26, 26));
      else keep(ui.add.rectangle(rx + 24, y + 9, 14, 14, h.color).setOrigin(0, 0));
      txt(rx + 52, y, h.label, 17, '#eef3ff');
      txt(rx + rw - 150, y, `${h.pct}%`, 16, '#9fb0d0');
      txt(rx + rw - 28, y, h.value, 17, '#dfe7f5').setOrigin(1, 0);
      y += 42;
    }
    keep(ui.add.rectangle(rx + 24, y + 4, rw - 48, 1, 0x33405e).setOrigin(0, 0));
    y += 16;
    txt(rx + 48, y, 'Total', 18, '#eef3ff');
    txt(rx + rw - 28, y, TOTAL, 20, '#7db4ff').setOrigin(1, 0);
    txt(rx + 24, y + 40, '5 holdings · 1 report · +8.4% YTD', 15, '#9fb0d0');
  } else {
    const cards = [
      { t: 'Custodian A — Public equities', ang: -5, dx: 30, dy: boxTop + 20 },
      { t: 'Bank — Fixed income', ang: 4, dx: 250, dy: boxTop + 60 },
      { t: 'Fund admin — Private Equity  (PDF)', ang: -3, dx: 90, dy: boxTop + 180 },
      { t: 'Alt statement — PENDING', ang: 6, dx: 300, dy: boxTop + 210 },
    ];
    for (const c of cards) {
      keep(
        ui.add
          .rectangle(rx + c.dx, c.dy, 250, 120, 0x1e2740, 0.98)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x46608f)
          .setAngle(c.ang)
          .setDepth(61),
      );
      txt(rx + c.dx + 14, c.dy + 12, c.t, 14, '#c8d6f0', { wordWrap: { width: 220 } }).setAngle(c.ang);
    }
    txt(rx + rw * 0.42, boxTop + 150, 'RECONCILE\nMANUALLY', 26, '#ff9a9a', { align: 'center' })
      .setOrigin(0.5)
      .setAngle(-12);
    txt(rx + 20, boxTop + boxH - 20, '4 sources · formats vary · hours of reconciliation', 15, '#f0a08a');
  }

  // --- BOTTOM: FINISH -------------------------------------------------------
  const bx = W / 2;
  const by = H * 0.92;
  const bw = 280;
  const bh = 72;
  const panel = keep(drawPanel(ui, bx, by, bw, bh, 20).setDepth(62));
  const btxt = keep(
    ui.add
      .text(bx, by, 'FINISH', { fontFamily: FONT_TITLE, fontSize: '34px', color: '#25344c' })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(63),
  );
  const hit = keep(
    ui.add.rectangle(bx, by, bw, bh, 0x000000, 0).setDepth(63).setInteractive({ useHandCursor: true }),
  );
  scene.tweens.add({
    targets: [panel, btxt, hit],
    scaleX: 1.05,
    scaleY: 1.05,
    duration: 780,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const done = () => {
    ui.input.keyboard.off('keydown', onKey);
    scene.tweens.killTweensOf([panel, btxt, hit]);
    els.forEach((o) => o && o.scene && o.destroy());
    onFinish();
  };
  const onKey = (e) => {
    if (e.key === 'Enter') done();
  };
  hit.once('pointerdown', done);
  scene.time.delayedCall(300, () => ui.input.keyboard.on('keydown', onKey));
}
