# Drive the Journey

A short, playable top‑down driving game — the centerpiece of a 15‑minute pitch
for iCapital. The player drives the **same course** in two cars: a **rusty car**
(going it alone — every task is manual and slow) and the **iCapCar** (the
iCapital platform — tasks auto‑complete and the route glides). A persistent timer
makes the contrast undeniable. Built with **Phaser 3 + Vite**; runs fully offline.

## Run it

Node is required. In a shell (Git Bash on the original machine needs Node on PATH
first: `export PATH="/c/Program Files/nodejs:$PATH"`):

```bash
npm install
npm run dev        # dev server → http://localhost:5173  (map editor: press `)
npm run build      # → one self-contained dist/index.html that runs offline
npm run preview    # serve the built dist/
```

## Docs — read these first

- **[CLAUDE.md](CLAUDE.md)** — the product brief: what the game is, the narrative
  spine, build order, and non‑goals. Design intent lives here.
- **[HANDOFF.md](HANDOFF.md)** — the engineering guide: architecture, how to
  run/test, the in‑game **map editor**, the offline single‑file build, and the
  list of hand‑tuned decisions **not to revert**. Start here to make changes.
