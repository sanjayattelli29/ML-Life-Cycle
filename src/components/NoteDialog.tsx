"use client";


import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

interface Note {
  _id?: string;
  title: string;
  content: string;
  url?: string;
}

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: Note;
  onSave: (note: Note) => Promise<void>;
}

export function NoteDialog({ open, onOpenChange, note, onSave }: NoteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Note>({
    title: '',
    content: '',
    url: '',
  });

  useEffect(() => {
    if (note) {
      setFormData(note);
    } else {
      setFormData({ title: '', content: '', url: '' });
    }
  }, [note]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Clean up the form data
      const cleanData = {
        ...formData,
        title: formData.title.trim(),
        content: formData.content.trim(),
        url: formData.url?.trim() || undefined
      };

      await onSave(cleanData);
      onOpenChange(false);
      toast({
        title: note ? "Note updated" : "Note created",
        description: "Your note has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white text-black">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{note ? 'Edit Note' : 'Create New Note'}</DialogTitle>
            <DialogDescription>
              {note ? 'Update your note details below.' : 'Add a new note to your collection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* Left: Title and URL */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter note title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="url">URL (optional)</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right: Content */}
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your note content..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[180px] bg-white text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="bg-gray-100 text-black hover:bg-gray-200"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}