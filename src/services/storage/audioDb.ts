/**
 * Audio and check metadata kept across sessions, in IndexedDB, only for the
 * prosodic bilan (S0 / S4 / S8): the recordings must survive so a native can
 * rate them blindly later. Everything else in the app stays in memory only.
 */

const DB_NAME = 'parle-plus-audio'
const DB_VERSION = 1
const STORE = 'entries'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB indisponible'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('indexedDB'))
  })
}

type StoredValue = string | Blob

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('indexedDB'))
        transaction.oncomplete = () => db.close()
        transaction.onerror = () => db.close()
        transaction.onabort = () => db.close()
      }),
  )
}

export function putEntry(key: string, value: StoredValue): Promise<void> {
  return withStore('readwrite', (store) => store.put(value, key) as IDBRequest<unknown>).then(
    () => undefined,
  )
}

export function getEntry(key: string): Promise<StoredValue | null> {
  return withStore('readonly', (store) => store.get(key) as IDBRequest<StoredValue | undefined>).then(
    (value) => value ?? null,
  )
}

export function deleteEntry(key: string): Promise<void> {
  return withStore('readwrite', (store) => store.delete(key) as IDBRequest<unknown>).then(
    () => undefined,
  )
}

export function listEntryKeys(): Promise<string[]> {
  return withStore('readonly', (store) => store.getAllKeys() as IDBRequest<IDBValidKey[]>).then(
    (keys) => keys.map((key) => String(key)),
  )
}

/** JSON helpers: metadata is stored as a JSON string under the same store. */
export async function putJson<T>(key: string, value: T): Promise<void> {
  return putEntry(key, JSON.stringify(value))
}

export async function getJson<T>(key: string): Promise<T | null> {
  const value = await getEntry(key)
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}
