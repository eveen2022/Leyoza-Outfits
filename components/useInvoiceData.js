'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

async function request(document, value) {
  const response = await fetch(`/api/${document}`, value === undefined ? { cache: 'no-store' } : {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request failed. Please retry.');
  return result;
}

export default function useInvoiceData() {
  const [draft, setDraft] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('Loading saved data…');
  const [saveError, setSaveError] = useState('');
  const latest = useRef(null);
  const saved = useRef('');
  const queue = useRef(Promise.resolve());
  const dirty = useRef(false);
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoadError('');
    try {
      const [draft, business] = await Promise.all([request('draft'), request('business')]);
      if (generation !== loadGeneration.current) return;
      saved.current = JSON.stringify(draft); latest.current = draft;
      setDraft(draft); setBusiness(business); setStatus('All changes saved');
    } catch (error) { if (generation === loadGeneration.current) setLoadError(error.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveNow = useCallback(() => {
    const snapshot = latest.current;
    if (!snapshot) return Promise.resolve();
    const serialized = JSON.stringify(snapshot);
    const operation = queue.current.catch(() => {}).then(async () => {
      // A newer edit can supersede a queued snapshot before it starts writing.
      if (serialized !== JSON.stringify(latest.current)) return;
      if (serialized === saved.current) { dirty.current = false; setStatus('All changes saved'); setSaveError(''); return; }
      setStatus('Saving…');
      try {
        await request('draft', snapshot);
        saved.current = serialized;
        if (serialized === JSON.stringify(latest.current)) {
          dirty.current = false; setStatus('All changes saved'); setSaveError('');
        }
      } catch (error) { setStatus('Changes not saved'); setSaveError(error.message); throw error; }
    });
    queue.current = operation;
    return operation;
  }, []);

  function updateDraft(update) {
    const value = typeof update === 'function' ? update(latest.current) : update;
    latest.current = value; dirty.current = true;
    setDraft(value); setStatus('Unsaved changes'); setSaveError('');
  }

  useEffect(() => {
    // Queue reversions too: an older request may still be saving a different value.
    if (!draft || !dirty.current) return;
    const timeout = setTimeout(() => { saveNow().catch(() => {}); }, 500);
    return () => clearTimeout(timeout);
  }, [draft, saveNow]);

  useEffect(() => {
    const beforeUnload = event => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  async function saveBusiness(value) {
    const result = await request('business', value);
    setBusiness(result);
  }
  return { draft, business, updateDraft, saveBusiness, saveNow, status, saveError, loadError, reload: load };
}
