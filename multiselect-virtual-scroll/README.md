# MultiSelect — virtual scroll

Standalone, runnable port of the real fix behind the "When 1,100 Checkboxes
Ruin Your INP" article: a `MultiSelect` dropdown over a large (1,200-item)
option list that used to render every option on open, and now windows the
rendered DOM to the visible viewport plus a small overscan buffer.

Ported (simplified, anonymized) from a real-world fix, specifically:

- `src/hooks/useVirtualScroll.ts` — the windowing hook (measure row height,
  track scroll position, slice the children array to the visible window,
  rAF-batch the scroll handler).
- `src/components/Option.tsx` / `src/components/MenuList.tsx` — the
  `React.memo` comparators (`node`-identity for `Option`, child-count for
  `MenuList`), and why they only work because selection state is read from
  `src/context.tsx`, not passed as props.
- `src/components/MultiSelect.tsx` — the stable-callback + `startTransition`
  fix (`internalSelectedRef` keeps `handleToggle`'s identity stable across
  clicks; the O(options) derived-value computation is deferred out of the
  synchronous click handler).

## Running it

```bash
npm install
npm run dev      # open the dropdown, scroll, search — check the DOM in devtools
```

While `npm run dev` is running, open the dropdown and inspect the DOM: no
matter how many of the 1,200 brands match your search, only a couple dozen
`[role="option"]` nodes exist in the tree at any time (visible in the
`statRow` line inside the dropdown itself).

## What this is not

This is a simplified, from-scratch reimplementation for demonstration
purposes — not the original production source. It drops `react-select`,
Radix UI, group/indeterminate options, and any design system styling, to
keep the windowing and memoization logic legible without any proprietary
code. The article's [research dossier](../../claude-code-marketplace/inp-article/research-dossier.md)
has the real diffs.
