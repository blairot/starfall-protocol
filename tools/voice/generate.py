"""Render cutscene voice lines with Kokoro (free, local TTS) and ffmpeg.

Reads CAST and CINEMATICS from js/cinematics.js and renders every line with the
character's voice and effect into a local cache (tools/voice/cache/, not
committed). Then joins each cutscene's lines into one file, audio/vo/<cinematic>.mp3,
with a short gap between lines, and writes js/vo.js: each line's start offset,
duration and text hash (so the game can tell when a line's text changed and its
audio is stale). One file per cutscene means one download and one decode.

Usage (from the repo root):
    Chatterbox (the default; needs tools/voice/refs from make_refs.py and the Chatterbox virtualenv):
        <chatterbox-venv>\\Scripts\\python tools/voice/generate.py [--force] [--only opening,s1]
    Kokoro only: set VOICE_ENGINE=kokoro and use the Kokoro virtualenv's Python.
Needs node and ffmpeg on PATH. Unchanged lines are skipped unless --force.
"""
import argparse, json, os, subprocess, sys, tempfile

import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'audio', 'vo')
CACHE = os.path.join(ROOT, 'tools', 'voice', 'cache')
GAP = 0.3   # seconds of silence between lines in a cutscene file
SR = 24000

# Voice archetypes used by the script -> Kokoro voice id (first letter: a = US, b = UK English)
VOICES = {
    'narrator-m': 'bm_george', 'narrator-f': 'bf_emma', 'male-us': 'am_michael', 'male-us-deep': 'am_onyx',
    'male-uk': 'bm_lewis', 'female-us': 'af_heart', 'female-us-warm': 'af_bella', 'female-uk': 'bf_isabella',
    'female-uk-soft': 'bf_alice', 'child-ish': 'af_sky',
}
SPEED = {'narrator-m': 0.95, 'narrator-f': 0.95, 'male-us-deep': 0.92}

# Per-character processing (ffmpeg -af chains). Every chain ends in loudness normalisation.
NORM = 'loudnorm=I=-17:TP=-1.5:LRA=9'
FX = {
    'none':  'highpass=f=70',
    'radio': 'highpass=f=300,lowpass=f=3500,acompressor=threshold=-20dB:ratio=5:attack=5:release=60,acrusher=bits=11:mix=0.12',
    'ai':    'highpass=f=110,chorus=0.6:0.9:22:0.28:0.3:2,aecho=0.85:0.5:14|29:0.22|0.12',
    'synth': 'asetrate=24000*0.93,aresample=24000,atempo=1.075,flanger=delay=1.5:depth=2.5:speed=0.6:regen=40,acrusher=bits=9:mix=0.22,aecho=0.8:0.6:7|13:0.4|0.25,highpass=f=160',
    'alien': 'asetrate=24000*0.8,aresample=24000,atempo=1.25,chorus=0.5:0.9:45|62:0.42|0.34:0.25|0.4:2|1.3,aecho=0.8:0.55:55|110:0.32|0.18,lowpass=f=6000',
    'psi':   'chorus=0.7:0.9:38:0.34:0.32:1.4,aecho=0.85:0.7:80|170|260:0.32|0.22|0.12,highpass=f=120',
    'choir': 'aecho=0.85:0.8:110|230|380:0.38|0.27|0.17,highpass=f=100',
}
# The Choir speaks with several voices at once (pitch spread), then FX['choir'].
CHOIR = [('af_heart', 1.0, 0.0), ('am_michael', 0.86, 0.035), ('bf_emma', 1.12, 0.06), ('am_onyx', 0.75, 0.09)]


def hash_text(t):
    """FNV-1a 32-bit, base 36: must match Cinema.hashText in js/cinema.js."""
    h = 2166136261
    for ch in t:
        h ^= ord(ch)  # JS charCodeAt: UTF-16 code units; scripts are plain text so this matches
        h = (h * 16777619) & 0xFFFFFFFF
    digits, n = '0123456789abcdefghijklmnopqrstuvwxyz', h
    out = ''
    while True:
        n, r = divmod(n, 36); out = digits[r] + out
        if not n: return out


