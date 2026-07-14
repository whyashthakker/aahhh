# Ragdoll Room architecture

Ragdoll Room is deliberately split into small systems so new actions, upgrades,
rooms, and multiplayer can be added without rewriting the Three.js scene.

## Runtime modules

- `core/EventBus.js` is the contract between systems. Gameplay modules do not
  import UI modules.
- `core/GameState.js` owns session state such as combo, intensity, sound, and
  total hits. Persistent upgrades can layer on top of its snapshots.
- `game/SceneWorld.js` owns the Three.js renderer, camera, environment, and
  visual effects.
- `game/Dummy.js` owns the procedural dummy mesh, face texture, and spring
  response. It does not know which button or player caused an impact.
- `game/InteractionController.js` converts pointer input into `impact:request`
  events.
- `game/actions.js` is the data-driven action registry. Add an entry here to
  create a new keyboard/button action without touching the renderer.
- `audio/AudioManager.js` owns background music, hit banks, reactions, and the
  browser audio-unlock lifecycle.
- `ui/UIController.js` owns the DOM and translates UI input into game events.
- `main.js` is the composition root. It wires systems together and is the only
  place that coordinates a complete impact.

## Adding an action

Add an object to `ACTIONS` with an ID, label, key, and a list of timed hits.
The UI and keyboard map are derived from the registry automatically.

## Upgrades

An upgrade system can modify action definitions at runtime or transform an
`impact:request` before it reaches the dummy. Keep upgrade data serializable and
store owned/unlocked IDs in a new profile module rather than in the renderer.

## Multiplayer seam

`action:performed` and `impact:applied` expose plain serializable payloads. A
future network adapter can send action ID, side, power, target part, player ID,
and timestamp over WebSocket/WebRTC. Remote actions should re-enter through
`action:request` or `impact:request`, keeping networking out of Three.js and UI
code. Server-authoritative rooms can validate cooldowns and upgrades before
broadcasting the same event shape.

Uploaded faces should remain client-local by default. Multiplayer avatars need
explicit player consent and a separate upload/storage policy before face data is
ever shared.

## Audio generation

`tools/generate_audio.py` generates versionable ElevenLabs audio files into
`public/audio`. It reads the API key from the process environment, the local
`.env`, or an explicit `--env-file`. Secrets never enter the browser bundle.
