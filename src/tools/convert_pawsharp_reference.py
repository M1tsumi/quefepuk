#!/usr/bin/env python3
import os
import json
import re
import html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF_DIR = os.path.join(ROOT, 'src', 'docs', 'pawsharp-ref')
OUT_DIR = os.path.join(ROOT, 'src', 'docs')

TYPE_KIND = 'T'
METHOD_KIND = 'M'
PROPERTY_KIND = 'P'
FIELD_KIND = 'F'
EVENT_KIND = 'E'

PRIMITIVE_MAP = {
    'String': 'string',
    'Int32': 'int',
    'Int64': 'long',
    'Boolean': 'bool',
    'Void': 'void',
    'Object': 'object',
    'UInt64': 'ulong',
    'UInt32': 'uint',
}


def slug_for_assembly(assembly: str) -> str:
    part = assembly.split('.')[-1].lower()
    return f'pawsharp-{part}'


def slug_for_type(type_full: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '-', type_full.lower())
    return s.strip('-')


def split_type_member_from_id(member_id: str):
    # member_id like 'M:PawSharp.API.Builders.MessageBuilder.AddEmbed(System.Action{...})'
    if ':' in member_id:
        member = member_id.split(':', 1)[1]
    else:
        member = member_id

    # find last '.' outside braces/parentheses to split type vs member
    depth = 0
    last_dot = -1
    for i, ch in enumerate(member):
        if ch == '{' or ch == '(':
            depth += 1
        elif ch == '}' or ch == ')':
            depth = max(0, depth - 1)
        elif ch == '.' and depth == 0:
            last_dot = i

    if last_dot == -1:
        return member, '', ''

    type_full = member[:last_dot]
    member_part = member[last_dot + 1:]

    # extract method name and params if present
    if '(' in member_part and member_part.endswith(')'):
        idx = member_part.find('(')
        name = member_part[:idx]
        params = member_part[idx + 1:-1]
    else:
        name = member_part
        params = ''

    return type_full, name, params


