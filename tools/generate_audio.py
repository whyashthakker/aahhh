#!/usr/bin/env python3
"""Generate Ragdoll Room sound effects and music with ElevenLabs.

Usage:
  python3 tools/generate_audio.py
  python3 tools/generate_audio.py --only sfx
  python3 tools/generate_audio.py --only music --force
  python3 tools/generate_audio.py --env-file /path/to/private/.env
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_DIR = os.path.join(ROOT, "public", "audio", "sfx")
MUSIC_DIR = os.path.join(ROOT, "public", "audio", "music")
API_BASE = "https://api.elevenlabs.io/v1"
OUTPUT_FORMAT = "mp3_44100_128"

SFX = {
    "hit_light_1": (
        "short satisfying cartoon boxing glove punch into a soft training dummy, rubbery thump and tiny spring boing, clean playful arcade game sound, no gore",
        0.7,
    ),
    "hit_light_2": (
        "quick playful bonk on a padded mannequin, compact soft impact with a wooden pop and comic bounce, polished arcade game sound, no gore",
        0.7,
    ),
    "hit_heavy": (
        "huge satisfying padded punching bag impact, deep bassy thud with rubber wobble and short room punch, playful arcade game, no gore",
        0.9,
    ),
    "shove": (
        "heavy training mannequin shoved backward, broad padded body impact followed by a rubber spring wobble, fun game sound, no gore",
        1.0,
    ),
    "flurry": (
        "rapid five-hit cartoon boxing combo on a padded training dummy, escalating soft thuds and comic pops, energetic polished arcade game sound, no gore",
        1.4,
    ),
    "reaction_1": (
        "very short surprised nonverbal cartoon mannequin grunt, one comical oof-like vocal reaction, friendly arcade game, no words, no pain realism",
        0.7,
    ),
    "reaction_2": (
        "short silly nonverbal rubber dummy yelp with a tiny wobble, playful game reaction, no spoken words, no pain realism",
        0.7,
    ),
    "reaction_3": (
        "brief comical breathy training dummy reaction, surprised puff and squeaky toy wobble, no spoken words, playful game sound",
        0.7,
    ),
}

MUSIC = {
    "purple_playground": (
        "quirky stylish indie game background loop for a bright purple 3D playground, bouncy muted bass, soft electronic percussion, playful marimba plucks, glossy synth sparkles, confident and mischievous, relaxing not aggressive, no vocals, seamless loop feel, instrumental",
        60000,
    ),
}


def read_api_key(env_file: str | None) -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    candidates = [env_file, os.path.join(ROOT, ".env")]
    for path in filter(None, candidates):
        if key or not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                if line.strip().startswith("ELEVENLABS_API_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set (environment, .env, or --env-file).")
    return key


def post(url: str, payload: dict, key: str) -> bytes:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "xi-api-key": key},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        return response.read()


def generate_sfx(key: str, force: bool) -> None:
    os.makedirs(SFX_DIR, exist_ok=True)
    generated = skipped = 0
    for name, (prompt, duration) in SFX.items():
        output = os.path.join(SFX_DIR, f"{name}.mp3")
        if os.path.exists(output) and not force:
            skipped += 1
            continue
        try:
            audio = post(
                f"{API_BASE}/sound-generation",
                {"text": prompt, "duration_seconds": duration, "prompt_influence": 0.55},
                key,
            )
        except urllib.error.HTTPError as error:
            print(f"  FAIL {name}: HTTP {error.code} {error.read().decode()[:180]}")
            continue
        with open(output, "wb") as handle:
            handle.write(audio)
        generated += 1
        print(f"  sfx {name} ({len(audio) // 1024} KB)")
        time.sleep(0.3)
    print(f"SFX: {generated} generated, {skipped} already present.")


def generate_music(key: str, force: bool) -> None:
    os.makedirs(MUSIC_DIR, exist_ok=True)
    generated = skipped = 0
    for name, (prompt, length_ms) in MUSIC.items():
        output = os.path.join(MUSIC_DIR, f"{name}.mp3")
        if os.path.exists(output) and not force:
            skipped += 1
            continue
        try:
            audio = post(
                f"{API_BASE}/music?output_format={OUTPUT_FORMAT}",
                {
                    "prompt": prompt,
                    "music_length_ms": length_ms,
                    "model_id": "music_v1",
                    "force_instrumental": True,
                },
                key,
            )
        except urllib.error.HTTPError as error:
            print(f"  FAIL {name}: HTTP {error.code} {error.read().decode()[:180]}")
            continue
        with open(output, "wb") as handle:
            handle.write(audio)
        generated += 1
        print(f"  music {name} ({len(audio) // 1024} KB)")
        time.sleep(0.5)
    print(f"MUSIC: {generated} generated, {skipped} already present.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=["sfx", "music"])
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--env-file", help="Private .env file containing ELEVENLABS_API_KEY")
    args = parser.parse_args()
    key = read_api_key(args.env_file)
    if args.only in (None, "sfx"):
        generate_sfx(key, args.force)
    if args.only in (None, "music"):
        generate_music(key, args.force)


if __name__ == "__main__":
    main()
