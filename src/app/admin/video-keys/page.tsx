"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Trash2, Video, ToggleLeft, ToggleRight, AlertCircle, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface VideoKey {
  id: string;
  provider: string;
  label: string | null;
  maskedKey: string;
  status: string;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Active</Badge>;
    case "limit_reached":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Limit Reached</Badge>;
    case "error":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Error</Badge>;
    case "disabled":
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Disabled</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

export default function AdminVideoKeysPage() {
  const [keys, setKeys] = useState<VideoKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Single add form
  const [showForm, setShowForm] = useState(false);
  const [formProvider, setFormProvider] = useState("freepik");
  const [formApiKey, setFormApiKey] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Bulk import form
  const [showBulk, setShowBulk] = useState(false);
  const [bulkProvider, setBulkProvider] = useState("freepik");
  const [bulkKeys, setBulkKeys] = useState("");
  const [bulkLabelPrefix, setBulkLabelPrefix] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/video-keys");
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

  const freepikKeys = keys.filter((k) => k.provider === "freepik");
  const geminiGenKeys = keys.filter((k) => k.provider === "geminigen");

  // Count lines in bulk textarea
  const bulkLineCount = bulkKeys.split("\n").filter((l) => l.trim().length > 0).length;

  async function handleAdd() {
    if (!formApiKey.trim()) {
      toast.error("API key wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/video-keys", {
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

  async function handleBulkImport() {
    if (!bulkKeys.trim()) {
      toast.error("Masukkan minimal 1 API key");
      return;
    }
    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/admin/video-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: bulkProvider,
          keys: bulkKeys,
          labelPrefix: bulkLabelPrefix || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let msg = `${data.inserted} key berhasil ditambahkan.`;
        if (data.skipped > 0) {
          msg += ` ${data.skipped} key dilewati (melebihi batas).`;
        }
        msg += ` Total: ${data.total}/${data.max}`;
        toast.success(msg);
        setBulkKeys("");
        setBulkLabelPrefix("");
        setShowBulk(false);
        fetchKeys();
      } else {
        toast.error(data.error || "Gagal import key");
      }
    } catch {
      toast.error("Gagal import key");
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/admin/video-keys", {
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
      const res = await fetch("/api/admin/video-keys", {
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

  async function handleEdit(id: string) {
    try {
      const updateData: Record<string, any> = { id };
      if (editLabel.trim()) updateData.label = editLabel;
      if (editStatus) updateData.status = editStatus;

      const res = await fetch("/api/admin/video-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        toast.success("Key berhasil diperbarui");
        setEditingId(null);
        fetchKeys();
      } else {
        toast.error("Gagal memperbarui key");
      }
    } catch {
      toast.error("Gagal memperbarui key");
    }
  }

  function startEdit(k: VideoKey) {
    setEditingId(k.id);
    setEditLabel(k.label || "");
    setEditStatus(k.status);
  }

  function renderTable(keyList: VideoKey[]) {
    if (keyList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Video className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Belum ada key.</p>
        </div>
      );
    }
    return (
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
            {keyList.map((k) => (
              <tr key={k.id} className="border-b border-border/30 hover:bg-white/[0.02]">
                <td className="p-4">
                  <Badge variant="outline" className="text-xs">{k.provider}</Badge>
                </td>
                <td className="p-4">
                  {editingId === k.id ? (
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-7 text-xs bg-black/20 border-border/40 w-32"
                      placeholder="Label..."
                    />
                  ) : (
                    <span
                      className="text-foreground/80 cursor-pointer hover:text-foreground hover:underline"
                      onClick={() => startEdit(k)}
                      title="Klik untuk edit"
                    >
                      {k.label || "-"}
                    </span>
                  )}
                </td>
                <td className="p-4 font-mono text-xs text-muted-foreground">{k.maskedKey}</td>
                <td className="p-4">
                  {editingId === k.id ? (
                    <Select value={editStatus} onValueChange={(v) => { if (v) setEditStatus(v); }}>
                      <SelectTrigger className="h-7 text-xs bg-black/20 border-border/40 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="limit_reached">Limit Reached</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="cursor-pointer" onClick={() => startEdit(k)} title="Klik untuk edit">
                      {statusBadge(k.status)}
                    </span>
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
                  <div className="flex items-center justify-end gap-1">
                    {editingId === k.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(k.id)}
                          className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="h-7 text-xs"
                        >
                          Batal
                        </Button>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
            <Video className="w-6 h-6 text-purple-400" />
            Video Generation Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola API key pool untuk PAYG video generation (Freepik &amp; geminigen.ai)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowBulk(!showBulk); setShowForm(false); }}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
          <Button
            onClick={() => { setShowForm(!showForm); setShowBulk(false); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Single Add Key Form */}
      {showForm && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">Tambah Video Key Baru</CardTitle>
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
                    <SelectItem value="freepik">Freepik (max 100)</SelectItem>
                    <SelectItem value="geminigen">geminigen.ai (max 2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                <Input
                  type="password"
                  placeholder="Masukkan API key..."
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  className="bg-black/20 border-border/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label (opsional)</label>
                <Input
                  placeholder="Contoh: Freepik Key 1"
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

      {/* Bulk Import Form */}
      {showBulk && (
        <Card className="bg-card/50 border-purple-500/30 border">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-400" />
              Bulk Import API Keys
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Masukkan API key satu per baris. Baris kosong dan duplikat akan otomatis dilewati.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <Select value={bulkProvider} onValueChange={(v) => { if (v) setBulkProvider(v); }}>
                  <SelectTrigger className="bg-black/20 border-border/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="freepik">Freepik (max 100)</SelectItem>
                    <SelectItem value="geminigen">geminigen.ai (max 2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Label Prefix (opsional)</label>
                <Input
                  placeholder="Contoh: Freepik Key"
                  value={bulkLabelPrefix}
                  onChange={(e) => setBulkLabelPrefix(e.target.value)}
                  className="bg-black/20 border-border/40"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Hasil: &quot;{bulkLabelPrefix || (bulkProvider === 'freepik' ? 'Freepik Key' : 'Geminigen Key')} #1&quot;, &quot;...#2&quot;, dst.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">API Keys (satu per baris)</label>
                <span className="text-xs text-muted-foreground">
                  {bulkLineCount} key{bulkLineCount !== 1 ? 's' : ''} terdeteksi
                </span>
              </div>
              <textarea
                placeholder={`Masukkan API key, satu per baris:\nFPSX685264xxxxxxxxxxxxxxxxxxxx\nFPSX685264xxxxxxxxxxxxxxxxxxxx\nFPSX685264xxxxxxxxxxxxxxxxxxxx`}
                value={bulkKeys}
                onChange={(e) => setBulkKeys(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-border/40 bg-black/20 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 resize-y min-h-[120px]"
                spellCheck={false}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleBulkImport}
                disabled={bulkSubmitting || bulkLineCount === 0}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {bulkSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import {bulkLineCount} Key{bulkLineCount !== 1 ? 's' : ''}
              </Button>
              <Button variant="ghost" onClick={() => setShowBulk(false)}>Batal</Button>
              {bulkKeys.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBulkKeys("")}
                  className="text-xs text-muted-foreground ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Freepik Keys Section */}
      <Card className="bg-card/30 border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Freepik Keys
              <Badge variant="outline" className="text-xs">{freepikKeys.length} / 100</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchKeys} className="h-7 w-7" title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {renderTable(freepikKeys)}
        </CardContent>
      </Card>

      {/* geminigen.ai Keys Section */}
      <Card className="bg-card/30 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            geminigen.ai Keys
            <Badge variant="outline" className="text-xs">{geminiGenKeys.length} / 2</Badge>
            <span className="text-xs text-muted-foreground font-normal ml-2">Max 2 keys</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renderTable(geminiGenKeys)}
        </CardContent>
      </Card>
    </div>
  );
}
