import { openDB, IDBPDatabase } from 'idb';
import { BusinessCard, Category } from '../types';
import { addDebugLog } from './logger';

const DB_NAME = 'firecard_db';
const STORE_CARDS = 'cards';
const STORE_CATEGORIES = 'categories';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export const localStore = {
  async getCards(): Promise<BusinessCard[]> {
    const db = await getDB();
    const cards = await db.getAll(STORE_CARDS);
    return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async saveCard(card: BusinessCard) {
    const db = await getDB();
    await db.put(STORE_CARDS, card);
    addDebugLog(`Card salvata localmente: ${card.name}`);
  },

  async deleteCard(id: string) {
    const db = await getDB();
    await db.delete(STORE_CARDS, id);
    addDebugLog(`Card eliminata localmente: ${id}`);
  },

  cachedCategories: [] as Category[],

  async getCategories(): Promise<Category[]> {
    const db = await getDB();
    const list = await db.getAll(STORE_CATEGORIES);
    this.cachedCategories = list;
    return list;
  },

  getCachedCategories() {
    return this.cachedCategories;
  },

  async saveCategory(category: Category) {
    const db = await getDB();
    await db.put(STORE_CATEGORIES, category);
    addDebugLog(`Categoria salvata localmente: ${category.name}`);
  },

  async deleteCategory(id: string) {
    const db = await getDB();
    await db.delete(STORE_CATEGORIES, id);
    addDebugLog(`Categoria eliminata localmente: ${id}`);
  }
};
