# Inkstride handoff

Last checked: 2026-04-30

## Files

- `Inkstride_project_rules.md`: project rules. Read first.
- `Inkstride_v21_57.html`: current single-file app copied from Downloads.

## Current code snapshot

- HTML title/UI version says `Inkstride v21r77`.
- Single HTML structure:
  - CSS: lines 46-360
  - body/UI markup: starts line 362
  - main script: lines 665-6266
- Main target: iPad 11 + Safari + Apple Pencil.
- Priority: stable practical drawing, sharp lines, no forced opacity fade.

## Rules to preserve

- Do not add requested-adjacent features.
- If there are multiple implementation paths, present A/B/C before changing code.
- If the same issue fails 3 times with the same approach, stop and report.
- Keep important decisions in docs and version comments in code, e.g. `// vXX: ...`.
- Prefer simple established browser APIs and existing app patterns.
- Avoid changing pressure/opacity behavior in a way that weakens sharp strokes.

## Known sensitive areas

- Ink pooling: already treated with distance-based taper settings. Do not try to force opacity down.
- Top buttons: past issue was overlap caused by label width vs CSS width, not just coordinates.
- Performance: previous heavy interpolation caused quality/performance regressions.

## Useful anchors

- Top button CSS: around lines 64-72 and 266-277.
- Top button markup: around lines 366-385.
- GRID layer helper: `nextGridLayerName()` / `drawGridLayer()` near layer management.
- Pen/marker taper controls: around lines 514-516 and 549-551.
- Save/open/gallery handlers: around lines 4716 and 6009-6017.
- Rotate canvas handler: around lines 5334-5368.

## Recent changes

- v78: Added top `GRID` button. It creates a new transparent layer named `GRID`, or `GRID1`, `GRID2`, etc. if the name exists. The layer contains only a 1000x1000 px, 10x10 grid with 3 px lines using the current selected ink color. Brush pressure/opacity/taper logic is not touched.
- v79: Project convention: "center" means canvas center (`CW/2`, `CH/2`), independent of viewport, zoom, or canvas size. GRID placement was changed to canvas center.
- v79: Added SELECT `COPY` / `CUT` actions at the upper right while a lasso path exists. COPY keeps the source pixels and places the copied selection into transform mode; CUT removes source pixels and places the cut selection into transform mode. Added internal clipboard paste mode: a 3-finger swipe opens a centered paste dialog with current-layer/new-layer choices. Paste places the copied content at canvas center.

## Next work protocol

1. Confirm the exact user-visible problem or desired change.
2. Inspect only the relevant anchors.
3. Make the smallest code change.
4. Add a short version comment near the change.
5. Test locally where possible, then ask the user to verify on iPad Safari if touch/Pencil behavior is involved.
