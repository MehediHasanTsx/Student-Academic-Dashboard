import { db } from '@/lib/db/database';
import { generateId } from '@/lib/utils/formatters';
import type { Fee, Payment, FeeStatus } from '@/types/database';

export interface FeeSummary {
  totalFees: number;
  totalPaid: number;
  remainingDue: number;
  remaining: number; // Backwards compatible alias for remainingDue
  paidFeesCount: number;
  pendingFeesCount: number;
}

export const feeService = {
  async getBySemester(semesterId: string): Promise<Fee[]> {
    return db().fees.where('semesterId').equals(semesterId).toArray();
  },

  async getAll(): Promise<Fee[]> {
    return db().fees.toArray();
  },

  async createFee(semesterId: string, data: Omit<Fee, 'id' | 'semesterId' | 'createdAt' | 'updatedAt'>): Promise<Fee> {
    const now = new Date();
    const fee: Fee = { ...data, id: generateId(), semesterId, createdAt: now, updatedAt: now };
    await db().fees.add(fee);
    return fee;
  },

  async updateFee(id: string, data: Partial<Omit<Fee, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    await db().fees.update(id, { ...data, updatedAt: new Date() });
    await this.syncFeeStatus(id);
  },

  async deleteFee(id: string): Promise<void> {
    await db().transaction('rw', [db().fees, db().payments], async () => {
      await db().payments.where('feeId').equals(id).delete();
      await db().fees.delete(id);
    });
  },

  // ── Payments ──────────────────────────────────────────

  async getPaymentsBySemester(semesterId: string): Promise<Payment[]> {
    return db().payments.where('semesterId').equals(semesterId).sortBy('date');
  },

  async getAllPayments(): Promise<Payment[]> {
    return db().payments.toArray();
  },

  async createPayment(semesterId: string, data: Omit<Payment, 'id' | 'semesterId' | 'createdAt'>): Promise<Payment> {
    const payment: Payment = { ...data, id: generateId(), semesterId, createdAt: new Date() };
    await db().payments.add(payment);

    if (data.feeId) {
      await this.syncFeeStatus(data.feeId);
    }

    return payment;
  },

  async updatePayment(id: string, data: Partial<Omit<Payment, 'id' | 'semesterId' | 'createdAt'>>): Promise<void> {
    const existing = await db().payments.get(id);
    await db().payments.update(id, data);

    if (existing?.feeId) {
      await this.syncFeeStatus(existing.feeId);
    }
    if (data.feeId && data.feeId !== existing?.feeId) {
      await this.syncFeeStatus(data.feeId);
    }
  },

  async deletePayment(id: string): Promise<void> {
    const payment = await db().payments.get(id);
    await db().payments.delete(id);
    if (payment?.feeId) {
      await this.syncFeeStatus(payment.feeId);
    }
  },

  /**
   * Automatically updates fee status based on all payments linked to it.
   */
  async syncFeeStatus(feeId: string): Promise<void> {
    const fee = await db().fees.get(feeId);
    if (!fee) return;

    const payments = await db().payments.where('feeId').equals(feeId).toArray();
    const paidSoFar = payments.reduce((sum, p) => sum + p.amount, 0);

    let status: FeeStatus = 'pending';
    if (paidSoFar >= fee.amount && fee.amount > 0) {
      status = 'paid';
    } else if (paidSoFar > 0) {
      status = 'partial';
    }

    await db().fees.update(feeId, { status, updatedAt: new Date() });
  },

  // ── Summaries ─────────────────────────────────────────

  calculateSummary(fees: Fee[], payments: Payment[]): FeeSummary {
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingDue = Math.max(0, totalFees - totalPaid);
    const paidFeesCount = fees.filter((f) => f.status === 'paid').length;
    const pendingFeesCount = fees.filter((f) => f.status !== 'paid').length;

    return {
      totalFees,
      totalPaid,
      remainingDue,
      remaining: remainingDue,
      paidFeesCount,
      pendingFeesCount,
    };
  },
};
