"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Key, ToggleLeft, ToggleRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AiKey {
  id: string;
  provider: string;
  label: string | null;
  maskedKey: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export default function AdminAiKeysPage() {
  const [keys, setKeys] = useState<AiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProvider, setFormProvider] = useState("openrouter");
  const [formApiKey, setFormApiKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-keys");
      const data = await res.json();
      if (res.ok) {
        setKeys(data.data || []);
      } else {
        toast.error(data.error || "Gagal memuat data");
      }
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleAdd() {
    if (!formApiKey.trim()) {
      toast.error("API key wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: formProvider, apiKey: formApiKey, label: formLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Key berhasil ditambahkan");
        setFormApiKey("");
        setFormLabel("");
        setShowForm(false);
        fetchKeys();
      } else {
        toast.error(data.error || "Gagal menambahkan key");
      }
    } catch {
      toast.error("Gagal menambahkan key");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/admin/ai-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        toast.success(currentActive ? "Key dinonaktifkan" : "Key diaktifkan");
        fetchKeys();
      } else {
        toast.error("Gagal mengubah status");
      }
    } catch {
      toast.error("Gagal mengubah status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus key ini?")) return;
    try {
      const res = await fetch("/api/admin/ai-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("Key berhasil dihapus");
        fetchKeys();
      } else {
        toast.error("Gagal menghapus key");
      }
    } catch {
      toast.error("Gagal menghapus key");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Key className="w-6 h-6 text-yellow-400" />
            Admin AI Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola API key untuk OpenRouter & Groq (digunakan oleh semua user)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Key
        </Button>
      </div>

      {/* Add Key Form */}
      {showForm && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Tambah API Key Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <Select value={formProvider} onValueChange={(v) => { if (v) setFormProvider(v); }}>
                  <SelectTrigger className="bg-black/20 border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-or-... atau gsk_..."
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="bg-black/20 border-border/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label (opsional)</label>
                <Input
                  placeholder="Contoh: Key utama"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="bg-black/20 border-border/40"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Simpan
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys Table */}
      <Card className="bg-card/30 border-border/50">
        <CardContent className="p-0">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Key className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Belum ada API key. Klik &quot;Add Key&quot; untuk menambahkan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left p-4">Provider</th>
                    <th className="text-left p-4">Label</th>
                    <th className="text-left p-4">Key</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Usage</th>
                    <th className="text-left p-4">Last Used</th>
                    <th className="text-left p-4">Error</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-border/30 hover:bg-white/[0.02]">
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {k.provider}
                        </Badge>
                      </td>
                      <td className="p-4 text-foreground/80">{k.label || "-"}</td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">{k.maskedKey}</td>
                      <td className="p-4">
                        {k.isActive ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground">{k.usageCount}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="p-4">
                        {k.lastError ? (
                          <span className="text-xs text-red-400 flex items-center gap-1 max-w-[200px] truncate" title={k.lastError}>
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {k.lastError}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(k.id, k.isActive)}
                            title={k.isActive ? "Nonaktifkan" : "Aktifkan"}
                            className="h-8 w-8"
                          >
                            {k.isActive ? (
                              <ToggleRight className="w-4 h-4 text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(k.id)}
                            className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
