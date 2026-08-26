'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubjects } from '@/lib/hooks/useSubjects';
import { noteService } from '@/lib/services/note.service';
import { formatDate } from '@/lib/utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { noteSchema, type NoteFormData } from '@/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, StickyNote, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Note } from '@/types/database';

export default function NotesPage() {
  const { profile } = useProfile();
  const semesterId = profile ? `semester-${profile.currentSemester}` : undefined;
  const { subjects } = useSubjects(semesterId);
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const loadData = async () => {
    if (search) {
      const data = await noteService.search(search);
      setNotes(data);
    } else {
      const data = await noteService.getAll();
      setNotes(data);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching from IndexedDB
    void loadData();
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = (note: Note) => { setEditingNote(note); setDialogOpen(true); };

  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingNote(null); }}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New Note</Button>
          <DialogContent className="max-w-lg">
            <NoteForm
              note={editingNote}
              subjects={subjects}
              semesterId={semesterId}
              onSubmit={async (data) => {
                if (editingNote) { await noteService.update(editingNote.id, data); toast.success('Note updated.'); }
                else { await noteService.create(data); toast.success('Note created.'); }
                setDialogOpen(false); setEditingNote(null); await loadData();
              }}
              onCancel={() => { setDialogOpen(false); setEditingNote(null); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {notes.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground">{search ? 'No notes found.' : 'No notes yet.'}</p></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {notes.map((note) => {
            const subject = subjects.find((s) => s.id === note.subjectId);
            return (
              <Card key={note.id} className="group cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleEdit(note)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium truncate flex-1">{note.title}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEdit(note); }}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(note); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{note.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {subject && <span>{subject.name}</span>}
                    <span>·</span>
                    <span>{formatDate(note.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete note?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { if (deleteTarget) { await noteService.delete(deleteTarget.id); toast.success('Deleted.'); setDeleteTarget(null); await loadData(); }}} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NoteForm({ note, subjects, semesterId, onSubmit, onCancel }: { note: Note | null; subjects: { id: string; name: string }[]; semesterId?: string; onSubmit: (data: NoteFormData) => Promise<void>; onCancel: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: note?.title || '', content: note?.content || '', semesterId: note?.semesterId || semesterId, subjectId: note?.subjectId || '' },
  });
  const doSubmit = async (data: NoteFormData) => { setSubmitting(true); try { await onSubmit(data); } finally { setSubmitting(false); } };
  return (
    <form onSubmit={handleSubmit(doSubmit)}>
      <DialogHeader><DialogTitle>{note ? 'Edit Note' : 'New Note'}</DialogTitle><DialogDescription>{note ? 'Update your note.' : 'Create a new note.'}</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2"><Label>Title *</Label><Input placeholder="Note title" {...register('title')} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
        {/* eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() pattern */}
        <div className="space-y-2"><Label>Subject</Label><Select value={watch('subjectId') || 'none'} onValueChange={(v) => { setValue('subjectId', v === 'none' ? undefined : (v || undefined)); }}><SelectTrigger><SelectValue placeholder="Any subject" /></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Content *</Label><Textarea placeholder="Write your note..." rows={8} {...register('content')} />{errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}</div>
      </div>
      <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : note ? 'Update' : 'Create'}</Button></DialogFooter>
    </form>
  );
}
