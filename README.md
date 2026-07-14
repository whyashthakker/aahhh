# Ragdoll Room

A playful, non-graphic Three.js frustration room. Add a face to a procedural
training dummy, then punch, shove, fling, or trigger a rapid combo. Uploaded
photos remain entirely inside the browser.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## Controls

- Click the dummy to punch; drag it to fling.
- `J` triggers a quick jab.
- `S` triggers a big shove.
- `F` triggers a five-hit flurry.
- `R` resets the room.

## Project shape

The game uses the official Vite vanilla starter recommended in the Three.js
installation guide. Three.js rendering, the procedural dummy, input, actions,
audio, UI, and state live in separate modules. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for extension points for new
actions, upgrades, persistent profiles, rooms, and multiplayer.

## Audio

The checked-in music, impacts, and reactions were authored with ElevenLabs.
Regenerate them with:

```bash
python3 tools/generate_audio.py
```

The script reads `ELEVENLABS_API_KEY` from the environment or a local `.env`.
Never expose the key in browser code.
