# Aahhh Arcade

A modular browser-game arcade. The first game is **Ragdoll Room**, a playful,
non-graphic Three.js frustration room where photos and camera frames remain on
the player's device.

- `/` — arcade library and future game launcher.
- `/punch` — Ragdoll Room and its game-specific systems.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and the local multiplayer server together. Create and
serve a production build with:

```bash
npm run build
npm start
```

The production server provides SPA fallback for direct `/punch` links and hosts
the same-origin WebSocket endpoint at `/ws`.

## Controls

- Click the dummy to punch; drag it to fling.
- `J` triggers a quick jab.
- `S` triggers a big shove.
- `L` triggers an open-hand slap.
- `D` fires a three-shot foam-dart volley.
- `F` triggers a five-hit flurry.
- `R` resets the room.
- Camera mode recognizes jabs, hooks, uppercuts, open-palm slaps, and shoves.

## Project shape

The game uses the official Vite vanilla starter recommended in the Three.js
installation guide. The root router lazy-loads each game so the arcade landing
page does not pay the cost of Three.js or MediaPipe. Rendering, the procedural
dummy, input, actions, audio, progression, replay, multiplayer, UI, and state
live in separate modules. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for extension points for new
actions and additional games.

## Privacy

Face images are converted to an in-memory texture and never sent to the room
server. Camera tracking runs locally after explicit opt-in; the app synchronizes
only small action events such as target, side, power, and move type.

## Audio

The checked-in music, impacts, and reactions were authored with ElevenLabs.
Regenerate them with:

```bash
python3 tools/generate_audio.py
```

The script reads `ELEVENLABS_API_KEY` from the environment or a local `.env`.
Never expose the key in browser code.
