# Aahhh Arcade architecture

The arcade shell and each game are separate entry points. `/` renders a light
game library; `/punch` dynamically imports Ragdoll Room. Future games should get
their own composition module under `src/games/` and must not be imported by the
arcade shell until their route is selected.

## Runtime modules

- `core/EventBus.js` is the contract between systems. Gameplay modules do not
  import UI modules.
- `core/GameState.js` owns session state such as combo, intensity, sound, and
  total hits. Persistent upgrades can layer on top of its snapshots.
- `game/SceneWorld.js` owns the Three.js renderer, camera, environment, and
  visual effects.
- `game/EnvironmentManager.js` owns switchable scene groups, environment-aware
  lighting, and ambient animation. New locations stay independent of gameplay.
- `game/Dummy.js` owns the procedural dummy mesh, face texture, and spring
  response. It does not know which button or player caused an impact.
- `game/InteractionController.js` converts pointer input into `impact:request`
  events.
- `input/CameraPunchController.js` lazily loads MediaPipe after explicit camera
  opt-in and converts local fist/palm motion into the same impact events.
- `input/FitnessRound.js` owns the optional timed camera round.
- `game/actions.js` is the data-driven action registry. Add an entry here to
  create a new keyboard/button action without touching the renderer.
- `progression/ProgressionSystem.js` awards local points and achievements and
  persists the profile without an account.
- `replay/ReplaySystem.js` retains a privacy-safe ten-second action buffer.
- `multiplayer/MultiplayerClient.js` synchronizes serializable impact events;
  `server/server.mjs` owns room membership, rate limits, turns, and static
  production hosting.
- `audio/AudioManager.js` owns background music, hit banks, reactions, and the
  browser audio-unlock lifecycle.
- `ui/UIController.js` owns the DOM and translates UI input into game events.
- `main.js` is the tiny route-level arcade shell. `games/punch.js` is the punch
  composition root and the only place that coordinates a complete impact.

## Adding an action

Add an object to `ACTIONS` with an ID, label, key, and a list of timed hits.
The UI and keyboard map are derived from the registry automatically.

## Progression

Progression listens to gameplay events and stores only JSON data. It never owns
Three.js objects. Unlocks can modify action definitions at runtime or transform
an `impact:request` before it reaches the dummy.

## Multiplayer seam

`action:performed` and `impact:applied` expose plain serializable payloads. The
network adapter sends side, raw power, target part, move, and prop over a
same-origin WebSocket. Remote actions re-enter through `impact:request`, keeping
networking out of Three.js and UI code. The server validates membership, turns,
payload bounds, room capacity, and per-player impact cooldowns.

Uploaded faces should remain client-local by default. Multiplayer avatars need
explicit player consent and a separate upload/storage policy before face data is
ever shared.

## Audio generation

`tools/generate_audio.py` generates versionable ElevenLabs audio files into
`public/audio`. It reads the API key from the process environment, the local
`.env`, or an explicit `--env-file`. Secrets never enter the browser bundle.
