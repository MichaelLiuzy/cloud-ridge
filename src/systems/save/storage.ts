/**
 * 存储：把存档放进浏览器自带的数据库（IndexedDB）。
 * 这一层单独拿出来，是为了以后打包成 iOS / Mac app 时，只换这一个文件就能改用 app 的存储。
 * IndexedDB 用不了时（比如无痕模式），退回 localStorage；再不行就只存在内存里（关掉就没了）。
 */

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const DB_NAME = 'cloud-ridge';
const STORE = 'saves';

class IndexedDbStore implements KeyValueStore {
  private db: Promise<IDBDatabase>;
  constructor() {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async get(key: string) {
    return ((await this.tx('readonly', (s) => s.get(key))) as string | undefined) ?? null;
  }
  async set(key: string, value: string) {
    await this.tx('readwrite', (s) => s.put(value, key));
  }
  async remove(key: string) {
    await this.tx('readwrite', (s) => s.delete(key));
  }
}

class LocalStore implements KeyValueStore {
  async get(key: string) {
    return localStorage.getItem(`${DB_NAME}:${key}`);
  }
  async set(key: string, value: string) {
    localStorage.setItem(`${DB_NAME}:${key}`, value);
  }
  async remove(key: string) {
    localStorage.removeItem(`${DB_NAME}:${key}`);
  }
}

class MemoryStore implements KeyValueStore {
  private m = new Map<string, string>();
  async get(key: string) {
    return this.m.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.m.set(key, value);
  }
  async remove(key: string) {
    this.m.delete(key);
  }
}

/** 依次试：IndexedDB → localStorage → 内存 */
class FallbackStore implements KeyValueStore {
  private chain: KeyValueStore[] = [];
  constructor() {
    try {
      if (typeof indexedDB !== 'undefined') this.chain.push(new IndexedDbStore());
    } catch { /* 用不了就跳过 */ }
    try {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      this.chain.push(new LocalStore());
    } catch { /* 用不了就跳过 */ }
    this.chain.push(new MemoryStore());
  }
  private async attempt<T>(fn: (s: KeyValueStore) => Promise<T>): Promise<T> {
    while (this.chain.length > 1) {
      try {
        return await fn(this.chain[0]);
      } catch {
        this.chain.shift(); // 这种存储坏了，换下一种
      }
    }
    return fn(this.chain[0]);
  }
  get(key: string) {
    return this.attempt((s) => s.get(key));
  }
  set(key: string, value: string) {
    return this.attempt((s) => s.set(key, value));
  }
  remove(key: string) {
    return this.attempt((s) => s.remove(key));
  }
}

export const storage: KeyValueStore = new FallbackStore();
