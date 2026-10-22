"""Write the Claude artifact's copy of js/painted.js.

The artifact can publish at most 511 files, so newer art is uploaded to its asset
store instead. tools/art/artifact-assets.json maps each hosted plate id to its two
asset URLs ({"f": full size, "s": phone size}); illustrations.js uses them in place
of art/cards/<id>.webp (or art/extra/<id>.webp). Plates not in the map keep their
published files.

Run from the repo root:  python tools/art/artifact_painted.py <output path>
"""
import json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def main(out):
    src = open(os.path.join(ROOT, 'js', 'painted.js'), encoding='utf8').read()
    painted = json.loads(re.search(r'const PAINTED = (\{.*\});', src).group(1))
    hosted = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(__file__), 'artifact-assets.json'), encoding='utf8')).items() if not k.startswith('_')}
    painted['a'] = hosted
    with open(out, 'w', encoding='utf8') as fp:
        fp.write("'use strict';\n// Artifact build of js/painted.js (tools/art/artifact_painted.py): some plates are served from the artifact's asset store.\n")
        fp.write('const PAINTED = ' + json.dumps(painted, separators=(',', ':')) + ';\n')
    print(f'{len(painted["cards"])} cards, {len(hosted)} plates from the asset store -> {out}')


if __name__ == '__main__':
    main(sys.argv[1])
