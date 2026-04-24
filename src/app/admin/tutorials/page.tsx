"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Video, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { upload } from '@vercel/blob/client';

export default function AdminTutorials() {
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "">("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTutorials();
  }, []);

  async function fetchTutorials() {
    try {
      const res = await fetch("/api/admin/tutorials");
      const data = await res.json();
      if (data.data) {
        setTutorials(data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to fetch tutorials");
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(t: any) {
    setEditingId(t.id);
    setTitle(t.title);
    setContent(t.content || "");
    setLink(t.link || "");
    setMediaUrl(t.mediaUrl || "");
    setMediaType(t.mediaType || "");
    setMediaFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setLink("");
    setMediaUrl("");
    setMediaType("");
    setMediaFile(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this tutorial?")) return;
    try {
      const res = await fetch(`/api/admin/tutorials?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Tutorial deleted");
        fetchTutorials();
      } else {
        toast.error("Failed to delete");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error("Title is required");
      return;
    }

    setIsSubmitting(true);
    let finalMediaUrl = mediaUrl;
    let finalMediaType = mediaType;

    try {
      // 1. Upload Media if file selected
      if (mediaFile) {
        const isVideo = mediaFile.type.startsWith('video/');
        finalMediaType = isVideo ? 'video' : 'image';
        
        toast.info("Uploading media...");
        const uniqueFilename = `${Date.now()}-${mediaFile.name}`;
        const blob = await upload(uniqueFilename, mediaFile, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        finalMediaUrl = blob.url;
      }

      // 2. Save to DB
      const payload = {
        id: editingId,
        title,
        content,
        link,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType
      };

      const url = "/api/admin/tutorials";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Tutorial ${editingId ? 'updated' : 'created'} successfully!`);
        handleCancelEdit();
        fetchTutorials();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save tutorial");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : (
        <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tutorial Management</h1>
        <p className="text-muted-foreground">Add and manage tutorial articles.</p>
      </div>

      {/* FORM SECTION */}
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{editingId ? "Edit Tutorial" : "Add New Tutorial"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Tutorial Title"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Content / Description</label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
              placeholder="Article content..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2"><LinkIcon className="w-4 h-4" /> External Link</label>
            <input 
              type="url" 
              value={link} 
              onChange={(e) => setLink(e.target.value)} 
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">Media (Image/Video)</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef}
                accept="video/*,image/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) setMediaFile(e.target.files[0]);
                }} 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" /> Select File
              </button>
              
              {mediaFile && <span className="text-sm text-muted-foreground">{mediaFile.name}</span>}
              {!mediaFile && mediaUrl && (
                <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline">
                  Current Media
                </a>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update" : "Create"} Tutorial
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LIST SECTION */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Media</th>
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tutorials.map((t) => (
              <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  {t.mediaUrl ? (
                    t.mediaType === 'video' ? (
                      <div className="w-16 h-10 bg-black rounded flex items-center justify-center relative overflow-hidden group">
                        <Video className="w-4 h-4 text-white/50" />
                      </div>
                    ) : (
                      <img src={t.mediaUrl} alt={t.title} className="w-16 h-10 object-cover rounded" />
                    )
                  ) : (
                    <div className="w-16 h-10 bg-white/5 rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{t.title}</td>
                <td className="px-6 py-4 text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(t)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {tutorials.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                  No tutorials found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}
