#!/usr/bin/env python3
import os
import json
import hashlib
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS_DIR = os.path.join(ROOT, 'src', 'docs')
DUP_DIR = os.path.join(DOCS_DIR, 'duplicates')

if not os.path.isdir(DOCS_DIR):
    print('Docs dir not found:', DOCS_DIR)
    raise SystemExit(1)

os.makedirs(DUP_DIR, exist_ok=True)

hash_map = {}
files = []
for root, dirs, filenames in os.walk(DOCS_DIR):
    # skip the duplicates folder itself
    if os.path.abspath(root).startswith(os.path.abspath(DUP_DIR)):
        continue
    for fn in filenames:
        if not fn.lower().endswith('.json'):
            continue
        files.append(os.path.join(root, fn))

for f in sorted(files):
    try:
        with open(f, 'r', encoding='utf-8') as fh:
            try:
                obj = json.load(fh)
                canonical = json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
            except Exception:
                # fallback to raw bytes
                fh.seek(0)
                canonical = fh.read()
    except Exception as e:
        print('Failed to read', f, '->', e)
        continue
    h = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    hash_map.setdefault(h, []).append(f)

moved = []
for h, paths in hash_map.items():
    if len(paths) <= 1:
        continue
    # keep the first path, move the rest
    keeper = paths[0]
    dup_list = paths[1:]
    for p in dup_list:
        rel = os.path.relpath(p, DOCS_DIR)
        dest = os.path.join(DUP_DIR, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            shutil.move(p, dest)
            moved.append((p, dest))
            print('Moved duplicate:', p, '->', dest)
        except Exception as e:
            print('Failed to move', p, '->', dest, e)

manifest = {
    'moved_count': len(moved),
    'moved': [{'from': a, 'to': b} for a, b in moved]
}
with open(os.path.join(DUP_DIR, 'manifest.json'), 'w', encoding='utf-8') as mh:
    json.dump(manifest, mh, ensure_ascii=False, indent=2)

print('\nSummary:')
print(f"Files scanned: {len(files)}")
print(f"Duplicates moved: {len(moved)}")
print('Manifest written to', os.path.join('src', 'docs', 'duplicates', 'manifest.json'))
