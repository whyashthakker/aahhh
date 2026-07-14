# Ragdoll Room game plan

## North star

Make a five-minute session instantly funny, physically satisfying, private by
default, and shareable without becoming graphic or cruel. The core loop is:

**personalize → perform ridiculous hits → build a combo → unlock sillier toys →
watch the room react → reset feeling lighter.**

## Current playable foundation

- [x] Local face upload with no server transfer.
- [x] Articulated constraint-based ragdoll and mouse/touch flinging.
- [x] Quick jab, shove, and flurry actions with generated sound effects.
- [x] Studio, office, and garden environments.
- [x] Background music, dummy reactions, particles, camera shake, and combos.
- [x] Opt-in local webcam punching with MediaPipe closed-fist recognition.
- [x] Funny environment-specific speech bubbles and a wobbling hat/tie.
- [x] Dedicated `/punch` game route inside an extensible arcade shell.

## Phase 1 — Make every hit funny

**Playable slice shipped:** open-hand slap, visible foam-dart volley, fabric
squash/stretch, swinging accessories, comic impact words, and room-specific lines.

- [ ] Prop carousel: boxing glove, foam bat, slipper, rubber chicken, office
  keyboard, baguette, inflatable hammer, and garden hose.
- [ ] Prop-specific physics, sound banks, impact words, and dummy reactions.
- [ ] Exaggerated slow-motion on perfectly timed heavy hits.
- [ ] Dynamic facial squash, spinning hat, flying tie, googly-eye mode, and
  recoverable accessories.
- [ ] Environment reactions: office papers/coffee fly, garden leaves/flowers
  burst, studio lights pulse with the combo.
- [ ] Rare comedy events: HR arrives, sprinkler turns on, dramatic opera sting,
  dummy produces a tiny complaint card.

## Phase 2 — A rewarding five-minute loop

- [x] Earn `Aahhh Points` from power and move variety.
- [ ] Unlock props, dummy fabrics, hats, voices, impact fonts, and rooms.
- [ ] Daily three-part challenges such as “three head bonks, one shove, no
  combo drops.”
- [x] Style grades based on variety rather than raw hit count.
- [ ] Short session ending with breathing animation and a playful recap.
- [x] Local profile persistence with no account required.
- [ ] Profile export/import.

## Phase 3 — Camera play

- [x] In-camera punch sensitivity and tracking meter.
- [x] Hooks, jabs, uppercuts, open-palm slaps/shoves, and two-hand tracking.
- [ ] Guided distance/handedness calibration, blocks, and authored two-hand combos.
- [ ] On-screen target pads that encourage safe controlled movement.
- [x] Optional 30-second fitness round with timer and movement count.
- [x] Camera quality selector and low-power mode for mobile devices.
- [x] Keep all frames local; never record or upload without explicit consent.

## Phase 4 — Rooms and multiplayer

- [x] Shareable room codes for two to four players.
- [x] Pass-the-dummy mode with server-controlled five-second turns.
- [x] Co-op chaos mode with synchronized impacts and per-player colors.
- [ ] Party challenges and asynchronous “beat my combo” links.
- [x] Server validates room membership, turns, payload bounds, and cooldowns;
  Three.js only renders serializable action events.
- [ ] Server-validated unlocks and party scoring.
- [ ] Uploaded faces remain private by default and require explicit consent
  before any multiplayer sharing.

## Phase 5 — Shareability and retention

- [x] Privacy-safe ten-second action replay buffer.
- [ ] Cinematic replay cameras, automatic slow motion, and WebM export.
- [ ] Export clips with a privacy-safe option that replaces the uploaded face.
- [ ] Share cards for combo score, favorite prop, and room destruction.
- [ ] Seasonal room packs and community prop voting.
- [x] Lightweight achievements focused on comedy and experimentation.

## Technical priorities

- [ ] Add automated tests for action events, camera punch thresholds, cooldowns,
  upgrades, and saved profiles.
- [ ] Pool particles and props; dispose inactive environment resources.
- [x] Lazy-load MediaPipe only after camera opt-in and keep its model cached.
- [x] Add camera quality tiers and reduced-motion behavior.
- [ ] Add adaptive renderer quality from frame-time monitoring.
- [x] Add a network adapter behind the existing serializable event bus.
- [ ] Add analytics only for coarse game events; never camera frames or face
  image data.

## Definition of fun

A new player should understand the game in ten seconds, laugh in thirty seconds,
discover something unexpected within two minutes, and finish a session wanting
to try one more prop or room.
