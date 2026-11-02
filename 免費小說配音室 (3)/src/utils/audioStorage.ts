/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'fnvs_audio_chunks_db';
const STORE_NAME = 'chunks';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioChunk(
  projectId: string,
  paraId: string,
  audioBuffer: ArrayBuffer
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const key = `${projectId}_${paraId}`;
    store.put(audioBuffer, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioChunk(
  projectId: string,
  paraId: string
): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = `${projectId}_${paraId}`;
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getCombinedProjectAudio(
  projectId: string,
  paraIds: string[]
): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const buffers: ArrayBuffer[] = [];
    let completed = 0;

    if (paraIds.length === 0) {
      resolve(null);
      return;
    }

    paraIds.forEach((pid) => {
      const key = `${projectId}_${pid}`;
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          buffers.push(req.result);
        }
        completed++;
        if (completed === paraIds.length) {
          if (buffers.length === 0) {
            resolve(null);
          } else {
            // Concatenate all MP3 binary chunks into a single valid MP3 Blob
            const blob = new Blob(buffers, { type: 'audio/mpeg' });
            resolve(blob);
          }
        }
      };
      req.onerror = () => {
        completed++;
        if (completed === paraIds.length) {
          resolve(buffers.length > 0 ? new Blob(buffers, { type: 'audio/mpeg' }) : null);
        }
      };
    });
  });
}

export async function clearProjectAudio(projectId: string, paraIds: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    paraIds.forEach((pid) => {
      store.delete(`${projectId}_${pid}`);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
