"""Bring cutscene clips from video/incoming/ into the game.

Each clip (mp4, mov or webm from Sora or any other tool) becomes two silent,
web-friendly H.264 files, cropped to 16:9:
  video/1080/<clip>.mp4   desktop
  video/720/<clip>.mp4    phones
then js/videos.js is rewritten with each clip's length, which tells the
cutscene player which shots have video (the rest show their painted still).

Run from the repo root:  python tools/video/ingest.py   (needs ffmpeg and ffprobe on PATH)
"""
import json, os, re, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'video', 'incoming')
SIZES = {'1080': (1920, 1080, 24), '720': (1280, 720, 27)}   # width, height, quality (lower = better, bigger)
# portrait loops (a character's portrait brought to life, shown in square frames): clip -> horizontal centre of the face (0..1)
LOOPS = {'halcyon-idle': 0.51, 'halcyon-corrupted': 0.5, 'ixis-idle': 0.5, 'calculus-idle': 0.5, 'choir-idle': 0.5, 'nyra-idle': 0.5}
LOOP_SIZE, LOOP_CRF, LOOP_BLEND = 480, 26, 0.5   # pixels square, quality, seconds of crossfade that hides the loop seam


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    return round(float(out or 0), 2)


def src_height(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    return int(out or 0)


def src_fps(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    try: a, b = out.split('/'); return float(a) / float(b)
    except Exception: return 30.0


def poster(src, out):
    """The clip's own first frame, shown while it loads, so a late start never pops."""
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-vf', r'scale=min(960\,iw):-2', '-q:v', '80', out], check=True)


def black_bars(path):
    """Crop that removes letterbox or pillarbox bars (some tools pad a 3:2 image out to 16:9), or None."""
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-vf', 'cropdetect=limit=24:round=2:reset=0', '-f', 'null', '-'], capture_output=True, text=True).stderr
    crops = re.findall(r'crop=(\d+):(\d+):(\d+):(\d+)', out)
    if not crops: return None
    cw, ch, x, y = map(int, crops[-1])
    probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip()
    fw, fh = map(int, probe.split(','))
    return f'crop={cw}:{ch}:{x}:{y}' if (cw < fw * 0.98 or ch < fh * 0.98) else None


def encode(src, out, w, h, crf):
    # never upscale: a 720p source stays 720p in the "1080" folder too; keep the clip's own frame rate
    sh = src_height(src)
    if sh and sh < h: w, h = round(w * sh / h / 2) * 2, sh
    bars = black_bars(src)
    # in-between frames: clips are often slowed to fit their narration, and 24 fps slowed down looks choppy
    smooth = ',minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1' if src_fps(src) < 40 else ''
    vf = (bars + ',' if bars else '') + f'scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}' + smooth + ',format=yuv420p'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf),
                    '-profile:v', 'high', '-movflags', '+faststart', out], check=True)


def encode_loop(src, out, cx):
    """Square, seamless loop: the clip's last LOOP_BLEND seconds fade into its first, then a square crop around the face."""
    d, b = duration(src), LOOP_BLEND
    fc = (f'[0:v]split[a][b];[a]trim={b},setpts=PTS-STARTPTS[m];[b]trim=0:{b},setpts=PTS-STARTPTS[h];'
          f'[m][h]xfade=transition=fade:duration={b}:offset={d - 2 * b:.3f},'
          f"crop=ih:ih:'(iw-ih)*{cx}':0,scale={LOOP_SIZE}:{LOOP_SIZE},format=yuv420p")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-an', '-filter_complex', fc, '-c:v', 'libx264', '-preset', 'slow', '-crf', str(LOOP_CRF),
                    '-profile:v', 'high', '-movflags', '+faststart', out], check=True)


def main():
    for d in list(SIZES) + ['poster', 'loop']: os.makedirs(os.path.join(ROOT, 'video', d), exist_ok=True)
    made = 0
    if os.path.isdir(SRC):
        for f in sorted(os.listdir(SRC)):
            stem, ext = os.path.splitext(f)
            if ext.lower() not in ('.mp4', '.mov', '.webm', '.m4v'): continue
            src = os.path.join(SRC, f)
            if stem in LOOPS:
                out = os.path.join(ROOT, 'video', 'loop', stem + '.mp4')
                if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src): encode_loop(src, out, LOOPS[stem]); made += 1
                continue
            for d, (w, h, crf) in SIZES.items():
                out = os.path.join(ROOT, 'video', d, stem + '.mp4')
                if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src): continue
                encode(src, out, w, h, crf); made += 1
    clips = {}
    for f in sorted(os.listdir(os.path.join(ROOT, 'video', '1080'))):
        if f.endswith('.mp4') and os.path.exists(os.path.join(ROOT, 'video', '720', f)):
            p = os.path.join(ROOT, 'video', '1080', f)
            post = os.path.join(ROOT, 'video', 'poster', f[:-4] + '.webp')
            if not os.path.exists(post) or os.path.getmtime(post) < os.path.getmtime(p): poster(os.path.join(ROOT, 'video', '720', f), post)
            clips[f[:-4]] = {'d': duration(p), 'kb': round(os.path.getsize(os.path.join(ROOT, 'video', '720', f)) / 1024)}
    for f in sorted(os.listdir(os.path.join(ROOT, 'video', 'loop'))):
        if not f.endswith('.mp4'): continue
        p = os.path.join(ROOT, 'video', 'loop', f)
        post = os.path.join(ROOT, 'video', 'poster', f[:-4] + '.webp')
        if not os.path.exists(post) or os.path.getmtime(post) < os.path.getmtime(p): poster(p, post)
        clips[f[:-4]] = {'d': duration(p), 'kb': round(os.path.getsize(p) / 1024), 'loop': 1}
    with open(os.path.join(ROOT, 'js', 'videos.js'), 'w', encoding='utf8') as fp:
        fp.write("'use strict';\n// Generated by tools/video/ingest.py: cutscene clips in video/720 and video/1080 (loop: 1 = a square portrait loop in video/loop), with their length in seconds.\n")
        fp.write('const VIDEOS = ' + json.dumps({k: {'d': v['d'], **({'loop': 1} if v.get('loop') else {})} for k, v in clips.items()}, separators=(',', ':')) + ';\n')
    total = sum(v['kb'] for v in clips.values())
    print(f'{made} files encoded; {len(clips)} clips ready ({total / 1024:.1f} MB at 720p)')
    for k, v in clips.items(): print(f'  {k:24} {v["d"]:5.1f}s  {v["kb"]:5d} KB (720p)')


if __name__ == '__main__':
    main()
