'use client';

import { useState } from 'react';
import Modal from './Modal';
import { businessFields } from '../lib/invoice.js';

export default function BusinessModal({ business, onSave, onClose }) {
  const [values, setValues] = useState({ ...business });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(values); onClose(); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <Modal id="business-modal" title="Business settings" subtitle="Save your details once. Use them on every invoice." onClose={onClose} busy={busy}
    footer={<><button type="button" className="btn btn-light" onClick={onClose} disabled={busy}>Cancel</button><button className="btn btn-gold" form="business-form" type="submit" disabled={busy}><i className="bi bi-check2" aria-hidden="true" /> {busy ? 'Saving…' : 'Save settings'}</button></>}>
    <form id="business-form" onSubmit={submit}><fieldset disabled={busy}><div className="row g-3">
      {Object.entries(businessFields).map(([key, field]) => <div key={key} className={['account', 'branch'].includes(key) ? 'col-sm-6' : 'col-12'}>
        <label className="form-label" htmlFor={key}>{field.label}{field.optional && <span className="optional-label">Optional</span>}</label>
        {key === 'paymentNote' ? <><textarea id={key} className="form-control" rows="3" maxLength={field.max} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} placeholder="Additional payment instructions" /><small className="field-help">Leave blank to hide this note on the invoice.</small></>
          : <input id={key} className="form-control" type={key === 'contact' ? 'tel' : 'text'} maxLength={field.max} required value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} />}
      </div>)}
    </div></fieldset>{error && <p className="save-error mt-3" role="alert">{error}</p>}</form>
  </Modal>;
}
