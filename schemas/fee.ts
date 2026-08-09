import { z } from 'zod/v4';

const feeTypeEnum = z.enum(['semester', 'admission', 'registration', 'formFillUp', 'exam', 'library', 'lab', 'other']);
const feeStatusEnum = z.enum(['paid', 'partial', 'pending']);

export const feeSchema = z.object({
  type: feeTypeEnum,
  amount: z.number({ message: 'Amount is required' }).min(0),
  dueDate: z.string().optional().or(z.literal('')),
  status: feeStatusEnum,
  note: z.string().max(200).optional().or(z.literal('')),
});

export const paymentSchema = z.object({
  feeId: z.string().optional(),
  amount: z.number({ message: 'Amount is required' }).min(0.01, 'Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  method: z.string().max(50).optional().or(z.literal('')),
  note: z.string().max(200).optional().or(z.literal('')),
});

export type FeeFormData = z.infer<typeof feeSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
