# iCapital "Drive the Journey" — Project Brief (v2)

> Source of truth for the project. Read fully before acting.
> Written across separate planning sessions; treat this as authoritative.

## What this is
A short, playable browser game — the centerpiece of a 15-minute intern pitch selling iCapital
to a **wealth manager / distributor** (JP Morgan / Raymond James type firm). It dramatizes one
truth: without an integrated platform, an advisor getting a client into alternatives navigates a
fragmented maze; with iCapital it's one clean route. Runs live during the pitch and **must run
fully offline**.

## Narrative spine (defend EVERY decision against this)
**The advisor is always the driver; iCapital is never the driver** — it's the road, the GPS, and
the boosts that turn a brutal trip into one clean route. The player-sprite drives BOTH cars: the
**rusty car = going it alone**, the **iCapCar = your practice running on the iCapital platform**.
The iGPS and the car's "special abilities" are the products doing the work; the car is just how
the platform shows up visually. If a feature makes iCapital look like it does the advisor's job
*for* them, cut or reframe it.

## BUILD ORDER (important — build in this sequence, finish each before the next)
1. **Movement only:** 4-directional grid movement, Tiled tilemap, centered camera, fog/FOV, boundaries.
2. **Full OLD-car run as a playable slice:** one alt pickup + inventory -> one KYC checkpoint ->
   document forest -> placeholder finish. (Old car first: it's the richer, harder run.)
3. **Layer the iCapCar on top:** same map, but tasks auto-complete, overpass materializes, KYC
   auto-verifies. The iCap run is conditionals on the old run, not a second game.
4. Clone the alt-task pattern to the other two alts.
5. **Wrap last:** opening sequence (title -> character -> client name -> car select) + persistent timer.

## Opening sequence
- (Optional) title screen.
- **Choose your Wealth Manager:** 4 stylized avatars (loosely the judges — keep affectionate,
  cosmetic only). Selection sets a global `[NAME]` used throughout. Use friendly stylized avatars,
  NOT literal headshots (also keeps flat-vector style consistent). Include a generic fallback option.
- **Welcome [NAME]** -> prompt "What's your client's name?" -> prompt "Security question: their
  favorite food?" (both stored for the KYC gates later).
- **Choose your vehicle:** rusty car vs iCapCar. Sprite walks to / clicks a car and "hops in"; the
  other car disappears; the game begins in the chosen car. (This one-time hop-in is the ONLY on-foot
  moment — not a general walking system.)
- Unlock text: OLD car -> "You have unlocked the old map (very crumpled)" (useless paper map);
  iCapCar -> "You have unlocked iGPS" + "iCapCar can unlock special abilities — follow the iGPS to
  find them all."

## Core mechanics
- **4-directional movement only** (up/down/left/right). All roads have hard corners, no rounded turns.
- Sprites: driving up/down = rear view of car; left/right = flipped by direction.
- **Camera centered on sprite; zoomed-in FOV + fog** — intentionally so the map is NOT obvious
  (you're lost without the platform). BUT keep the intended old-run path findable in ~30-60s; use
  dead-ends as texture, not genuine traps.
- Boundaries = trees (wavy) or bushes (uniform); green = impassable.
- **System prompts** overlay gameplay and **pause driving** until the action completes (press Enter
  through dialogue; press E to collect). Triggered on contact/proximity; the action radius must
  **deactivate on completion** to avoid infinite loops. Full-screen or lower-third prompt.
- **Persistent best-times table** (top-left): OLD CAR | iCAPCAR, persists across rounds so the final
  contrast is on-screen and undeniable. No ghost car, no live comparison — not needed.

## Same course, two runs
Identical start, course, and destination for both cars, so the timer contrast is honest.

## Active components to build now (product -> mechanic, kept 1:1)
- **Research & Diligence = the alt-collection tasks.** 3 alts, each guarded by a quick task.
  OLD car does the task manually; iCapCar auto-completes it. Press E to collect -> asset inventory.
  All 3 alts must be collected before KYC checkpoint 1.
  - Debris alt: OLD = click repeatedly to clear dirt; iCapCar = built-in vacuum clears it instantly.
  - Disguise alt: OLD = drag off the hat/mustache to inspect; iCapCar = scanner auto-inspects.
  - Caged alt: OLD = solve 3 simple randomized math "clues"; iCapCar = auto-unlocks the cage on entry.
  Frame every task explicitly as *diligence*, and make diligence feel protective, not pointless.
  (Get ONE task working cleanly first — suggest the caged/math one — then clone.)
- **Identity Solutions = KYC Customs (two checkpoints).** Checkpoint 1 after all alts, before the
  forest; checkpoint 2 after the forest, before assembly. OLD = re-enter client name + favorite food
  (wrong answer = soft instant retry, NEVER a dead-end); iCapCar = auto-verified, "Welcome [NAME]",
  gates open.
- **Document Center = the document/subscription forest overpass.** A green maze that darkens as you
  go, with occasional obstacles. An "activate overpass" button at the entrance: OLD car -> "nothing
  happened, maybe it's broken"; iCapCar -> "iCapCar recognized — materializing overpass" (concrete
  road, speed boost). Keep the forest traversable underneath for both cars.
- **Marketplace = visibility.** Expressed as the paper-map (old) vs iGPS/minimap (iCap) unlock in the
  opening; the full minimap UI comes with the deferred nav stage.

## Deferred (design later — use a placeholder finish for now)
- **Architect** = the assembly stage at the finish (collected alts snap into an allocation — a reward,
  NOT a hard puzzle that can be fumbled on stage; old = manual placement, iCap = one-click auto-arrange).
- **Consolidated Reporting** = the finish dashboard that lights up the assembled portfolio.
- Full **iGPS minimap** system (clear minimap, boosters, assets, next objective).

## Demo choreography (bake into the flow)
A teammate drives the OLD run (controlled, rehearsed — handles the typing). Hand the JUDGE the
iCapCar run: no typing, everything glides. The judge watches the pain and feels the relief.

## Non-goals (explicitly out)
- No racing, opponents, or sabotage/combat (contradicts "effortless & integrated").
- No free walking beyond the one-time hop-in.
- **Model Portfolios / iMAP = STRETCH only** (no clean home on this map without muddying it).
- No structured investments / annuities.

## Tech stack
- **Phaser 3** + **Vite** (dev server + static build).
- **Tiled** for the tilemap.
- **Kenney CC0** flat-vector packs (roads, cars, character, buildings) + **custom** iCapital art for
  booster icons, animated obstacles, KYC gates, the overpass, the HUD. Lock one tile size up front.
- Deploy to **GitHub Pages**; must also run offline from a local build. Keep a recorded fallback.

## Audience reminder
The buyer is the distributor firm, not the individual advisor. Tie the payoff to firm-level value:
advisor productivity/adoption, scalable AUM, retention/differentiation, lower operational/compliance risk.
