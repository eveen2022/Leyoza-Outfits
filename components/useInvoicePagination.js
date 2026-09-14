'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { paginateRows } from '../lib/pagination.js';

export default function useInvoicePagination(draft, business) {
  const measureRef = useRef(null);
  const [layout, setLayout] = useState({ pages: [], error: '', draft: null, business: null });

  useLayoutEffect(() => {
    if (!draft || !business || !measureRef.current) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const page = measureRef.current.querySelector('.invoice-page');
      const table = page.querySelector('.invoice-table');
      const summary = page.querySelector('.totals');
      const bottom = page.querySelector('.invoice-bottom');
      const summaryStyle = getComputedStyle(summary);
      const footerBottom = parseFloat(getComputedStyle(bottom).getPropertyValue('--footer-bottom')) || 59;
      const footerTop = 1123 - footerBottom - bottom.offsetHeight;
      const regularFooterTop = 1123 - footerBottom - measureRef.current.querySelector('.invoice-footer-measure').offsetHeight;
      const rowsTop = table.offsetTop + table.tHead.getBoundingClientRect().height;
      const heights = Array.from(table.tBodies[0].rows, row => Math.ceil(row.getBoundingClientRect().height));
      const totalsSpace = summary.offsetHeight + parseFloat(summaryStyle.marginTop) + parseFloat(summaryStyle.marginBottom);
      // Leave room for borders and subpixel rounding in both browser and PDF output.
      const regularCapacity = Math.floor(regularFooterTop - rowsTop - 60);
      const finalCapacity = Math.floor(footerTop - rowsTop - totalsSpace - 16);
      let pages; let error = '';
      try { pages = paginateRows(heights, regularCapacity, finalCapacity); }
      catch (issue) { pages = [{ start: 0, end: draft.items.length }]; error = issue.message; }
      setLayout(previous => {
        if (previous.draft === draft && previous.business === business && previous.error === error && JSON.stringify(previous.pages) === JSON.stringify(pages)) return previous;
        return { pages, error, draft, business };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(measureRef.current);
    document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { active = false; observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [draft, business]);

  return { measureRef, pages: layout.pages, error: layout.error, ready: layout.draft === draft && layout.business === business && layout.pages.length > 0 };
}
