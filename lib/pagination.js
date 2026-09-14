// Ranges preserve product order and keep every row whole. The final page reserves
// space for totals; other pages may use that space for additional products.
export function paginateRows(heights, regularCapacity, finalCapacity) {
  if (!heights.length) return [{ start: 0, end: 0 }];
  if (!Number.isFinite(regularCapacity) || !Number.isFinite(finalCapacity) || regularCapacity <= 0 || finalCapacity < 0) {
    throw new Error('The customer or payment details take up too much space. Shorten them to fit the invoice.');
  }
  if (heights.some(height => !Number.isFinite(height) || height <= 0 || height > regularCapacity)) {
    throw new Error('An item is too tall for one page. Shorten its description to fit the invoice.');
  }
  let finalStart = heights.length;
  let finalHeight = 0;
  while (finalStart > 0 && finalHeight + heights[finalStart - 1] <= finalCapacity) {
    finalHeight += heights[--finalStart];
  }
  const pages = [];
  let start = 0;
  while (start < finalStart) {
    let end = start;
    let height = 0;
    while (end < finalStart && height + heights[end] <= regularCapacity) height += heights[end++];
    pages.push({ start, end });
    start = end;
  }
  // A very tall final item can occupy a regular page followed by totals alone.
  pages.push({ start: finalStart, end: heights.length });
  return pages;
}
