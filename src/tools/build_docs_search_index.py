#!/usr/bin/env python3
import os
import json
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS_DIR = os.path.join(ROOT, 'src', 'docs')
OUT_FILE = os.path.join(DOCS_DIR, 'docs-search-index.json')

items = []

for fname in sorted(os.listdir(DOCS_DIR)):
    if not fname.lower().endswith('.json'):
        continue
    if fname == 'index.json':
        continue
    if os.path.isdir(os.path.join(DOCS_DIR, fname)):
        continue
    if fname == 'docs-search-index.json':
        continue
    # skip raw reference folder
    if fname.lower().endswith('.json') and fname.startswith('PawSharp.'):
        # raw reference in pawsharp-ref
        continue

    path = os.path.join(DOCS_DIR, fname)
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            j = json.load(fh)
    except Exception:
        continue
    slug = j.get('slug') or os.path.splitext(fname)[0]
    assembly = j.get('name') or slug
    for sec in j.get('sections', []) or []:
        sec_id = sec.get('id') or ''
        title = sec.get('title') or ''
        content = sec.get('content') or ''
        # strip html
        snippet = re.sub('<[^<]+?>', '', content)
        snippet = ' '.join(snippet.split())[:240]
        items.append({
            'slug': slug,
            'id': sec_id,
            'title': title,
            'assembly': assembly,
            'snippet': snippet
        })

with open(OUT_FILE, 'w', encoding='utf-8') as of:
    json.dump(items, of, ensure_ascii=False, indent=2)

print('Wrote', OUT_FILE)
