"use client"

import { useEffect, useState, useTransition } from "react"
import type { JSONContent } from "@tiptap/react"

import { createNote, deleteNote, updateNote } from "@/lib/actions/notes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Database } from "@/types/database.types"

import { NoteEditor } from "./note-editor"

type Course = Pick<Database["public"]["Tables"]["courses"]["Row"], "id" | "name" | "color">
type Note = Database["public"]["Tables"]["notes"]["Row"] & {
  courses: Pick<Course, "name" | "color"> | null
}

type Snapshot = { title: string; courseId: string; content: JSONContent }

const EMPTY_DOC: JSONContent = { type: "doc", content: [] }

function snapshotOf(note: Note | null): Snapshot {
  return {
    title: note?.title ?? "",
    courseId: note?.course_id ?? "none",
    content: (note?.content as JSONContent) ?? EMPTY_DOC,
  }
}

export function NotesWorkspace({ notes, courses }: { notes: Note[]; courses: Course[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null

  const [savedSnapshot, setSavedSnapshot] = useState<Snapshot>(snapshotOf(selectedNote))
  const [draftTitle, setDraftTitle] = useState(savedSnapshot.title)
  const [draftCourseId, setDraftCourseId] = useState(savedSnapshot.courseId)
  const [draftContent, setDraftContent] = useState<JSONContent>(savedSnapshot.content)
  const [loadedNoteId, setLoadedNoteId] = useState<string | null>(selectedId)

  // sync draft fields whenever the selected note changes
  if (selectedId !== loadedNoteId) {
    setLoadedNoteId(selectedId)
    const snapshot = snapshotOf(selectedNote)
    setSavedSnapshot(snapshot)
    setDraftTitle(snapshot.title)
    setDraftCourseId(snapshot.courseId)
    setDraftContent(snapshot.content)
  }

  const isDirty =
    !!selectedNote &&
    (draftTitle !== savedSnapshot.title ||
      draftCourseId !== savedSnapshot.courseId ||
      JSON.stringify(draftContent) !== JSON.stringify(savedSnapshot.content))

  // warn before closing/refreshing the tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  function confirmDiscard() {
    return !isDirty || confirm("You have unsaved changes. Discard them?")
  }

  function handleSelectNote(noteId: string) {
    if (noteId === selectedId) return
    if (!confirmDiscard()) return
    setSelectedId(noteId)
  }

  function handleNewNote() {
    if (!confirmDiscard()) return
    setError(null)
    startTransition(async () => {
      const result = await createNote({ title: "Untitled note", courseId: null, content: EMPTY_DOC })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.id) setSelectedId(result.id)
    })
  }

  function handleSave() {
    if (!selectedNote) return
    setError(null)
    const title = draftTitle.trim() || "Untitled note"
    startTransition(async () => {
      const result = await updateNote(selectedNote.id, {
        title,
        courseId: draftCourseId === "none" ? null : draftCourseId,
        content: draftContent,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSavedSnapshot({ title, courseId: draftCourseId, content: draftContent })
    })
  }

  function handleDelete() {
    if (!selectedNote) return
    if (!confirm("Delete this note?")) return
    startTransition(async () => {
      await deleteNote(selectedNote.id)
      setSelectedId(notes.find((n) => n.id !== selectedNote.id)?.id ?? null)
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
      <div className="grid gap-2">
        <Button type="button" onClick={handleNewNote} disabled={isPending} className="w-full">
          New note
        </Button>
        <div className="grid gap-1 overflow-y-auto rounded-lg border md:max-h-[calc(100vh-14rem)]">
          {notes.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => handleSelectNote(note.id)}
                className={`grid gap-0.5 border-b p-3 text-left last:border-b-0 hover:bg-muted/50 ${
                  note.id === selectedId ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {note.courses && (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: note.courses.color ?? "#3b82f6" }}
                    />
                  )}
                  <span className="truncate text-sm font-medium">
                    {note.title}
                    {note.id === selectedId && isDirty && " •"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {note.courses?.name ?? "No course"} ·{" "}
                  {new Date(note.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        {!selectedNote ? (
          <p className="py-10 text-center text-muted-foreground">
            Select a note, or create a new one to get started.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note title"
                className="flex-1 text-base font-medium"
              />
              <Select value={draftCourseId} onValueChange={setDraftCourseId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <NoteEditor
              key={selectedNote.id}
              content={draftContent}
              onChange={setDraftContent}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="button" disabled={isPending} onClick={handleSave}>
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="ghost" disabled={isPending} onClick={handleDelete}>
                Delete
              </Button>
              {isDirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
