const databaseName = "syun-archive-drafts";
const storeName = "drafts";
export type LocalDraft<T> = { value: T; savedAt: number; revision?: string };

export async function draftStorage<T>(key: string, operation: "read" | "write" | "delete", value?: LocalDraft<T>): Promise<LocalDraft<T> | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("임시 저장소를 열 수 없습니다."));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, operation === "read" ? "readonly" : "readwrite");
      const store = tx.objectStore(storeName);
      const request = operation === "read" ? store.get(key) : operation === "write" ? store.put(value, key) : store.delete(key);
      tx.oncomplete = () => resolve(operation === "read" ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