def split_top_level_commas(s: str):
    if not s:
        return []
    parts = []
    cur = []
    depth = 0
    for ch in s:
        if ch == '{':
            depth += 1
            cur.append(ch)
        elif ch == '}':
            depth = max(0, depth - 1)
            cur.append(ch)
        elif ch == ',' and depth == 0:
            parts.append(''.join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        parts.append(''.join(cur).strip())
    return parts


def simplify_full_type(t: str) -> str:
    if not t:
        return ''
    t = t.strip()
    # convert generic braces { } to angle brackets < >
    # and simplify namespaces to short names
    def simplify_token(tok: str):
        tok = tok.strip()
        # remove assembly qualification if present
        if ',' in tok:
            tok = tok.split(',', 1)[0]
        name = tok.split('.')[-1]
        return PRIMITIVE_MAP.get(name, name)

    # handle generics represented with { }
    if '{' in t and '}' in t:
        # find outer type name and inner generic args
        outer_match = re.match(r'^(?P<outer>[^{]+)\{(?P<inner>.*)\}$', t)
        if outer_match:
            outer = simplify_token(outer_match.group('outer'))
            inner = outer_match.group('inner')
            parts = split_top_level_commas(inner)
            simplified_parts = [simplify_full_type(p) for p in parts]
            return f"{outer}<{', '.join(simplified_parts)}>"

    # no generics
    return simplify_token(t)


def build_signature_from_types(params_types, params_info):
    parts = []
    for i, pinfo in enumerate(params_info):
        pname = pinfo.get('name', f'arg{i}')
        ptype = ''
        if i < len(params_types) and params_types[i]:
            ptype = simplify_full_type(params_types[i])
        parts.append((ptype, pname))
    return ', '.join(f"{t} {n}".strip() for t, n in parts)


def render_example(code: str) -> str:
    if not code:
        return ''
    esc = html.escape(code)
    return f"<pre><code class=\"language-csharp\">{esc}</code></pre>"


def render_params_table(params_info):
    if not params_info:
        return ''
    rows = []
    for p in params_info:
        name = html.escape(p.get('name', ''))
        desc = html.escape(p.get('description', ''))
        rows.append(f"<tr><td><code>{name}</code></td><td>{desc}</td></tr>")
    return '<table><thead><tr><th>Parameter</th><th>Description</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>'


def read_version_from_index():
    # try to read the top-level pawsharp-api-v1.json to get version
    idx_path = os.path.join(ROOT, 'src', 'docs', 'pawsharp-api-v1.json')
    if os.path.exists(idx_path):
        try:
            with open(idx_path, 'r', encoding='utf-8') as f:
                j = json.load(f)
                return j.get('version', '')
        except Exception:
            return ''
    return ''


def main():
    if not os.path.isdir(REF_DIR):
        print('Reference dir not found:', REF_DIR)
        return

    files = [f for f in os.listdir(REF_DIR) if f.endswith('.json') and f.lower() != 'index.json']
    if not files:
        print('No reference JSON files found in', REF_DIR)
        return

    default_version = read_version_from_index() or ''

    for fname in files:
        path = os.path.join(REF_DIR, fname)
        with open(path, 'r', encoding='utf-8') as fh:
            data = json.load(fh)

        assembly = data.get('assembly') or os.path.splitext(fname)[0]
        members = data.get('members', [])

        # collect types
        types = {}
        for m in members:
            kind = m.get('kind', '')
            member_id = m.get('id', '')
            # parse member id robustly
            type_full, member_name, params_raw = split_type_member_from_id(member_id)
            if not type_full:
                # fallback to name field
                friendly = m.get('name') or member_id
                last_dot = friendly.rfind('.')
                if last_dot == -1:
                    type_full = friendly
                    member_name = ''
                else:
                    type_full = friendly[:last_dot]
                    member_name = friendly[last_dot+1:]

            t = types.setdefault(type_full, {
                'namespace': '.'.join(type_full.split('.')[:-1]) if '.' in type_full else '',
                'name': type_full.split('.')[-1] if type_full else '',
                'summary': '',
                'constructors': [],
                'methods': [],
                'properties': [],
                'fields': [],
                'events': []
            })

            if kind == TYPE_KIND:
                t['summary'] = m.get('summary', '')
                continue

            if kind == METHOD_KIND:
                # params types from params_raw need splitting respecting braces
                params_types = split_top_level_commas(params_raw) if params_raw else []
                params_info = m.get('params', [])
                signature = build_signature_from_types(params_types, params_info)
                method_name = member_name
                item = {
                    'name': method_name,
                    'signature': signature,
                    'params': params_info,
                    'summary': m.get('summary', ''),
                    'returns': m.get('returns', ''),
                    'example': m.get('example', '')
                }
                # detect ctor by name
                if method_name.lower() in ('.ctor', '#ctor') or method_name == t['name']:
                    t['constructors'].append(item)
                else:
                    t['methods'].append(item)
                continue

            if kind == PROPERTY_KIND:
                prop_name = member_name or m.get('name','')
                t['properties'].append({'name': prop_name, 'summary': m.get('summary', ''), 'example': m.get('example', '')})
                continue

            if kind == FIELD_KIND:
                field_name = member_name or m.get('name','')
                t['fields'].append({'name': field_name, 'summary': m.get('summary', ''), 'example': m.get('example', '')})
                continue

            if kind == EVENT_KIND:
                event_name = member_name or m.get('name','')
                t['events'].append({'name': event_name, 'summary': m.get('summary', ''), 'example': m.get('example', '')})
                continue

        # Build assembly page
        slug = slug_for_assembly(assembly)
        out = {
            'slug': slug,
            'name': f'{assembly} — API Reference (generated)',
            'language': 'csharp',
            'languageLabel': 'C#',
            'version': default_version,
            'description': f'Generated API reference for {assembly}.',
            'sections': []
        }

        # Overview
        overview_html = f"<p>Generated API reference for <strong>{html.escape(assembly)}</strong> (generated from XML comments).</p>"
        overview_html += f"<p>Source XML: {html.escape(data.get('source',''))}</p>"
        out['sections'].append({'id':'overview','title':'Overview','content':overview_html})

        # Namespaces index
        namespaces = {}
        for type_full, tdef in types.items():
            ns = tdef['namespace'] or 'global'
            namespaces.setdefault(ns, []).append(type_full)

        ns_html = []
        for ns, type_list in sorted(namespaces.items()):
            ns_html.append(f"<h3>{html.escape(ns)}</h3>")
            ns_html.append('<ul>')
            for tf in sorted(type_list):
                slug_ty = slug_for_type(tf)
                ns_html.append(f"<li><a href=\"#{slug_ty}\">{html.escape(tf)}</a></li>")
            ns_html.append('</ul>')
        out['sections'].append({'id':'namespaces','title':'Namespaces & Types','content':'\n'.join(ns_html)})

        # Per-type sections
        for type_full, tdef in sorted(types.items(), key=lambda x: x[0].lower() if x[0] else ''):
            sid = slug_for_type(type_full or tdef.get('name',''))
            parts = []
            parts.append(f"<h2 id=\"{sid}\">{html.escape(type_full)}</h2>")
            if tdef.get('summary'):
                parts.append(f"<p>{html.escape(tdef['summary'])}</p>")

            # Constructors
            if tdef.get('constructors'):
                parts.append('<h3>Constructors</h3>')
                for c in tdef['constructors']:
                    sig = c['signature']
                    parts.append(f"<div class=\"api-member\"><h4><code>{html.escape(tdef.get('name',''))}({html.escape(sig)})</code></h4>")
                    if c.get('summary'):
                        parts.append(f"<p>{html.escape(c['summary'])}</p>")
                    parts.append(render_params_table(c.get('params', [])))
                    parts.append(render_example(c.get('example','')))
                    parts.append('</div>')

            # Methods
            if tdef.get('methods'):
                parts.append('<h3>Methods</h3>')
                for m in tdef['methods']:
                    sig = m['signature']
                    parts.append(f"<div class=\"api-member\"><h4><code>{html.escape(m['name'])}({html.escape(sig)})</code></h4>")
                    if m.get('summary'):
                        parts.append(f"<p>{html.escape(m['summary'])}</p>")
                    parts.append(render_params_table(m.get('params', [])))
                    if m.get('returns'):
                        parts.append(f"<p><strong>Returns:</strong> {html.escape(m['returns'])}</p>")
                    parts.append(render_example(m.get('example','')))
                    parts.append('</div>')

            # Properties
            if tdef.get('properties'):
                parts.append('<h3>Properties</h3>')
                for p in tdef['properties']:
                    parts.append(f"<div class=\"api-member\"><h4><code>{html.escape(p['name'])}</code></h4>")
                    if p.get('summary'):
                        parts.append(f"<p>{html.escape(p['summary'])}</p>")
                    parts.append(render_example(p.get('example','')))
                    parts.append('</div>')

            # Fields
            if tdef.get('fields'):
                parts.append('<h3>Fields</h3>')
                for f in tdef['fields']:
                    parts.append(f"<div class=\"api-member\"><h4><code>{html.escape(f['name'])}</code></h4>")
                    if f.get('summary'):
                        parts.append(f"<p>{html.escape(f['summary'])}</p>")
                    parts.append('</div>')

            # Events
            if tdef.get('events'):
                parts.append('<h3>Events</h3>')
                for e in tdef['events']:
                    parts.append(f"<div class=\"api-member\"><h4><code>{html.escape(e['name'])}</code></h4>")
                    if e.get('summary'):
                        parts.append(f"<p>{html.escape(e['summary'])}</p>")
                    parts.append('</div>')

            out['sections'].append({'id': sid, 'title': type_full, 'content': '\n'.join(parts)})

        # Write output file
        out_path = os.path.join(OUT_DIR, f"{slug}.json")
        with open(out_path, 'w', encoding='utf-8') as of:
            json.dump(out, of, ensure_ascii=False, indent=2)
        print('Wrote', out_path)

    print('Conversion complete.')


if __name__ == '__main__':
    main()
