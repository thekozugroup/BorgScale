# Phase 3 — Dashboard mockup reference

When the Wave 9 dashboard subagent runs, it must consult the Claude
Design mockup the user produced and implement the relevant aspects in
the new shadcn/ui implementation.

## Paste this into the dashboard subagent

```
Fetch this design file, read its readme, and implement the relevant
aspects of the design.
https://api.anthropic.com/v1/design/h/T2kg4vuzEYeEcgQBY2NvEw?open_file=Dashboard.html
Implement: Dashboard.html
```

## Notes for the dispatcher (controller)

- Pass the URL through verbatim.
- The mockup's HTML may use Tailwind class names that map cleanly to
  shadcn primitives. The subagent must NOT introduce new colour
  palette tokens — the BorgScale theme is the shadcn `neutral`
  black/white stock theme.
- The mockup's logo slot must use the `lucide:boxes` icon (already
  committed at `frontend/src/assets/lucide-boxes.svg` from Wave 0).
- Do NOT replicate any branding from upstream `borgscale` even if it
  appears in the mockup; the BorgScale brand swap (Wave 4) takes
  precedence.
- The Design Skeptic gate (Impeccable + qualitative pass) still
  applies — gradient overuse, low-contrast labels, broken focus
  rings will fail the wave.
