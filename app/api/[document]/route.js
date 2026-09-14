import { store } from '../../../lib/store.js';
import { validateBusiness, validateDraft } from '../../../lib/invoice.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const validators = { business: validateBusiness, draft: validateDraft };
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request, { params }) {
  const { document } = await params;
  if (!Object.hasOwn(validators, document)) return json({ error: 'Not found.' }, 404);
  try { return json(await store.read(document)); }
  catch (error) { console.error('JSON read failed:', error); return json({ error: 'Could not read saved data. Check the data folder and try again.' }, 500); }
}

export async function PUT(request, { params }) {
  const { document } = await params;
  if (!Object.hasOwn(validators, document)) return json({ error: 'Not found.' }, 404);
  const origin = request.headers.get('origin');
  // Next.js may normalize request.url to localhost. Compare with the actual Host.
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get('host') || url.host}`;
  if (origin && origin !== expectedOrigin) return json({ error: 'Cross-origin writes are not allowed.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Expected JSON.' }, 415);
  let value;
  try {
    // Bound the body before parsing to keep the small-file API small.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'A JSON body is required.' }, 400);
    const chunks = []; let size = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > 128000) { await reader.cancel(); return json({ error: 'Request is too large.' }, 413); }
      chunks.push(chunk);
    }
    value = validators[document](JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) { return json({ error: error.message || 'Invalid JSON.' }, 400); }
  try { return json(await store.save(document, value)); }
  catch (error) { console.error('JSON write failed:', error); return json({ error: 'Could not save. Check that the data folder is writable and retry.' }, 500); }
}
