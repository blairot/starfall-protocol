"""Write the Claude artifact's copy of js/videos.js.

Clips listed in tools/video/artifact-assets.json are served from the artifact's
asset store, so their entries gain an `a` map ({720, 1080, p}) that cinema.js
uses instead of video/<size>/<clip>.mp4. Clips not in the map keep the plain
entry (their files are published with the artifact).

Run from the repo root:  python tools/video/artifact_videos.py <output path>
"""
import json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def main(out):
    src = open(os.path.join(ROOT, 'js', 'videos.js'), encoding='utf8').read()
    videos = json.loads(re.search(r'const VIDEOS = (\{.*\});', src).group(1))
    hosted = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(__file__), 'artifact-assets.json'), encoding='utf8')).items() if not k.startswith('_')}
    for clip, a in hosted.items():
        if clip in videos: videos[clip]['a'] = a
    with open(out, 'w', encoding='utf8') as fp:
        fp.write("'use strict';\n// Artifact build of js/videos.js (tools/video/artifact_videos.py): some clips are served from the artifact's asset store.\n")
        fp.write('const VIDEOS = ' + json.dumps(videos, separators=(',', ':')) + ';\n')
    print(f'{len(videos)} clips, {sum(1 for c in videos if c in hosted)} from the asset store -> {out}')


if __name__ == '__main__':
    main(sys.argv[1])
