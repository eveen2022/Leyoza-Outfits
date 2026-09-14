import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultBusiness, newDraft, validateBusiness, validateDraft } from './invoice.js';

const definitions = {
  business: { file: 'business.json', initial: () => ({ ...defaultBusiness }), validate: validateBusiness },
  draft: { file: 'draft.json', initial: () => newDraft(true), validate: validateDraft },
};

// One queue per process serializes updates. Rename prevents partial JSON writes.
export function createStore(directory) {
  let queue = Promise.resolve();
  function serial(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }
  function definition(kind) {
    if (!Object.hasOwn(definitions, kind)) throw new Error('Unknown storage document.');
    return definitions[kind];
  }
  async function write(kind, data) {
    const { file } = definition(kind);
    await fs.mkdir(directory, { recursive: true });
    const temporary = path.join(directory, `${file}.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
      await fs.rename(temporary, path.join(/* turbopackIgnore: true */ directory, file));
    } finally {
      await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    return data;
  }
  return {
    read(kind) {
      return serial(async () => {
        const { file, initial, validate } = definition(kind);
        try {
          // These are mutable runtime files, not assets to bundle into the build.
          return validate(JSON.parse(await fs.readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ directory, file), 'utf8')));
        } catch (error) {
          if (error.code !== 'ENOENT') throw error; // Never overwrite a damaged file with defaults.
          return write(kind, initial());
        }
      });
    },
    save(kind, value) {
      return serial(() => write(kind, definition(kind).validate(value)));
    },
  };
}

const key = Symbol.for('leyoza.json-store');
export const store = globalThis[key] ??= createStore(path.resolve(/* turbopackIgnore: true */ process.env.INVOICE_DATA_DIR || 'data'));
