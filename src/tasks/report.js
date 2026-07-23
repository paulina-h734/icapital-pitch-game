import { formatTime } from '../bestTimes.js';

// ---------------------------------------------------------------------------
// The finish payoff, in two beats:
//   1. Your time  — "Your time is M:SS.d — press Enter / click to view the
//      client's portfolio."
//   2. Consolidated Reporting — the funded portfolio as a report.
//        iCapCar : ONE clean consolidated report — every holding, one view.
//        Rusty   : the same holdings scattered across mismatched statements
//                  from every custodian/fund — "reconcile manually".
//      Then the persistent best-times scoreboard, and "run again".
//
// A reveal, not a task — nothing to fumble on stage.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;

// A plausible $2.5M book split by the target allocation.
const HOLDINGS = [
  { label: 'Stocks', pct: 40, color: 0x3f5c86, value: '$1.00M' },
  { label: 'Bonds', pct: 25, color: 0x51748f, value: '$625K' },
  { label: 'Private Equity', pct: 12, color: 0x7db4ff, value: '$300K' },
  { label: 'Private Credit', pct: 12, color: 0x8fd0a0, value: '$300K' },
  { label: 'Real Assets', pct: 11, color: 0xf0b46a, value: '$275K' },
];
const TOTAL = '$2.5M';

