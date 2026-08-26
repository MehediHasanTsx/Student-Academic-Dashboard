'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { feeService, type FeeSummary } from '@/lib/services/fee.service';
import { FEE_TYPE_LABELS, FEE_TYPES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feeSchema, paymentSchema, type FeeFormData, type PaymentFormData } from '@/schemas/fee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Fee, Payment, FeeType, FeeStatus } from '@/types/database';

export default function FeesPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'fee' | 'payment'; id: string; name: string } | null>(null);

  const loadData = async () => {
    if (!semesterId) return;
    const [f, p] = await Promise.all([
      feeService.getBySemester(semesterId),
      feeService.getPaymentsBySemester(semesterId),
    ]);
    setFees(f);
    setPayments(p);
    setSummary(feeService.calculateSummary(f, p));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadData();
  }, [semesterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteFee = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'fee') await feeService.deleteFee(deleteTarget.id);
      else await feeService.deletePayment(deleteTarget.id);
      toast.success('Deleted successfully.');
      setDeleteTarget(null);
      await loadData();
    } catch { toast.error('Failed to delete.'); }
  };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
        <p className="text-sm text-muted-foreground">Semester {profile.currentSemester}</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Total Fees</p><p className="text-2xl font-bold">{formatCurrency(summary?.totalFees || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Paid</p><p className="text-2xl font-bold text-green-500">{formatCurrency(summary?.totalPaid || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Pending</p><p className="text-2xl font-bold text-amber-500">{formatCurrency(summary?.totalPending || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Balance</p><p className={`text-2xl font-bold ${(summary?.remaining || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(summary?.remaining || 0)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="fees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
              <Button size="sm" onClick={() => setFeeDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Fee</Button>
              <DialogContent><FeeForm onSubmit={async (data) => {
                if (!semesterId) return;
                await feeService.createFee(semesterId, data);
                toast.success('Fee added.');
                setFeeDialogOpen(false);
                await loadData();
              }} onCancel={() => setFeeDialogOpen(false)} /></DialogContent>
            </Dialog>
          </div>
          {fees.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No fees recorded yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <Card key={fee.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{FEE_TYPE_LABELS[fee.type]}</p>
                      <p className="text-xs text-muted-foreground">{fee.note || 'No note'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'partial' ? 'secondary' : 'destructive'} className="text-xs capitalize">{fee.status}</Badge>
                      <p className="text-sm font-bold">{formatCurrency(fee.amount)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'fee', id: fee.id, name: FEE_TYPE_LABELS[fee.type] })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Payment</Button>
              <DialogContent><PaymentForm onSubmit={async (data) => {
                if (!semesterId) return;
                await feeService.createPayment(semesterId, data);
                toast.success('Payment recorded.');
                setPaymentDialogOpen(false);
                await loadData();
              }} onCancel={() => setPaymentDialogOpen(false)} /></DialogContent>
            </Dialog>
          </div>
          {payments.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No payments recorded yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.date)} {p.method ? `· ${p.method}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.note && <p className="text-xs text-muted-foreground max-w-37.5 truncate">{p.note}</p>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'payment', id: p.id, name: formatCurrency(p.amount) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteFee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FeeForm({ onSubmit, onCancel }: { onSubmit: (data: FeeFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FeeFormData>({
    resolver: zodResolver(feeSchema),
    defaultValues: { type: 'semester', amount: 0, status: 'pending', note: '' },
  });
  const doSubmit = async (data: FeeFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>Add Fee</DialogTitle><DialogDescription>Record a new fee for this semester.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        {/* eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() pattern */}
        <div className="space-y-2"><Label>Fee Type</Label><Select value={watch('type')} onValueChange={(v) => { if (v) setValue('type', v as FeeType); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FEE_TYPES.map(t => <SelectItem key={t} value={t}>{FEE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />{errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}</div>
        <div className="space-y-2"><Label>Status</Label><Select value={watch('status')} onValueChange={(v) => { if (v) setValue('status', v as FeeStatus); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Note</Label><Textarea placeholder="Optional note" {...register('note')} /></div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Fee'}</Button></DialogFooter>
    </form>
  );
}

function PaymentForm({ onSubmit, onCancel }: { onSubmit: (data: PaymentFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: 0, date: new Date().toISOString().split('T')[0], method: '', note: '' },
  });
  const doSubmit = async (data: PaymentFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>Add Payment</DialogTitle><DialogDescription>Record a payment.</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Amount (৳)</Label><Input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />{errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}</div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" {...register('date')} />{errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}</div>
        <div className="space-y-2"><Label>Method</Label><Input placeholder="e.g. Bank Transfer, Cash" {...register('method')} /></div>
        <div className="space-y-2"><Label>Note</Label><Textarea placeholder="Optional note" {...register('note')} /></div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Payment'}</Button></DialogFooter>
    </form>
  );
}
