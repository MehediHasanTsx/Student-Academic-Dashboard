import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Fee, Payment, FeeType } from '@/types/database';

export interface FeeSummary {
  totalFees: number;
  totalPaid: number;
  totalPending: number;
  remaining: number;
}

export const feeService = {
  async getBySemester(semesterId: string): Promise<Fee[]> {
    return db.fees.where('semesterId').equals(semesterId).toArray();
  },

  async getAll(): Promise<Fee[]> {
    return db.fees.toArray();
  },

  async createFee(semesterId: string, data: Omit<Fee, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Fee> {
    const now = new Date();
    const fee: Fee = { ...data, id: generateId(), semesterId, createdAt: now, updatedAt: now };
    await db.fees.add(fee);
    return fee;
  },

  async updateFee(id: string, data: Partial<Omit<Fee, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db.fees.update(id, { ...data, updatedAt: new Date() });
  },

  async deleteFee(id: string): Promise<void> {
    await db.transaction('rw', [db.fees, db.payments], async () => {
      await db.payments.where('feeId').equals(id).delete();
      await db.fees.delete(id);
    });
  },

  // ── Payments ──────────────────────────────────────────

  async getPaymentsBySemester(semesterId: string): Promise<Payment[]> {
    return db.payments.where('semesterId').equals(semesterId).sortBy('date');
  },

  async getAllPayments(): Promise<Payment[]> {
    return db.payments.toArray();
  },

  async createPayment(semesterId: string, data: Omit<Payment, 'id' | 'semesterId' | 'createdAt'>): Promise<Payment> {
    const payment: Payment = { ...data, id: generateId(), semesterId, createdAt: new Date() };
    await db.payments.add(payment);
    return payment;
  },

  async updatePayment(id: string, data: Partial<Omit<Payment, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db.payments.update(id, data);
  },

  async deletePayment(id: string): Promise<void> {
    await db.payments.delete(id);
  },

  // ── Summaries ─────────────────────────────────────────

  calculateSummary(fees: Fee[], payments: Payment[]): FeeSummary {
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = fees
      .filter((f) => f.status !== 'paid')
      .reduce((sum, f) => sum + f.amount, 0);

    return {
      totalFees,
      totalPaid,
      totalPending,
      remaining: totalFees - totalPaid,
    };
  },
};