def load_script():
    js = r"""
const fs = require('fs'), vm = require('vm'), ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(process.argv[1], 'utf8') + ';this.CAST = CAST; this.CINEMATICS = CINEMATICS;', ctx);
process.stdout.write(JSON.stringify({ cast: ctx.CAST, cines: ctx.CINEMATICS }));
"""
    res = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'js', 'cinematics.js')], capture_output=True, text=True, encoding='utf8')
    if res.returncode: sys.exit('could not read js/cinematics.js:\n' + res.stderr)
    return json.loads(res.stdout)


PIPES = {}
def pipeline(voice):
    from kokoro import KPipeline
    lang = voice[0]
    if lang not in PIPES: PIPES[lang] = KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')
    return PIPES[lang]


# Engine: Chatterbox (default) speaks in each character's Kokoro voice, copied from
# tools/voice/refs/<voice>.flac (make_refs.py), with far more natural expression.
# VOICE_ENGINE=kokoro uses Kokoro directly.
ENGINE = os.environ.get('VOICE_ENGINE', 'chatterbox')
REFS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refs')
# per character: (exaggeration = how much feeling, cfg_weight = pacing; lower is slower and more deliberate)
EMOTION = {'narrator': (0.6, 0.4), 'halcyon': (0.35, 0.5), 'okonkwo': (0.5, 0.45), 'vex': (0.75, 0.35), 'mox': (0.55, 0.45),
           'ixis': (0.6, 0.4), 'calculus': (0.25, 0.55), 'unit_zero': (0.35, 0.5), 'nyra': (0.6, 0.4), 'choir': (0.7, 0.35)}
CB = None
def chatterbox():
    global CB
    if CB is None:
        import torch
        from chatterbox.tts import ChatterboxTTS
        CB = ChatterboxTTS.from_pretrained(device='cuda' if torch.cuda.is_available() else 'cpu')
    return CB


def speak(text, voice, speed=1.0, who=None):
    if ENGINE == 'chatterbox':
        import torch
        m = chatterbox(); ex, cfg = EMOTION.get(who, (0.5, 0.5))
        torch.manual_seed(int(hash_text(text + voice), 36) & 0x7fffffff)   # same line, same take
        wav = m.generate(text, audio_prompt_path=os.path.join(REFS, voice + '.flac'), exaggeration=ex, cfg_weight=cfg)
        x = wav.squeeze(0).detach().cpu().numpy().astype(np.float32)
        return resample_pitch(x, m.sr / SR) if m.sr != SR else x
    chunks = [np.asarray(audio, dtype=np.float32) for _, _, audio in pipeline(voice)(text, voice=voice, speed=speed)]
    return np.concatenate(chunks) if chunks else np.zeros(SR // 4, dtype=np.float32)


def resample_pitch(x, factor):
    """Pitch shift by resampling (also changes length); used to spread the Choir's voices."""
    if factor == 1.0: return x
    idx = np.arange(0, len(x), factor)
    return np.interp(idx, np.arange(len(x)), x).astype(np.float32)


def render(text, member, tmp, who=None):
    fx = member.get('fx', 'none')
    if fx == 'choir':
        parts = []
        for v, pitch, delay in CHOIR:
            a = resample_pitch(speak(text, v, 0.9, who), pitch)
            parts.append(np.concatenate([np.zeros(int(delay * SR), np.float32), a]))
        n = max(len(p) for p in parts)
        x = sum(np.pad(p, (0, n - len(p))) for p in parts) / len(parts) * 1.6
    else:
        arche = member.get('voice', 'narrator-m')
        x = speak(text, VOICES.get(arche, 'bm_george'), SPEED.get(arche, 1.0), who)
    x = np.concatenate([np.zeros(int(0.06 * SR), np.float32), x, np.zeros(int(0.5 * SR), np.float32)])  # room for echoes
    raw = os.path.join(tmp, 'raw.wav'); sf.write(raw, x, SR)
    return raw, FX.get(fx, FX['none'])


def encode(raw, chain, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', f'{chain},{NORM},areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.12,areverse',
                    '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', out], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    return round(dur, 2)


def pcm(path):
    """Decode an mp3 to mono float32 at 44.1 kHz (ffmpeg trims the encoder delay)."""
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32)


