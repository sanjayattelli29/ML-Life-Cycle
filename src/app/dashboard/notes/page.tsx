"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteDialog } from "@/components/NoteDialog";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Clock,
  Loader2
} from "lucide-react";

interface Note {
  _id: string;
  title: string;
  content: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | undefined>();
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      const filtered = notes.filter(note =>
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes(notes);
    }
  }, [searchTerm, notes]);  const fetchNotes = async () => {
    if (!session?.user?.email) {
      toast({
        title: "Error",
        description: "You must be signed in to view notes",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/notes');
      const data = await response.json();
      
      if (response.ok) {
        setNotes(data);
        setNotesLoaded(true);
        
        if (data.length === 0) {
          toast({
            description: "No notes found. Create your first note to get started!",
          });
        } else {
          toast({
            title: "Success",
            description: `${data.length} note${data.length === 1 ? '' : 's'} loaded`,
          });
        }
      } else {
        console.error('Error response:', data);
        setNotesLoaded(true); // Still mark as loaded so we show the empty state
        toast({
          description: "Start by creating your first note!",
        });
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setNotesLoaded(true); // Still mark as loaded so we show the empty state
      toast({
        description: "Start by creating your first note!",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleCreateNote = async (noteData: Partial<Note>) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create note');
      }
      
      setNotes(prev => [data, ...prev]);
      return data;
      
    } catch (error) {
      console.error('Error creating note:', error);
      throw error instanceof Error ? error : new Error('Failed to create note');
    }
  };

  const handleUpdateNote = async (noteData: Partial<Note>) => {
    if (!selectedNote?._id) return;

    try {
      const response = await fetch(`/api/notes/${selectedNote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      });
      
      if (!response.ok) throw new Error('Failed to update note');
      
      const updatedNote = await response.json();
      setNotes(prev => prev.map(note => 
        note._id === selectedNote._id ? updatedNote : note
      ));
      
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete note');
      
      setNotes(prev => prev.filter(note => note._id !== noteId));
      toast({
        title: "Note deleted",
        description: "The note has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (note?: Note) => {
    setSelectedNote(note);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black">Notes</h1>
            <p className="text-gray-700 mt-1">Keep track of your observations and insights</p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            <Plus className="h-4 w-4" />
            New Note
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
          <Input
            className="pl-10 bg-white border-gray-300 text-black placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>        {/* Notes Grid */}
        {!notesLoaded ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Personal Notes Space</h3>
              <p className="text-gray-600 mb-4">Load your notes or create a new one to get started</p>
              <Button 
                onClick={fetchNotes}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading Notes...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Load My Notes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">No Notes Yet</h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                {searchTerm 
                  ? "No notes match your search. Try a different term?"
                  : "Start capturing your thoughts and insights. Create your first note!"}
              </p>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Create Your First Note
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note._id} className="relative group hover:shadow-lg transition-shadow bg-white border-gray-200 text-black">
                <CardHeader className="bg-white">
                  <CardTitle className="line-clamp-2 text-black">{note.title}</CardTitle>
                  <CardDescription className="line-clamp-2 text-gray-700">{note.content}</CardDescription>
                </CardHeader>
                <CardContent className="bg-white">
                  {note.url && (
                    <a
                      href={note.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {new URL(note.url).hostname}
                    </a>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-white">
                  <div className="flex items-center gap-1 text-gray-600 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(note)}
                      className="text-gray-700 hover:text-black hover:bg-gray-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNote(note._id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <NoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          note={selectedNote}
          onSave={selectedNote ? handleUpdateNote : handleCreateNote}
        />
      </div>
    </div>
  );
}