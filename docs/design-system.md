# BorgScale design system

The whole UI is built from the tokens in `frontend/src/index.css`. Nothing in
`frontend/src/` should contain a raw colour, a raw duration, or a one-off
shadow. If you find yourself reaching for `text-green-500`, the token you want
is missing — add it here rather than working around it.

## Principles

BorgScale follows Apple's Human Interface Guidelines for structure and tone,
with Android 17-style frosted surfaces in place of Liquid Glass.

**Clarity.** The neutral scale carries the layout; colour is reserved for
status. A green badge means "this succeeded", never "this is a heading". If
everything is coloured, nothing is.

**Deference.** Chrome recedes. Frosted surfaces let content show through the
header and sidebar so the page reads as one continuous surface rather than a
set of stacked boxes.

**Depth.** Elevation comes from translucency and a hairline edge, not from
heavy drop shadows. A panel floats because you can see through it.

**Plain language.** This is backup software for people who are not Borg
experts. "Compact" is `Reclaim space`. "Prune" is `Delete old backups`.
Borg's own vocabulary belongs in tooltips and advanced disclosures, not in
primary labels.

## Colour

Every token below is verified at **≥ 4.5:1** against the surface it sits on, in
both themes. `scripts/check-contrast.py` re-checks them; run it after changing
any value.

### Neutrals

`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--input`.
These stay strictly achromatic. `--input` is deliberately darker than
`--border` because an input boundary is a UI component and WCAG 2.2 asks for
3:1 there, while a decorative separator has no such floor.

### Status

| Token | Means | Use for |
| --- | --- | --- |
| `--success` | Finished, healthy | Completed jobs, verified repositories |
| `--warning` | Needs attention, not broken | Overdue backups, nearing quota |
| `--destructive` | Failed or destructive | Failed jobs, delete actions |
| `--info` | Neutral information | Running jobs, hints |
| `--brand` | Product identity, interactivity | Focus rings, selected nav, links |

Each has a `-foreground` for text placed on top of it, and a `-subtle` variant
(the same hue at low alpha) for badge and banner backgrounds. Use `-subtle`
with the solid token as the text colour — that pairing is what keeps a badge
readable in both themes.

Never signal status with colour alone. Every status surface also carries an
icon or a text label, so it survives greyscale and colour blindness (WCAG
1.4.1).

### Charts

`--chart-1` … `--chart-5` vary in **both hue and lightness**, so a series stays
distinguishable when printed in greyscale or seen by a viewer with deuteranopia.

Charts must consume these through `var(--chart-1)` directly. They are `oklch`
values: wrapping them as `hsl(var(--chart-1))` produces invalid CSS and the
series renders with no colour at all.

## Frosted surfaces

Apply `.surface-frost` to any layer that floats above content: the app header,
the sidebar, dialogs, sheets, popovers, dropdown menus, and sticky table
headers. It sets a translucent background, a hairline border, and a blur.

The class degrades on purpose. Browsers without `backdrop-filter` get an opaque
`--card` background instead of a see-through one, because translucency without
blur leaves text sitting on top of whatever is scrolling behind it.

Do not stack frosted surfaces more than two deep. A frosted popover inside a
frosted sheet inside a frosted header blurs the blur and reads as mud.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| `--duration-fast` | 120ms | Hover, focus, colour changes |
| `--duration-base` | 200ms | Popovers, dropdowns, tab switches |
| `--duration-slow` | 320ms | Dialogs, sheets, route transitions |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most things |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1.2)` | Entrances that should settle |

Motion explains where something came from. A sheet slides from the edge it is
anchored to; a dropdown scales from its trigger. Motion that only decorates
should not exist.

`prefers-reduced-motion: reduce` collapses every animation and transition
globally, and rewrites the looping status animations to hold a steady visible
state. A "live" dot must still read as live when it cannot pulse.

## Typography

One family (Geist Variable), one scale.

| Role | Class |
| --- | --- |
| Page title | `text-2xl font-semibold tracking-tight` |
| Section heading | `text-base font-semibold` |
| Body | `text-sm` |
| Secondary / help | `text-sm text-muted-foreground` |
| Metadata / labels | `text-xs text-muted-foreground` |

Exactly one `<h1>` per page, and it is the page title. Headings descend without
skipping levels — a screen reader user navigates by them.

## Spacing

A 4px base. Page sections are separated by `space-y-6`, cards use `p-5` or
`p-6`, and related controls sit `gap-2` apart. Pick from the scale; do not
introduce `p-[13px]`.

## States

Every asynchronous surface owes the user four states, and all four are the
implementer's job:

1. **Loading** — a skeleton shaped like the content that is coming, not a
   spinner. The layout must not jump when data lands.
2. **Empty** — explains what would be here and offers the action that creates
   it. An empty list is an opportunity, not an error.
3. **Error** — says what failed in plain language and offers a retry.
4. **Content**.

## Interaction

- Every interactive element has visible `:hover` and `:focus-visible` states.
  Focus uses `--ring`, which meets the 3:1 that WCAG 2.2 requires. Do not
  remove outlines.
- Icon-only buttons carry an `aria-label`. A tooltip is not an accessible name.
- Destructive actions confirm, and the confirmation names the thing being
  destroyed.
- Anything that takes more than a moment shows progress, and anything that can
  be cancelled offers cancellation.
- Everything reachable by mouse is reachable by keyboard, in a sensible order.

## Feedback

`sonner` is the only toast system. Import `toast` from `sonner`; the `<Toaster>`
is mounted once in `main.tsx`.

Toasts are for transient confirmations. Anything the user must act on belongs
inline, next to the thing it concerns, where it will still be there after the
toast fades.
