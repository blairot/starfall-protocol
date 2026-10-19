"""Make the reference clips Chatterbox copies each character's voice from.

Each Kokoro voice the cast uses reads the same neutral passage once; the clip is
saved to tools/voice/refs/<voice>.flac. generate.py (run with Chatterbox) then
speaks every line in that voice, with more natural expression.

Run once, with the Kokoro virtualenv's Python:
    <kokoro-venv>\\Scripts\\python tools/voice/make_refs.py
"""
import os, sys
import numpy as np, soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from generate import VOICES, CHOIR, speak, SR  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), 'refs')
PASSAGE = ("The lanes were quiet that night, and the station lights burned low. "
           "We waited for the signal, and when it came, nobody said a word. "
           "Then the order came through, and the ship began to move.")


def main():
    os.makedirs(OUT, exist_ok=True)
    voices = sorted(set(VOICES.values()) | {v for v, _, _ in CHOIR})
    for v in voices:
        x = speak(PASSAGE, v, 0.95)
        sf.write(os.path.join(OUT, v + '.flac'), x, SR)
        print(f'{v:12} {len(x) / SR:5.1f}s')


if __name__ == '__main__':
    main()
