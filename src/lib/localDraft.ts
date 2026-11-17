const databaseName = "syun-archive-drafts";
const maxAge = 30 * 86400_000;
export type LocalDraft<T> = { value: T; savedAt: number; revision?: string };
type Asset = { key: string; draftKey: string; file: File };
type Photo = Record<string, unknown>;
let connection: Promise<IDBDatabase> | undefined;

function object(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function photos(value: unknown): Photo[] { return object(value) && Array.isArray(value.photos) ? value.photos.filter(object) : []; }
function deleteAssets(store: IDBObjectStore, key: IDBValidKey, keep = new Set<string>()) {
  const request = store.index("draftKey").openCursor(IDBKeyRange.only(key));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    if (!keep.has(String(cursor.primaryKey))) cursor.delete();
    cursor.continue();
  };
}
function pruneExpired(db: IDBDatabase) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["drafts", "photos"], "readwrite");
    const request = tx.objectStore("drafts").index("savedAt").openCursor(IDBKeyRange.upperBound(Date.now() - maxAge));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      deleteAssets(tx.objectStore("photos"), cursor.primaryKey);
      cursor.delete(); cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
function openDatabase() {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      let failed = false;
      const request = indexedDB.open(databaseName, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        const drafts = db.objectStoreNames.contains("drafts") ? request.transaction!.objectStore("drafts") : db.createObjectStore("drafts");
        if (!drafts.indexNames.contains("savedAt")) drafts.createIndex("savedAt", "savedAt");
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "key" }).createIndex("draftKey", "draftKey");
      };
      request.onsuccess = () => {
        const db = request.result;
        if (failed) { db.close(); return; }
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
      request.onerror = () => { failed = true; reject(request.error); };
      request.onblocked = () => { failed = true; reject(new Error("다른 탭을 닫은 뒤 임시 저장을 다시 확인해 주세요.")); };
    }).then(async (db) => {
      try { await pruneExpired(db); return db; } catch (error) { db.close(); throw error; }
    }).catch((error) => { connection = undefined; throw error; });
  }
  return connection;
}

export async function draftStorage<T>(key: string, operation: "read" | "write" | "delete", draft?: LocalDraft<T>): Promise<LocalDraft<T> | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["drafts", "photos"], operation === "read" ? "readonly" : "readwrite");
    const store = tx.objectStore("drafts");
    const assets = tx.objectStore("photos");
    let result: LocalDraft<T> | undefined;
    let readError: Error | undefined;
    if (operation === "delete") {
      store.delete(key); deleteAssets(assets, key);
    } else if (operation === "write" && draft) {
      const keep = new Set<string>();
      const encoded = photos(draft.value).map((photo) => {
        if (!(photo.file instanceof File)) return photo;
        const file = photo.file;
        const fileKey = JSON.stringify([key, photo.id, file.name, file.size, file.type, file.lastModified]);
        keep.add(fileKey);
        // Check existence without reading/copying the stored photo blob.
        const existing = assets.getKey(fileKey);
        existing.onsuccess = () => {
          try { if (existing.result === undefined) assets.put({ key: fileKey, draftKey: key, file } satisfies Asset); }
          catch (error) { readError = error instanceof Error ? error : new Error("사진을 임시 저장하지 못했습니다."); tx.abort(); }
        };
        const { file: _file, ...metadata } = photo;
        void _file;
        return { ...metadata, fileKey };
      });
      const value = object(draft.value) && Array.isArray(draft.value.photos) ? { ...draft.value, photos: encoded } : draft.value;
      store.put({ ...draft, value }, key);
      deleteAssets(assets, key, keep);
    } else {
      const request = store.get(key);
      request.onsuccess = () => {
        result = request.result;
        for (const photo of photos(result?.value)) {
          // Version 1 drafts already contain Files and remain readable.
          if (typeof photo.fileKey !== "string") continue;
          const asset = assets.get(photo.fileKey);
          asset.onsuccess = () => {
            if (!asset.result?.file) { readError = new Error("임시 저장한 사진을 읽지 못했습니다."); return; }
            photo.file = (asset.result as Asset).file;
            delete photo.fileKey;
          };
        }
      };
    }
    tx.oncomplete = () => readError ? reject(readError) : resolve(result);
    tx.onerror = tx.onabort = () => reject(tx.error ?? readError);
  });
}
