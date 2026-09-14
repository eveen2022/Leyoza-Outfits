'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import InvoicePages from './InvoicePages';

export default function PreviewModal({ draft, business, pagination, onClose, validate }) {
  const stage = useRef(null);
  const downloadButton = useRef(null);
  const working = useRef(false);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const resize = () => {
      const element = stage.current;
      const style = getComputedStyle(element);
      const available = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (available > 0) setScale(Math.min(1, available / 794));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(stage.current); resize();
    return () => observer.disconnect();
  }, []);

  async function ready() {
    if (!validate()) return false;
    if (!pagination.ready || pagination.error) { setMessage(pagination.error || 'Preparing invoice pages. Please try again in a moment.'); return false; }
    await document.fonts.ready;
    await Promise.all(Array.from(stage.current.querySelectorAll('img')).map(image => image.decode()));
    const fits = Array.from(stage.current.querySelectorAll('.invoice-page')).every(page => {
      const content = page.querySelector('.totals') || page.querySelector('.continuation');
      return content.offsetTop + content.offsetHeight + 12 <= page.querySelector('.invoice-bottom').offsetTop;
    });
    if (!fits) setMessage('Some details are too long for the page. Shorten the descriptions or customer details before exporting.');
    return fits;
  }

  async function download() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (!await ready()) return;
      setBusy(true); setMessage('Preparing your invoice…');
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pages = Array.from(stage.current.querySelectorAll('.invoice-page'));
      for (let index = 0; index < pages.length; index++) {
        setMessage(`Creating PDF page ${index + 1} of ${pages.length}…`);
        const canvas = await html2canvas(pages[index], {
          scale: 2, backgroundColor: '#fcfcfc', width: 794, height: 1123, windowWidth: 1200,
          onclone: (document, target) => {
            document.body.appendChild(target);
            Object.assign(document.body.style, { overflow: 'visible', padding: '0', margin: '0' });
            Object.assign(target.style, { transform: 'none', boxShadow: 'none', position: 'absolute', left: '0', top: '0', margin: '0' });
          },
        });
        if (index) pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        // Release large page buffers as multi-page invoices are processed.
        canvas.width = 0;
        canvas.height = 0;
      }
      pdf.save(`${draft.number.replace(/[^a-z0-9_-]/gi, '_') || 'invoice'}.pdf`);
      setMessage('Your PDF is ready. It uses the same pages as this preview.');
    } catch (error) {
      console.error(error); setMessage('PDF download failed. Please try again, or use Print → Save as PDF.');
    } finally {
      working.current = false;
      setBusy(false);
      requestAnimationFrame(() => downloadButton.current?.focus());
    }
  }

  async function print() {
    try { if (await ready()) window.print(); }
    catch { setMessage('The logo could not load. Reload and try again.'); }
  }

  return <Modal id="preview-modal" title="Invoice preview" subtitle="Your finished invoice, just as it will be exported." wide busy={busy} onClose={onClose}
    footer={<div className="preview-footer"><p id="message" role="status">{message}</p><div className="preview-footer-actions"><button className="btn btn-light" onClick={onClose} disabled={busy}><i className="bi bi-pencil" aria-hidden="true" /> Back to edit</button><div className="export-buttons"><button id="print" className="btn btn-outline-dark" onClick={print} disabled={busy}><i className="bi bi-printer" aria-hidden="true" /> Print</button><button ref={downloadButton} id="download" className="btn btn-gold" onClick={download} disabled={busy}><i className={`bi bi-${busy ? 'hourglass-split' : 'download'}`} aria-hidden="true" /> {busy ? 'Creating PDF…' : 'Download PDF'}</button></div></div></div>}>
    <div className="preview-toolbar"><div><span className="live-dot" /><strong>Live preview</strong><small>A4 · {pagination.pages.length} page{pagination.pages.length !== 1 ? 's' : ''} · {draft.items.length} products</small></div></div>
    {pagination.error && <p className="save-error" role="alert">{pagination.error}</p>}
    <div id="preview-stage" ref={stage}><InvoicePages draft={draft} business={business} pages={pagination.pages} scale={scale} /></div>
  </Modal>;
}
