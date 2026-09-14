'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { businessFields, cents, money, newDraft, totals } from '../lib/invoice.js';
import useInvoiceData from './useInvoiceData';
import BusinessModal from './BusinessModal';
import PreviewModal from './PreviewModal';
import InvoicePages, { ContinuationFooter } from './InvoicePages';
import useInvoicePagination from './useInvoicePagination';

function Icon({ name }) { return <i aria-hidden="true" className={`bi bi-${name}`} />; }
function Card({ id, number, title, children }) {
  return <section className="editor-card" id={id}><h2><span>{number}</span> {title}</h2>{children}</section>;
}
function Field({ id, label, value, onChange, type = 'text', ...props }) {
  return <><label className="form-label" htmlFor={id}>{label}</label><input className="form-control" id={id} name={id} type={type} value={value} onChange={event => onChange(type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} {...props} /></>;
}

export default function InvoiceStudio() {
  const { draft, business, updateDraft, saveBusiness, saveNow, status, saveError, loadError, reload } = useInvoiceData();
  const [modal, setModal] = useState(null);
  const form = useRef(null);
  const discount = useRef(null);
  const focusAfterClose = useRef(false);
  const calculated = draft ? totals(draft) : null;
  const pagination = useInvoicePagination(draft, business);

  useEffect(() => {
    if (discount.current) discount.current.setCustomValidity(calculated?.total < 0 ? 'Discount cannot exceed the subtotal plus delivery charge.' : '');
  }, [calculated?.total]);

  useEffect(() => {
    if (!modal && focusAfterClose.current) {
      focusAfterClose.current = false;
      const frame = requestAnimationFrame(() => {
        form.current.querySelector(':invalid')?.scrollIntoView({ block: 'center' });
        form.current.reportValidity();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [modal]);

  const settingsButton = <button type="button" className="btn btn-light" onClick={() => setModal('business')} disabled={!business}><Icon name="gear" /> Business settings</button>;
  const header = <header className="app-header"><div className="brand"><img src="/logo.png" alt="Leyoza Outfits" width="53" height="53" /><div>LEYOZA <span>OUTFITS</span><small>INVOICE STUDIO</small></div></div>{settingsButton}</header>;
  if (!draft || !business) return <>{header}<main className="loading-card"><h1>{loadError ? 'Your saved data could not load.' : 'Opening Invoice Studio…'}</h1><p role={loadError ? 'alert' : 'status'}>{loadError || 'Loading your invoice and business settings.'}</p>{loadError && <button className="btn btn-gold" onClick={reload}>Try again</button>}</main></>;

  function change(key, value) { updateDraft(current => ({ ...current, [key]: value })); }
  function changeItem(index, key, value) { updateDraft(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) })); }
  function selectDelivery(value) { updateDraft(current => ({ ...current, fulfillment: value, delivery: value === 'Store Pickup' ? 0 : current.delivery })); }
  function reset() {
    if (!window.confirm('Start a new invoice? This replaces the current saved draft. Business settings will be kept.')) return;
    updateDraft(newDraft());
    requestAnimationFrame(() => document.getElementById('number')?.focus());
  }
  function validate() {
    // Required text fields must contain more than whitespace.
    for (const input of form.current.querySelectorAll('input[required]:not([type="number"]):not([type="date"])')) {
      input.setCustomValidity(input.value.trim() ? '' : 'Please enter a value.');
    }
    if (form.current.checkValidity()) return true;
    focusAfterClose.current = true; setModal(null); return false;
  }
  const previewButton = (id, extra = '') => <button type="button" id={id} className={`btn btn-gold ${extra}`} onClick={() => setModal('preview')}><Icon name="eye" /> Preview invoice</button>;
  const bound = (key, label, props = {}) => <Field id={key} label={label} value={draft[key]} onChange={value => change(key, value)} {...props} />;

  return <>
    {header}
    <main className="container-fluid workspace">
      <div className="workspace-heading"><div><div className="eyebrow">A LITTLE DETAIL. A LASTING IMPRESSION.</div><h1>Let’s put your order together<span>.</span></h1><p>Create, review, and send. Your next invoice starts here.</p></div><button type="button" className="btn btn-light" id="reset" onClick={reset}><Icon name="file-earmark-plus" /> New invoice</button></div>
      <nav className="section-nav" aria-label="Invoice sections">
        {[['details', 'Details'], ['customer', 'Customer'], ['items', 'Items'], ['delivery', 'Delivery']].map(([id, name], i) => <a href={`#${id}-card`} key={id}><span>0{i + 1}</span> {name}</a>)}
        <span id="save-status" role="status">{status}</span>
      </nav>
      {saveError && <div className="save-error" role="alert">{saveError} <button className="btn btn-light" onClick={() => saveNow().catch(() => {})}>Retry save</button></div>}
      <div className="studio-grid">
        <section className="editor" aria-label="Invoice editor"><form ref={form} id="invoice-form" onSubmit={event => event.preventDefault()}>
          <Card id="details-card" number="01" title="Invoice details"><div className="row g-3">
            <div className="col-sm-6">{bound('number', 'Invoice number', { maxLength: 40, required: true, placeholder: 'Enter invoice number' })}</div>
            <div className="col-sm-6">{bound('date', 'Invoice date', { type: 'date', required: true })}</div>
          </div></Card>
          <Card id="customer-card" number="02" title="Customer & order"><div className="row g-3">
            <div className="col-sm-6">{bound('customer', 'Customer name', { maxLength: 80, required: true, placeholder: 'Customer’s full name' })}</div>
            <div className="col-sm-6">{bound('phone', 'Customer contact', { maxLength: 40, type: 'tel' })}</div>
            <div className="col-12"><label className="form-label" htmlFor="address">Address</label><textarea className="form-control" id="address" name="address" rows="2" maxLength="160" placeholder="Street, city" value={draft.address} onChange={event => change('address', event.target.value)} /></div>
            <div className="col-sm-6">{bound('itemType', 'Item summary', { maxLength: 40 })}</div>
            <div className="col-sm-6">{bound('designs', 'Designs / order reference', { maxLength: 70 })}</div>
          </div></Card>
          <Card id="items-card" number="03" title={<>Line items <small className="currency-pill">PRICES IN LKR</small></>}>
            <div id="item-editors">{draft.items.map((item, index) => <div className="item-editor" key={index}>
              <div className="item-top"><strong>Item {String(index + 1).padStart(2, '0')}</strong><button className="remove-item" type="button" aria-label={`Remove item ${index + 1}`} disabled={draft.items.length === 1} onClick={() => updateDraft(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><Icon name="trash3" /></button></div>
              <label className="visually-hidden" htmlFor={`desc-${index}`}>Item {index + 1} description</label><input className="form-control" id={`desc-${index}`} maxLength="100" required placeholder="Item description" value={item.description} onChange={event => changeItem(index, 'description', event.target.value)} />
              <label className="visually-hidden" htmlFor={`detail-${index}`}>Item {index + 1} details</label><input className="form-control" id={`detail-${index}`} maxLength="100" placeholder="Size, colour, or customization" value={item.detail} onChange={event => changeItem(index, 'detail', event.target.value)} />
              <div className="row g-2"><div className="col-4"><Field id={`qty-${index}`} label="Quantity" type="number" min="1" max="9999" step="1" required value={item.qty} onChange={value => changeItem(index, 'qty', value)} /></div><div className="col-8"><Field id={`price-${index}`} label="Unit price (LKR)" type="number" min="0" max="100000000" step="0.01" required value={item.price} onChange={value => changeItem(index, 'price', value)} /></div></div>
              <div className="item-amount">Amount <strong>{money(cents(item.price) * Number(item.qty || 0) / 100)}</strong></div>
            </div>)}</div>
            <button className="btn add-item w-100" id="add-item" type="button" disabled={draft.items.length >= 100} onClick={() => { const index = draft.items.length; updateDraft(current => ({ ...current, items: [...current.items, { description: '', detail: '', qty: 1, price: 0 }] })); requestAnimationFrame(() => document.getElementById(`desc-${index}`)?.focus()); }}><Icon name="plus-lg" /> Add another item</button>
          </Card>
          <Card id="delivery-card" number="04" title="Delivery & adjustments"><div className="row g-3">
            <div className="col-12"><label className="form-label" htmlFor="fulfillment">Delivery method</label><select className="form-select" id="fulfillment" value={draft.fulfillment} onChange={event => selectDelivery(event.target.value)}><option value="Store Pickup">Customer self-pickup (No delivery charges applied)</option><option value="Delivery">Delivery (Delivery charges applied)</option></select></div>
            {draft.fulfillment === 'Delivery' && <div className="col-sm-6" id="delivery-amount-field">{bound('delivery', 'Delivery amount (LKR)', { type: 'number', min: '0.01', max: '100000000', step: '0.01', required: true })}<small className="field-help">Added to the invoice total.</small></div>}
            <div className="col-sm-6"><label className="form-label" htmlFor="discount">Discount (LKR)</label><input ref={discount} id="discount" className="form-control" type="number" min="0" max="100000000" step="0.01" required value={draft.discount} onChange={event => change('discount', event.target.value === '' ? '' : Number(event.target.value))} /></div>
            <div className="col-12"><p className="delivery-hint"><Icon name={draft.fulfillment === 'Delivery' ? 'truck' : 'bag-check'} /> {draft.fulfillment === 'Delivery' ? 'Enter the delivery amount above. It will be included in the total.' : 'Customer pickup is free. No delivery charge will be added.'}</p></div>
          </div></Card>
        </form></section>
        <aside className="order-sidebar" aria-label="Order overview">
          <section className="summary-card"><div className="summary-heading"><Icon name="receipt" /><span>YOUR INVOICE</span><span className="draft-badge">Draft</span></div><h2>{draft.number || 'New invoice'}</h2><p>{draft.customer || 'Add a customer to get started'}</p>
            <div className="summary-lines"><div><span>Items <small>({calculated.qty})</small></span><strong>{money(calculated.subtotal / 100)}</strong></div><div><span>Delivery</span><strong>{draft.fulfillment === 'Store Pickup' ? 'Free pickup' : money(calculated.delivery / 100)}</strong></div><div><span>Discount</span><strong>{money(draft.discount)}</strong></div></div>
            <div className="summary-total"><span>Total due <small>LKR</small></span><strong id="summary-total">{money(calculated.total / 100)}</strong></div>{previewButton('open-preview', 'w-100')}<p className="summary-note">Review your invoice, then download or print.</p>
          </section>
          <section className="business-card"><div className="section-title"><h2><Icon name="building" /> Business details</h2><button className="settings-link" type="button" aria-label="Edit business details" onClick={() => setModal('business')}><Icon name="gear" /></button></div><p className="business-caption"><Icon name="lock" /> Managed in Business settings</p><dl>{Object.entries(businessFields).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd id={`business-${key}`}>{business[key] || 'Not added'}</dd></div>)}</dl></section>
        </aside>
      </div>
      <div className="mobile-review"><div><small>Total due · LKR</small><strong>{money(calculated.total / 100)}</strong></div>{previewButton('mobile-preview')}</div>
    </main>
    <footer className="app-footer">LEYOZA OUTFITS <span>Redefines your elegance.</span></footer>
    {modal === 'business' && <BusinessModal business={business} onSave={saveBusiness} onClose={() => setModal(null)} />}
    {modal === 'preview' && <PreviewModal draft={draft} business={business} pagination={pagination} onClose={() => setModal(null)} validate={validate} />}
    {createPortal(<>
      <div ref={pagination.measureRef} className="invoice-measure" aria-hidden="true"><InvoicePages draft={draft} business={business} pages={[{ start: 0, end: draft.items.length }]} /><div className="invoice-footer-measure"><ContinuationFooter number={draft.number} /></div></div>
      <div id="print-root" aria-hidden="true"><InvoicePages draft={draft} business={business} pages={pagination.pages} /></div>
    </>, document.body)}
  </>;
}