export function runReport(scene, ui, opts, onAgain) {
  const W = ui.scale.width;
  const H = ui.scale.height;
  const isICap = !!opts.isICap;
  const client = opts.clientName || 'Your client';
  const accent = isICap ? '#7db4ff' : '#f0a08a';

  // A disposable layer of screen-space objects with its own helpers.
  const layer = () => {
    const els = [];
    const keep = (o) => {
      if (o.depth === 0) o.setDepth(62); // default layer; explicit 60/61 kept
      els.push(o);
      return o;
    };
    const txt = (x, y, str, size, color, extra = {}) =>
      keep(
        ui.add
          .text(x, y, str, { fontFamily: 'sans-serif', fontSize: `${size}px`, color, ...extra })
          .setResolution(2),
      );
    return { keep, txt, destroy: () => els.forEach((o) => o && o.scene && o.destroy()) };
  };

  timeScreen();

  // --- beat 1: your time ----------------------------------------------------
  function timeScreen() {
    const L = layer();
    const dim = L.keep(
      ui.add.rectangle(0, 0, W, H, 0x0b1020, 0.95).setOrigin(0).setDepth(60).setInteractive(),
    );
    L.txt(W / 2, H * 0.33, 'Your time', 22, '#9fb0d0').setOrigin(0.5);
    L.txt(W / 2, H * 0.45, formatTime(opts.ms), 66, accent, { fontFamily: 'monospace' }).setOrigin(0.5);
    L.txt(W / 2, H * 0.55, isICap ? 'iCapCar' : 'Rusty car', 18, accent).setOrigin(0.5);
    const prompt = L.txt(
      W / 2,
      H * 0.7,
      "Press Enter — or click — to view your client's portfolio",
      18,
      '#9fe0b0',
    ).setOrigin(0.5);
    prompt.setAlpha(0.4);

    const onKey = (e) => {
      if (e.key === 'Enter') proceed();
    };
    const proceed = () => {
      ui.input.keyboard.off('keydown', onKey);
      dim.off('pointerdown', proceed);
      L.destroy();
      reportPage();
    };
    // A short beat so a key held at the finish line doesn't skip straight past.
    scene.time.delayedCall(350, () => {
      prompt.setAlpha(1);
      ui.input.keyboard.on('keydown', onKey);
      dim.on('pointerdown', proceed);
    });
  }

  // --- beat 2: the consolidated report --------------------------------------
  function reportPage() {
    const L = layer();
    L.keep(ui.add.rectangle(0, 0, W, H, 0x0b1020, 0.95).setOrigin(0).setDepth(60));

    L.txt(W / 2, 48, `${client}'s portfolio`, 30, '#eef3ff').setOrigin(0.5);
    L.txt(
      W / 2,
      88,
      isICap
        ? 'One consolidated report — every holding, one view, updated live.'
        : 'Statements from every custodian and fund — you reconcile them yourself.',
      17,
      accent,
    ).setOrigin(0.5);

    // funded allocation donut (left)
    const cx = W * 0.27;
    const cy = H * 0.44;
    const R = 128;
    const r = 70;
    const donut = L.keep(ui.add.graphics().setDepth(61));
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
    L.txt(cx, cy - 12, TOTAL, 26, '#eef3ff').setOrigin(0.5);
    L.txt(cx, cy + 16, 'total value', 13, '#9fb0d0').setOrigin(0.5);

    // right side: the report
    const rx = W * 0.52;
    const rw = W * 0.44;
    if (isICap) {
      L.keep(
        ui.add
          .rectangle(rx, 150, rw, 430, 0x141c30, 0.98)
          .setOrigin(0, 0)
          .setStrokeStyle(2, 0x2d6cdf)
          .setDepth(61),
      );
      L.txt(rx + 24, 172, 'Consolidated report', 20, '#8fd0ff');
      L.keep(
        ui.add
          .rectangle(rx + rw - 96, 184, 76, 22, 0x14361f)
          .setOrigin(0, 0)
          .setStrokeStyle(1, 0x2e7d46),
      );
      L.txt(rx + rw - 88, 187, 'LIVE', 13, '#8fe0a0');
      let y = 224;
      for (const h of HOLDINGS) {
        L.keep(ui.add.rectangle(rx + 24, y + 9, 14, 14, h.color).setOrigin(0, 0));
        L.txt(rx + 48, y, h.label, 17, '#eef3ff');
        L.txt(rx + rw - 150, y, `${h.pct}%`, 16, '#9fb0d0');
        L.txt(rx + rw - 28, y, h.value, 17, '#dfe7f5').setOrigin(1, 0);
        y += 42;
      }
      L.keep(ui.add.rectangle(rx + 24, y + 4, rw - 48, 1, 0x33405e).setOrigin(0, 0));
      y += 16;
      L.txt(rx + 48, y, 'Total', 18, '#eef3ff');
      L.txt(rx + rw - 28, y, TOTAL, 20, '#7db4ff').setOrigin(1, 0);
      L.txt(rx + 24, y + 42, '5 holdings · 1 report · +8.4% YTD', 15, '#9fb0d0');
    } else {
      const cards = [
        { t: 'Custodian A — Public equities', ang: -5, dx: 30, dy: 170, tint: 0x1b2440 },
        { t: 'Bank — Fixed income', ang: 4, dx: 250, dy: 210, tint: 0x24203a },
        { t: 'Fund admin — Private Equity  (PDF)', ang: -3, dx: 90, dy: 330, tint: 0x1f2a2a },
        { t: 'Alt statement — PENDING', ang: 6, dx: 300, dy: 360, tint: 0x2a1f24 },
      ];
      for (const c of cards) {
        L.keep(
          ui.add
            .rectangle(rx + c.dx, c.dy, 250, 130, c.tint, 0.98)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x46608f)
            .setAngle(c.ang)
            .setDepth(61),
        );
        L.txt(rx + c.dx + 14, c.dy + 12, c.t, 14, '#c8d6f0', { wordWrap: { width: 220 } }).setAngle(c.ang);
      }
      L.txt(rx + rw * 0.42, 300, 'RECONCILE\nMANUALLY', 26, '#ff9a9a', { align: 'center' })
        .setOrigin(0.5)
        .setAngle(-12);
      L.txt(rx + 20, 560, '4 sources · formats vary · hours of reconciliation', 15, '#f0a08a');
    }

    // scoreboard (bottom)
    const by = H * 0.72;
    L.keep(ui.add.rectangle(W / 2, by - 18, W * 0.86, 1, 0x33405e).setOrigin(0.5, 0));
    L.txt(W / 2, by, `${isICap ? 'iCapCar' : 'Rusty car'}  ·  ${formatTime(opts.ms)}`, 32, accent).setOrigin(
      0.5,
    );
    L.txt(W / 2, by + 52, 'BEST TIMES', 15, '#9fb0d0').setOrigin(0.5);
    const row = (yy, lbl, val, color) => {
      L.txt(W / 2 - 100, yy, lbl, 19, color).setOrigin(0, 0.5);
      L.txt(W / 2 + 120, yy, formatTime(val), 19, color, { fontFamily: 'monospace' }).setOrigin(1, 0.5);
    };
    row(by + 84, 'RUSTY CAR', opts.best.old, '#f0a08a');
    row(by + 114, 'iCAPCAR', opts.best.icap, '#7db4ff');
    const again = L.txt(W / 2, by + 154, 'Press Enter to run again', 16, '#9fe0b0').setOrigin(0.5);
    again.setAlpha(0.5);

    const onKey = (e) => {
      if (e.key !== 'Enter') return;
      ui.input.keyboard.off('keydown', onKey);
      L.destroy();
      onAgain();
    };
    scene.time.delayedCall(400, () => {
      again.setAlpha(1);
      ui.input.keyboard.on('keydown', onKey);
    });
  }
}
