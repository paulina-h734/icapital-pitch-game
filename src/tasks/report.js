import { formatTime } from '../bestTimes.js';
import { FONT_TITLE, FONT_BODY } from '../config.js';
import { drawPanel } from '../gfx/panel.js';

// ---------------------------------------------------------------------------
// The finish beat: final time on top, the consolidated report in the middle,
// and a FINISH button (opening-style) on the bottom. FINISH hands off to the
// results page (OpeningScene 'results' mode). Cartoony pass: bubble title, bold
// navy outlines on the donut, a clean light report card (iCap) / messy scattered
// statements (rusty), and larger, bolder text throughout. Rough layout for now.
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

  keep(ui.add.rectangle(0, 0, W, H, 0x16294a, 0.96).setOrigin(0).setDepth(60).setInteractive());

  // --- TOP: final time in a cartoony outlined pill --------------------------
  txt(W / 2, H * 0.05, "This allocation's time", 24, '#cfe0ff', { fontFamily: FONT_TITLE }).setOrigin(
    0.5,
  );
  const pillFill = isICap ? 0x3f83c8 : 0xe0836a;
  const pillW = 320;
  const pillH = 92;
  const pillY = H * 0.145;
  const pill = keep(ui.add.graphics().setDepth(61));
  pill.fillStyle(0x173453, 1);
  pill.fillRoundedRect(W / 2 - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2); // navy border
  pill.fillStyle(pillFill, 1);
  pill.fillRoundedRect(
    W / 2 - pillW / 2 + 5,
    pillY - pillH / 2 + 5,
    pillW - 10,
    pillH - 10,
    (pillH - 10) / 2,
  );
  txt(W / 2, pillY, formatTime(opts.ms), 58, '#ffffff', {
    fontFamily: FONT_TITLE,
    stroke: '#173453',
    strokeThickness: 6,
  })
    .setOrigin(0.5)
    .setDepth(62);

  // --- MIDDLE: the consolidated report -------------------------------------
  txt(W / 2, H * 0.245, `${client}'s portfolio`, 34, '#ffffff', {
    fontFamily: FONT_TITLE,
    stroke: '#173453',
    strokeThickness: 6,
  }).setOrigin(0.5);
  // Rusty keeps its subtitle (its report looks fine as-is); iCap drops it.
  if (!isICap) {
    txt(
      W / 2,
      H * 0.3,
      'Statements from every custodian and fund — you reconcile them yourself.',
      20,
      '#ffcbb5',
      { fontStyle: 'bold' },
    ).setOrigin(0.5);
  }

  // funded allocation donut (left), with bold navy outlines + a hole coin.
  // iCap moves up (subtitle gone); rusty stays where it was (looks fine).
  const cx = W * 0.27;
  const cy = H * (isICap ? 0.55 : 0.58);
  const R = 128;
  const r = 70;
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
    donut.lineStyle(5, 0x173453, 1);
    donut.strokePath();
    a = a1;
  }
  keep(ui.add.circle(cx, cy, r - 2, 0x16294a).setStrokeStyle(5, 0x173453).setDepth(61));
  txt(cx, cy - 14, TOTAL, 30, '#ffffff', { fontFamily: FONT_TITLE }).setOrigin(0.5);
  txt(cx, cy + 18, 'total value', 17, '#bcd0f0', { fontStyle: 'bold' }).setOrigin(0.5);

  // right side card (iCap taller for a bottom buffer; rusty as before).
  const cardW = W * 0.44;
  const cardH = H * (isICap ? 0.5 : 0.42);
  const cardCx = W * 0.7;
  const cardCy = H * (isICap ? 0.55 : 0.58);
  const cardLeft = cardCx - cardW / 2;
  const cardTop = cardCy - cardH / 2;
  const cardRight = cardCx + cardW / 2;
  if (isICap) {
    keep(drawPanel(ui, cardCx, cardCy, cardW, cardH, 20).setDepth(61));
    txt(cardLeft + 30, cardTop + 26, 'Consolidated report', 24, '#1c2b45', { fontFamily: FONT_TITLE });
    keep(
      ui.add
        .rectangle(cardRight - 100, cardTop + 30, 80, 30, 0x2e7d46)
        .setOrigin(0, 0)
        .setStrokeStyle(3, 0x173453),
    );
    txt(cardRight - 60, cardTop + 45, 'LIVE', 17, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5);
    let y = cardTop + 84;
    for (const h of HOLDINGS) {
      if (h.icon) keep(ui.add.image(cardLeft + 42, y + 13, h.icon).setDisplaySize(30, 30));
      else
        keep(
          ui.add
            .rectangle(cardLeft + 30, y + 5, 18, 18, h.color)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x173453),
        );
      txt(cardLeft + 68, y, h.label, 21, '#20304c', { fontStyle: 'bold' });
      txt(cardRight - 148, y, `${h.pct}%`, 19, '#5a6478', { fontStyle: 'bold' });
      txt(cardRight - 30, y, h.value, 21, '#20304c', { fontStyle: 'bold' }).setOrigin(1, 0);
      y += 46;
    }
    keep(ui.add.rectangle(cardLeft + 30, y + 4, cardW - 60, 2, 0xb8b0a0).setOrigin(0, 0));
    y += 18;
    txt(cardLeft + 54, y, 'Total', 22, '#1c2b45', { fontFamily: FONT_TITLE });
    txt(cardRight - 30, y, TOTAL, 24, '#1c6bd0', { fontFamily: FONT_TITLE }).setOrigin(1, 0);
    txt(cardLeft + 30, y + 46, '5 holdings · 1 report · +8.4% YTD', 20, '#3a4560', {
      fontStyle: 'bold',
    });
  } else {
    const cards = [
      { t: 'Custodian A — Public equities', ang: -5, dx: -110, dy: -92 },
      { t: 'Bank — Fixed income', ang: 4, dx: 66, dy: -52 },
      { t: 'Fund admin — Private Equity (PDF)', ang: -3, dx: -72, dy: 58 },
      { t: 'Alt statement — PENDING', ang: 6, dx: 92, dy: 98 },
    ];
    for (const c of cards) {
      keep(
        ui.add
          .rectangle(cardCx + c.dx, cardCy + c.dy, 272, 122, 0xf1ece0)
          .setStrokeStyle(4, 0x173453)
          .setAngle(c.ang)
          .setDepth(61),
      );
      txt(cardCx + c.dx, cardCy + c.dy - 40, c.t, 17, '#33405e', {
        wordWrap: { width: 232 },
        align: 'center',
        fontStyle: 'bold',
      })
        .setOrigin(0.5, 0)
        .setAngle(c.ang);
    }
    txt(cardCx, cardCy, 'RECONCILE\nMANUALLY', 30, '#ff9a9a', {
      align: 'center',
      fontFamily: FONT_TITLE,
    })
      .setOrigin(0.5)
      .setAngle(-12);
    txt(cardCx, cardCy + cardH * 0.5 + 8, '4 sources · formats vary · hours of reconciliation', 18, '#ffcbb5', {
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // --- BOTTOM: FINISH -------------------------------------------------------
  const bx = W / 2;
  const by = H * 0.92;
  const bw = 300;
  const bh = 74;
  const panel = keep(drawPanel(ui, bx, by, bw, bh, 20).setDepth(62));
  const btxt = keep(
    ui.add
      .text(bx, by, 'FINISH', { fontFamily: FONT_TITLE, fontSize: '36px', color: '#25344c' })
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
  // A short beat so a key still held at the finish line doesn't skip instantly.
  scene.time.delayedCall(300, () => ui.input.keyboard.on('keydown', onKey));
}
