/**
 * The enrolment QR code, redrawn from what Supabase Auth returns.
 *
 * Auth returns the QR as a 360 KB SVG document: one <rect> per module, black
 * or white. This site renders no foreign markup and no <img> (CLAUDE.md,
 * rule 7), so the black modules are read out of it as numbers and drawn
 * again as one path, in this site's own <svg>. Nothing from the document but
 * coordinates reaches the page.
 *
 * Returns null if the document is not the uniform grid expected; the page
 * then offers only the text key, which is enough to set up the app.
 */

export type QrModules = {
  /** Width and height of the code in modules, quiet zone included. */
  size: number;
  /** One path in module units: each run of black modules in a row is a rectangle. */
  path: string;
};

const RECT = /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" style="fill:(black|white);stroke:none"\s*\/>/g;

export function qrFromSvg(svg: string): QrModules | null {
  const width = /<svg[^>]*\swidth="(\d+)"/.exec(svg);
  if (!width) return null;

  let unit = 0;
  const rows = new Map<number, number[]>();
  for (const match of svg.matchAll(RECT)) {
    const [, x, y, w, h, fill] = match;
    const size = Number(w);
    if (size !== Number(h) || size <= 0) return null;
    if (unit === 0) unit = size;
    if (size !== unit) return null;
    if (fill !== "black") continue;
    const row = Number(y) / unit;
    const col = Number(x) / unit;
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    const cols = rows.get(row) ?? [];
    cols.push(col);
    rows.set(row, cols);
  }
  if (unit === 0 || rows.size === 0) return null;

  const size = Number(width[1]) / unit;
  if (!Number.isInteger(size)) return null;

  const parts: string[] = [];
  for (const row of [...rows.keys()].sort((a, b) => a - b)) {
    const cols = rows.get(row)!.sort((a, b) => a - b);
    let start = cols[0];
    let previous = cols[0];
    for (const col of [...cols.slice(1), Number.NaN]) {
      if (col === previous + 1) {
        previous = col;
        continue;
      }
      parts.push(`M${start} ${row}h${previous - start + 1}v1h-${previous - start + 1}z`);
      start = col;
      previous = col;
    }
  }
  return { size, path: parts.join("") };
}
