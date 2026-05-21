"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, RefreshCcw, Globe, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ProxyAccount {
  id: string;
  proxyUrl: string;
  label: string | null;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export default function AdminProxies() {
  const [proxies, setProxies] = useState<ProxyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => { fetchProxies(); }, []);

  async function fetchProxies() {
    try {
      const res = await fetch("/api/admin/proxies");
      const data = await res.json();
      if (data.data) setProxies(data.data);
    } catch { toast.error("Failed to load proxies"); }
    finally { setLoading(false); }
  }

  async function handleBulkImport() {
    if (!bulkText.trim()) { toast.error("Masukkan proxy URL"); return; }
    setIsImporting(true);
    try {
      const res = await fetch("/api/admin/proxies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxies: bulkText }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.added || 0} proxy ditambahkan${data.skipped ? `, ${data.skipped} duplikat diskip` : ""}`);
        setBulkText("");
        fetchProxies();
      } else { toast.error(data.error || "Import gagal"); }
    } catch { toast.error("Error"); }
    finally { setIsImporting(false); }
  }

  async function handleToggle(proxy: ProxyAccount) {
    try {
      await fetch("/api/admin/proxies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proxy.id, isActive: !proxy.isActive }),
      });
      setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, isActive: !p.isActive } : p));
    } catch { toast.error("Gagal update status"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus proxy ini?")) return;
    try {
      await fetch(`/api/admin/proxies?id=${id}`, { method: "DELETE" });
      setProxies(prev => prev.filter(p => p.id !== id));
      toast.success("Proxy dihapus");
    } catch { toast.error("Gagal hapus"); }
  }

  async function handleDeleteAll() {
    if (!confirm(`Hapus SEMUA ${proxies.length} proxy? Ini tidak bisa di-undo.`)) return;
    try {
      await fetch(`/api/admin/proxies?all=true`, { method: "DELETE" });
      setProxies([]);
      toast.success("Semua proxy dihapus");
    } catch { toast.error("Gagal hapus"); }
  }

  function startEditLabel(proxy: ProxyAccount) {
    setEditingId(proxy.id);
    setEditLabel(proxy.label || "");
  }

  async function saveLabel(id: string) {
    try {
      await fetch("/api/admin/proxies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, label: editLabel }),
      });
      setProxies(prev => prev.map(p => p.id === id ? { ...p, label: editLabel } : p));
      setEditingId(null);
    } catch { toast.error("Gagal update label"); }
  }

  function maskUrl(url: string) {
    try {
      const u = new URL(url);
      const user = u.username.slice(0, 4) + "***";
      return `${u.protocol}//${user}:***@${u.hostname}:${u.port}`;
    } catch { return url.slice(0, 30) + "..."; }
  }

  const activeCount = proxies.filter(p => p.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" /> Proxy Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            IPRoyal residential proxy untuk Freepik API • Sticky 30 menit
          </p>
        </div>
        <button onClick={() => { setLoading(true); fetchProxies(); }} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-colors">
          <RefreshCcw className="w-4 h-4" />
        </button>
        {proxies.length > 0 && (
          <button onClick={handleDeleteAll} className="px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{proxies.length}</p>
          <p className="text-xs text-muted-foreground">Total Proxy</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Aktif</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{proxies.length - activeCount}</p>
          <p className="text-xs text-muted-foreground">Nonaktif</p>
        </div>
      </div>

      {/* Bulk Import */}
      <div className="bg-card border border-border/50 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Bulk Import Proxy
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Masukkan proxy satu per baris. Format yang didukung: <code className="text-blue-400">HOST:PORT:USER:PASS</code> atau <code className="text-blue-400">http://user:pass@host:port</code>
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={"geo.iproyal.com:12321:username1:password1\ngeo.iproyal.com:12321:username2:password2\ngeo.iproyal.com:12321:username3:password3"}
          className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-y"
          rows={4}
        />
        <button
          onClick={handleBulkImport}
          disabled={isImporting || !bulkText.trim()}
          className="mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Import Proxy
        </button>
      </div>

      {/* Proxy List */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : proxies.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Belum ada proxy. Import di atas untuk mulai.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {proxies.map((proxy) => (
              <div key={proxy.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                {/* Toggle */}
                <button onClick={() => handleToggle(proxy)} className="shrink-0" title={proxy.isActive ? "Nonaktifkan" : "Aktifkan"}>
                  {proxy.isActive
                    ? <ToggleRight className="w-6 h-6 text-green-400" />
                    : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                  }
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-muted-foreground truncate">{maskUrl(proxy.proxyUrl)}</span>
                    {proxy.lastError && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">ERROR</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {/* Label */}
                    {editingId === proxy.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="bg-background border border-border/50 rounded px-2 py-0.5 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Label..."
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveLabel(proxy.id)}
                        />
                        <button onClick={() => saveLabel(proxy.id)} className="p-0.5 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingId(null)} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEditLabel(proxy)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-2.5 h-2.5" />
                        {proxy.label || "Tambah label"}
                      </button>
                    )}
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">Used: {proxy.usageCount}x</span>
                    {proxy.lastUsedAt && (
                      <>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">Last: {new Date(proxy.lastUsedAt).toLocaleString('id-ID')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => handleDelete(proxy.id)} className="shrink-0 p-2 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
