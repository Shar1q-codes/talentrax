# Browser regression suite

```bash
npm run test:browser          # build, then run everything
CI=1 npm run test:browser     # headless only; @headed tests are reported as skipped
```

`test:browser` runs `next build` and then Playwright, which serves that
build with `next start` on port 3210. It never runs against `next dev`.
Chromium only. The first run on a machine needs the browser itself:
`npx playwright install chromium`.

## What runs where

| Tag | Runs headless in CI | Why |
| --- | --- | --- |
| (none) | yes | |
| `@cdp` | yes, Chromium only | zoom and touch are driven through the Chrome DevTools Protocol |
| `@headed` | **no**, skipped under `CI=1` | needs classic scrollbars that take layout width; the headless shell's are overlays that take none |

The zoom test emulates zoom's effect on layout: a 1200px window at 150% is
800 CSS px at a device scale factor of 1.5. Playwright cannot drive the
browser's own zoom control.

## The six defects of the first browser pass

Each one has tests that failed on the code before the fix
(`d10a94b~1`) and pass after.

| # | Defect | Spec |
| --- | --- | --- |
| 1 | related link on a full article opened the modal over an empty page | `insights-modal.spec.ts` |
| 2 | closing the modal left focus nowhere (Escape, Close, Back) | `insights-modal.spec.ts` |
| 3 | the rail reset to the first card on any width change | `rail.spec.ts`; 3d (scrollbar) in `rail-scrollbar.spec.ts` |
| 4 | reloading an open article landed mid-article | `insights-modal.spec.ts` |
| 5 | a mouse drag on a card did not hold the pause | `rail.spec.ts` |
| 6 | the focus ring followed the title text, not the card | `rail.spec.ts` |

The rest - `site.spec.ts` and the "as the browser pass found it working"
blocks - pin what that pass found already correct.
