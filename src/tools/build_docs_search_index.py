#!/usr/bin/env python3
import os
import json
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOCS_DIR = os.path.join(ROOT, 'src', 'docs')
OUT_FILE = os.path.join(DOCS_DIR, 'docs-search-index.json')

items = []

def strip_html(s: str) -> str:
    import html
    s = re.sub('<[^<]+?>', '', s)
    return html.unescape(' '.join(s.split()))


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
        # section-level snippet
        snippet = strip_html(content)[:240]
        items.append({
            'slug': slug,
            'id': sec_id,
            'title': title,
            'assembly': assembly,
            'snippet': snippet
        })

        # Extract member-level entries from .api-member blocks
        # Each member is a <div class="api-member">...<h4><code>SIGNATURE</code></h4>...<p>desc</p>
        for m in re.findall(r'<div\s+class=["\']api-member["\']>(.*?)</div>', content, re.DOTALL | re.IGNORECASE):
            sig = ''
            desc = ''
            m_h4 = re.search(r'<h4>(.*?)</h4>', m, re.DOTALL | re.IGNORECASE)
            if m_h4:
                h4 = m_h4.group(1)
                # Try to extract <code>...</code> inside h4
                code_match = re.search(r'<code>(.*?)</code>', h4, re.DOTALL | re.IGNORECASE)
                sig = code_match.group(1).strip() if code_match else re.sub('<[^<]+?>', '', h4).strip()

            m_p = re.search(r'<p>(.*?)</p>', m, re.DOTALL | re.IGNORECASE)
            if m_p:
                desc = strip_html(m_p.group(1))

            if sig:
                title_member = f"{title} — {sig}"
                items.append({
                    'slug': slug,
                    'id': sec_id,
                    'title': title_member,
                    'assembly': assembly,
                    'snippet': (desc or sig)[:240]
                })

with open(OUT_FILE, 'w', encoding='utf-8') as of:
    json.dump(items, of, ensure_ascii=False, indent=2)

print('Wrote', OUT_FILE)