def build_sprites(cines, keep):
    """One mp3 per cutscene: its lines in order with a short gap. Returns {key: (start, duration)} in seconds."""
    rate, offsets = 44100, {}
    for cid, cine in cines.items():
        parts, pos = [np.zeros(int(0.1 * rate), np.float32)], int(0.1 * rate)
        for si, shot in enumerate(cine['shots']):
            for li, _ in enumerate(shot.get('lines') or []):
                key = f'{cid}-{si}-{li}'
                if key not in keep: continue
                x = pcm(os.path.join(CACHE, key + '.mp3'))
                offsets[key] = (round(pos / rate, 3), round(len(x) / rate, 3))
                gap = np.zeros(int(GAP * rate), np.float32)
                parts += [x, gap]; pos += len(x) + len(gap)
        out = os.path.join(OUT, cid + '.mp3')
        if len(parts) == 1:
            if os.path.exists(out): os.remove(out)
            continue
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, 'all.wav'); sf.write(wav, np.concatenate(parts), rate)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', out], check=True)
        print(f'{cid}.mp3  {pos / rate:6.1f}s')
    # old one-file-per-line audio and files for cutscenes that no longer exist
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f[:-4] not in cines: os.remove(os.path.join(OUT, f))
    old = os.path.join(OUT, 'manifest.json')
    if os.path.exists(old): os.remove(old)
    return offsets


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--force', action='store_true'); ap.add_argument('--only', default='')
    args = ap.parse_args()
    data = load_script(); cast, cines = data['cast'], data['cines']
    only = set(filter(None, args.only.split(',')))
    os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
    manifest_path = os.path.join(CACHE, 'manifest.json')
    manifest = json.load(open(manifest_path, encoding='utf8')) if os.path.exists(manifest_path) else {}
    keep, made, skipped = {}, 0, 0
    with tempfile.TemporaryDirectory() as tmp:
        for cid, cine in cines.items():
            for si, shot in enumerate(cine['shots']):
                for li, line in enumerate(shot.get('lines') or []):
                    key, text = f'{cid}-{si}-{li}', line['text']
                    h, out = hash_text(text), os.path.join(CACHE, f'{cid}-{si}-{li}.mp3')
                    member = cast.get(line['who'], {})
                    sig = f"{h}|{member.get('voice')}|{member.get('fx')}|{ENGINE}"
                    old = manifest.get(key)
                    if (only and cid not in only) or (not args.force and old and old.get('sig') == sig and os.path.exists(out)):
                        if old and os.path.exists(out): keep[key] = old
                        skipped += 1; continue
                    raw, chain = render(text, member, tmp, line['who'])
                    keep[key] = {'d': encode(raw, chain, out), 'h': h, 'sig': sig}
                    made += 1
                    print(f'{key:14} {keep[key]["d"]:5.2f}s  {member.get("name", line["who"])}: {text[:60]}')
    # remove cached audio for lines that no longer exist
    for f in os.listdir(CACHE):
        if f.endswith('.mp3') and f[:-4] not in keep: os.remove(os.path.join(CACHE, f))
    json.dump(keep, open(manifest_path, 'w', encoding='utf8'), indent=0)
    offsets = build_sprites(cines, keep)
    with open(os.path.join(ROOT, 'js', 'vo.js'), 'w', encoding='utf8') as fp:
        fp.write("'use strict';\n// Generated by tools/voice/generate.py: per voice line, its start (o) in audio/vo/<cutscene>.mp3, duration (d) and text hash (h).\n")
        fp.write('const VO = ' + json.dumps({k: {'o': offsets[k][0], 'd': offsets[k][1], 'h': v['h']} for k, v in sorted(keep.items()) if k in offsets}, separators=(',', ':')) + ';\n')
    total = sum(v['d'] for v in keep.values())
    print(f'\n{made} rendered, {skipped} unchanged, {len(keep)} lines, {total / 60:.1f} min of voice')


if __name__ == '__main__':
    main()
