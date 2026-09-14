import { deliveryNote, formattedDate, money, totals, cents } from '../lib/invoice.js';

export function ContinuationFooter({ number }) {
  return <p className="invoice-carry-note">Invoice {number || '________________'} · Payment details and the total due are on the final page.</p>;
}

export default function InvoicePages({ draft, business, pages, scale = 1 }) {
  const calculated = totals(draft);
  return pages.map(({ start, end }, page) => (
    <div className="page-shell" key={page} style={{ width: 794 * scale, height: 1123 * scale }}>
      <article className="invoice-page" aria-label={`Invoice page ${page + 1}`} style={{ transform: `scale(${scale})` }}>
        <header className="invoice-header">
          <div className="invoice-brand"><img src="/logo.png" alt="Leyoza Outfits logo" width="86" height="86" /><div><h2>LEYOZA OUTFITS</h2><p>REDEFINES YOUR ELEGANCE</p></div></div>
          <div className="invoice-meta"><h1>INVOICE</h1><p><b>Invoice No:</b> <span className="invoice-number">{draft.number || '________________'}</span></p><p><b>Date:</b> {formattedDate(draft.date)}</p><p><b>Contact:</b> {business.contact}</p></div>
        </header>
        <div className="info-boxes">
          <section className="info-box"><h3>BILLED TO <span lang="si">(පාරිභෝගිකයා)</span></h3><p><b>{draft.customer}</b></p><p>{draft.address}</p><p>Contact: {draft.phone}</p></section>
          <section className="info-box"><h3>ORDER SUMMARY <span lang="si">(ඇණවුම් විස්තර)</span></h3><p><b>Total Items:</b> {calculated.qty} {draft.itemType}</p><p><b>Designs:</b> {draft.designs}</p><p><b>Fulfillment:</b> {draft.fulfillment}</p></section>
        </div>
        <table className="invoice-table">
          <colgroup><col style={{ width: '8%' }} /><col style={{ width: '52%' }} /><col style={{ width: '10%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /></colgroup>
          <thead><tr><th>#</th><th>ITEM DESCRIPTION <span lang="si">(විස්තරය)</span></th><th>QTY</th><th>UNIT PRICE<br />(LKR)</th><th>TOTAL<br />(LKR)</th></tr></thead>
          <tbody>{draft.items.slice(start, end).map((item, index) => <tr key={start + index} data-item-index={start + index}><td>{String(start + index + 1).padStart(2, '0')}</td><td>{item.description}<div className="item-detail">{item.detail}</div></td><td>{item.qty}</td><td>{money(item.price)}</td><td>{money(cents(item.price) * Number(item.qty || 0) / 100)}</td></tr>)}</tbody>
        </table>
        {page === pages.length - 1 ? <table className="totals"><tbody>
          <tr><td>Subtotal ({calculated.qty} Items)</td><td>{money(calculated.subtotal / 100)}</td></tr>
          <tr><td>Delivery Charge</td><td>{money(calculated.delivery / 100)}</td></tr>
          <tr><td>Discount / Adjustments</td><td>{money(draft.discount)}</td></tr>
          <tr className="total-due"><td>Total Due (LKR)</td><td>{money(calculated.total / 100)}</td></tr>
        </tbody></table> : <p className="continuation">Continued on the next page →</p>}
        <div className="invoice-bottom">{page === pages.length - 1 ? <>
          <p className="delivery-note"><b>Delivery Method:</b> {deliveryNote(draft)}</p>
          <section className="bank-box"><h3>BANK PAYMENT DETAILS</h3><p><b>Bank Name:</b> {business.bank} &nbsp; | &nbsp; <b>Account No:</b> {business.account} &nbsp; | &nbsp; <b>Branch:</b> {business.branch}</p>{business.paymentNote && <em>{business.paymentNote}</em>}</section>
          <div className="invoice-thanks">Thank you for choosing Leyoza Outfits!<small>For inquiries, contact us at {business.contact}</small></div>
        </> : <ContinuationFooter number={draft.number} />}
        </div>
        {pages.length > 1 && <div className="page-number">Page {page + 1} of {pages.length}</div>}
      </article>
    </div>
  ));
}
