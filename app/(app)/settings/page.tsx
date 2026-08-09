'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useProfile } from '@/lib/hooks/useProfile';
import { settingsService } from '@/lib/services/settings.service';
import { backupService } from '@/lib/services/backup.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings, Moon, Sun, Monitor, Download, Upload, Trash2, User, GraduationCap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Settings as SettingsType } from '@/types/database';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useProfile();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsService.get().then(setSettings);
  }, []);

  const handleExport = async () => {
    try {
      const { data, filename } = await backupService.exportBackup();
      backupService.downloadFile(data, filename);
      toast.success('Backup exported successfully.');
    } catch {
      toast.error('Failed to export backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = backupService.validateBackup(text);

    if (!result.valid || !result.data) {
      toast.error(result.error || 'Invalid backup file.');
      return;
    }

    try {
      await backupService.importBackup(result.data);
      toast.success('Backup restored. Refreshing...');
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error('Failed to import backup.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    try {
      await backupService.resetApplication();
    } catch {
      toast.error('Failed to reset.');
    }
  };

  const updateSetting = async (key: keyof SettingsType, value: unknown) => {
    await settingsService.update({ [key]: value } as Partial<SettingsType>);
    const updated = await settingsService.get();
    setSettings(updated);
    toast.success('Setting updated.');
  };

  if (!profile || !settings) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your preferences and data</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sun className="h-4 w-4" />Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {[
                { value: 'light', icon: Sun, label: 'Light' },
                { value: 'dark', icon: Moon, label: 'Dark' },
                { value: 'system', icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  variant={theme === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(value)}
                  className="flex-1"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Academic</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Attendance Target (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={settings.attendanceTarget}
                onChange={(e) => updateSetting('attendanceTarget', parseInt(e.target.value) || 75)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Required Credits</Label>
              <Input
                type="number"
                min={1}
                value={settings.totalRequiredCredits}
                onChange={(e) => updateSetting('totalRequiredCredits', parseInt(e.target.value) || 160)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input
                value={settings.currencySymbol}
                onChange={(e) => updateSetting('currencySymbol', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Profile</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {profile.fullName}</div>
            <div><span className="text-muted-foreground">ID:</span> {profile.studentId}</div>
            <div><span className="text-muted-foreground">University:</span> {profile.university}</div>
            <div><span className="text-muted-foreground">Department:</span> {profile.department}</div>
            <div><span className="text-muted-foreground">Batch:</span> {profile.batch}</div>
            <div><span className="text-muted-foreground">Session:</span> {profile.session}</div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />Data Management</CardTitle>
          <CardDescription>Export, import, or reset your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="flex-1">
              <Download className="mr-2 h-4 w-4" /> Export Backup
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
              <Upload className="mr-2 h-4 w-4" /> Import Backup
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
          <Separator />
          <Button variant="destructive" onClick={() => setResetDialogOpen(true)} className="w-full">
            <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Reset Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL your data including profile, attendance records, grades, notes, and settings.
              This action CANNOT be undone. Consider exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground">
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
