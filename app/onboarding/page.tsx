'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileFormData } from '@/schemas/profile';
import { profileService } from '@/lib/services/profile.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, ArrowRight, ArrowLeft, User, School } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      university: '',
      department: '',
      studentId: '',
      rollNumber: '',
      registrationNumber: '',
      batch: '',
      session: '',
      phoneNumber: '',
      email: '',
      bloodGroup: '',
      emergencyContact: '',
      currentSemester: 1,
    },
  });

  const steps = [
    {
      title: 'Personal Information',
      description: 'Let\'s start with your basic details.',
      icon: User,
      fields: ['fullName', 'phoneNumber', 'email', 'bloodGroup', 'emergencyContact'] as const,
    },
    {
      title: 'Academic Information',
      description: 'Tell us about your university.',
      icon: School,
      fields: ['university', 'department', 'studentId', 'rollNumber', 'registrationNumber'] as const,
    },
    {
      title: 'Batch & Semester',
      description: 'Almost done! Just a few more details.',
      icon: GraduationCap,
      fields: ['batch', 'session', 'currentSemester'] as const,
    },
  ];

  const currentStep = steps[step];

  const handleNext = async () => {
    const fieldsToValidate = currentStep.fields as unknown as (keyof ProfileFormData)[];
    const valid = await trigger(fieldsToValidate);
    if (valid && step < steps.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    try {
      await profileService.create({
        fullName: data.fullName,
        university: data.university,
        department: data.department,
        studentId: data.studentId,
        rollNumber: data.rollNumber,
        registrationNumber: data.registrationNumber,
        batch: data.batch,
        session: data.session,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        bloodGroup: data.bloodGroup || undefined,
        emergencyContact: data.emergencyContact || undefined,
        currentSemester: data.currentSemester,
      });
      toast.success('Profile created successfully!');
      router.replace('/');
    } catch (err) {
      toast.error('Failed to create profile. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() pattern
  const currentSemester = watch('currentSemester');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Student Academic Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your profile to get started
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 transition-colors ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <currentStep.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                  <CardDescription>{currentStep.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Step 0: Personal */}
                  {step === 0 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input id="fullName" placeholder="Enter your full name" {...register('fullName')} />
                        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number *</Label>
                        <Input id="phoneNumber" placeholder="01XXXXXXXXX" {...register('phoneNumber')} />
                        {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email (optional)</Label>
                        <Input id="email" type="email" placeholder="your@email.com" {...register('email')} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="bloodGroup">Blood Group</Label>
                          <Select
                            value={watch('bloodGroup') || ''}
                            onValueChange={(v) => { if (v) setValue('bloodGroup', v); }}
                          >
                            <SelectTrigger id="bloodGroup">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOOD_GROUPS.map((bg) => (
                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContact">Emergency Contact</Label>
                          <Input id="emergencyContact" placeholder="Phone" {...register('emergencyContact')} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 1: Academic */}
                  {step === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="university">University *</Label>
                        <Input id="university" placeholder="University name" {...register('university')} />
                        {errors.university && <p className="text-xs text-destructive">{errors.university.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Input id="department" placeholder="e.g. Computer Science & Engineering" {...register('department')} />
                        {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID *</Label>
                        <Input id="studentId" placeholder="Your student ID" {...register('studentId')} />
                        {errors.studentId && <p className="text-xs text-destructive">{errors.studentId.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rollNumber">Roll Number *</Label>
                          <Input id="rollNumber" placeholder="Roll no." {...register('rollNumber')} />
                          {errors.rollNumber && <p className="text-xs text-destructive">{errors.rollNumber.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber">Registration No. *</Label>
                          <Input id="registrationNumber" placeholder="Reg. no." {...register('registrationNumber')} />
                          {errors.registrationNumber && <p className="text-xs text-destructive">{errors.registrationNumber.message}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 2: Batch & Semester */}
                  {step === 2 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="batch">Batch *</Label>
                          <Input id="batch" placeholder="e.g. 15th" {...register('batch')} />
                          {errors.batch && <p className="text-xs text-destructive">{errors.batch.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="session">Session *</Label>
                          <Input id="session" placeholder="e.g. 2022-2023" {...register('session')} />
                          {errors.session && <p className="text-xs text-destructive">{errors.session.message}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currentSemester">Current Semester *</Label>
                        <Select
                          value={String(currentSemester)}
                          onValueChange={(v) => { if (v) setValue('currentSemester', parseInt(v, 10)); }}
                        >
                          <SelectTrigger id="currentSemester">
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                Semester {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.currentSemester && <p className="text-xs text-destructive">{errors.currentSemester.message}</p>}
                      </div>
                      <div className="rounded-lg border border-border bg-muted/50 p-4">
                        <p className="text-xs text-muted-foreground">
                          <strong>Your data stays on your device.</strong> No account needed.
                          No data is sent to any server. You can export a backup anytime from Settings.
                        </p>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="mt-6 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 0}
                  className={step === 0 ? 'invisible' : ''}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {step < steps.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
