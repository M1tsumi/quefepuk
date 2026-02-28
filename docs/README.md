# Documentation Index

This folder contains project-specific documentation and JSON source files used to power the docs site.

Files:

- `pawsharp.json` — structured JSON source for the PawSharp docs (raw source).
- `pawsharp.md` — human-friendly Markdown summary and quickstart (this file).

How to use:
- The `pawsharp.json` contains rich HTML and code blocks; if your site generator supports it, you can render it directly.
- `pawsharp.md` is a concise entry point for humans and for hosts that prefer Markdown.

Next steps:
- Convert each `sections[*].content` entry in `pawsharp.json` into separate Markdown files for richer site pages. I can do that on request.
