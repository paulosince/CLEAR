// Local-first journal: each mutation and its outbox entry commit in one IndexedDB transaction.
// No experiment or organism behavior is implemented here.
export function createLocalStore(idb = globalThis.indexedDB) {
  if (!idb) throw new Error('IndexedDB unavailable');
  let connection;
  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = idb.open('clear-laboratory-v1', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('records')) {
          const records = db.createObjectStore('records', { keyPath: 'key' });
          records.createIndex('owner', 'owner', { unique: false });
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
          outbox.createIndex('owner', 'owner', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(request.error); };
      request.onblocked = () => { connection = null; reject(new Error('IndexedDB upgrade blocked')); };
    });
    return connection;
  }
  function completed(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Local transaction aborted'));
    });
  }
  function result(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  function requireOwner(owner) {
    if (typeof owner !== 'string' || !owner.trim()) throw new TypeError('Authenticated owner required');
  }
  async function enqueueNew(owner, key, action, data) {
    requireOwner(owner);
    const db = await open();
    const tx = db.transaction(['records', 'outbox'], 'readwrite');
    tx.objectStore('records').add({ key, owner, action, data });
    tx.objectStore('outbox').add({ owner, action, data });
    await completed(tx);
  }
  async function saveRun(owner, run) {
    if (!run?.id) throw new TypeError('Run id required');
    return enqueueNew(owner, owner + ':run:' + run.id, 'create_run', run);
  }
  async function saveChunk(owner, chunk) {
    if (!chunk?.run_id || !Number.isInteger(chunk.ordinal) || chunk.ordinal < 0) {
      throw new TypeError('Valid chunk run_id and ordinal required');
    }
    return enqueueNew(owner, owner + ':chunk:' + chunk.run_id + ':' + chunk.ordinal, 'create_chunk', chunk);
  }
  async function queueClose(owner, runId) {
    requireOwner(owner);
    if (!runId) throw new TypeError('Run id required');
    const db = await open();
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').add({ owner, action: 'close_run', data: { id: runId } });
    await completed(tx);
  }
  async function pending(owner) {
    requireOwner(owner);
    const db = await open();
    const tx = db.transaction('outbox', 'readonly');
    const rows = await result(tx.objectStore('outbox').index('owner').getAll(owner));
    await completed(tx);
    return rows.sort((a, b) => a.id - b.id);
  }
  async function acknowledge(id) {
    const db = await open();
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').delete(id);
    await completed(tx);
  }
  async function ownRecords(owner) {
    requireOwner(owner);
    const db = await open();
    const tx = db.transaction('records', 'readonly');
    const rows = await result(tx.objectStore('records').index('owner').getAll(owner));
    await completed(tx);
    return rows;
  }
  return Object.freeze({ saveRun, saveChunk, queueClose, pending, acknowledge, ownRecords });
}
