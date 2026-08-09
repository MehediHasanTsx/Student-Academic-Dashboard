import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Note } from '@/types/database';

export const noteService = {
  async getAll(): Promise<Note[]> {
    return db.notes.orderBy('updatedAt').reverse().toArray();
  },

  async getBySemester(semesterId: string): Promise<Note[]> {
    return db.notes.where('semesterId').equals(semesterId).reverse().sortBy('updatedAt');
  },

  async getById(id: string): Promise<Note | undefined> {
    return db.notes.get(id);
  },

  async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const now = new Date();
    const note: Note = { ...data, id: generateId(), createdAt: now, updatedAt: now };
    await db.notes.add(note);
    return note;
  },

  async update(id: string, data: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<void> {
    await db.notes.update(id, { ...data, updatedAt: new Date() });
  },

  async delete(id: string): Promise<void> {
    await db.notes.delete(id);
  },

  async search(query: string): Promise<Note[]> {
    const q = query.toLowerCase();
    return db.notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .toArray();
  },
};
