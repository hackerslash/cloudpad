// IndexedDB layer for cloudpad. No frameworks — just promises around IDB.
const DB_NAME = 'notepad';
const DB_VERSION = 1;
const STORE = 'files';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
        s.createIndex('pinned', 'pinned');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const NotepadDB = {
  async listSync() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const store = t.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },
  async create({ name = 'untitled', title = name, body = '' } = {}) {
    const now = Date.now();
    const file = { id: uid(), name, title, body, pinned: 0, createdAt: now, updatedAt: now };
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(file);
      t.oncomplete = () => resolve(file);
      t.onerror = () => reject(t.error);
    });
  },
  async update(id, patch) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const store = t.objectStore(STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(null);
        const next = { ...cur, ...patch, updatedAt: Date.now() };
        store.put(next);
        t.oncomplete = () => resolve(next);
      };
      t.onerror = () => reject(t.error);
    });
  },
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  },
  async replaceAll(files) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const store = t.objectStore(STORE);
      store.clear();
      for (const f of files) store.put(f);
      t.oncomplete = () => resolve(true);
      t.onerror = () => reject(t.error);
    });
  },
};

export default NotepadDB;
