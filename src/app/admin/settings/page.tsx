"use client";

import { useEffect, useState } from "react";
import { Loader2, Settings, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface SettingsMap {
  [key: string]: string;
}

const SETTINGS_FIELDS = [
  { key: "whatsapp_admin_link", label: "Link WhatsApp Admin", placeholder: "https://wa.me/628123456789", description: "Link WhatsApp untuk top-up saldo dan kontak admin. Format: https://wa.me/628xxx" },
  { key: "byok_signup_link", label: "Link Pendaftaran BYOK", placeholder: "https://link-pendaftaran.com", description: "Link tujuan saat user klik 'Daftar BYOK' di landing page." },
  { key: "price_kling_std", label: "Harga Kling MC Std (Rp)", placeholder: "650", description: "Harga per generate Kling Motion Control Standard." },
  { key: "price_kling_pro", label: "Harga Kling MC Pro (Rp)", placeholder: "1000", description: "Harga per generate Kling Motion Control Pro." },
  { key: "price_veo_720", label: "Harga Veo 3.1 Fast 720p (Rp)", placeholder: "600", description: "Harga per generate Veo 3.1 Fast 720p." },
  { key: "price_veo_1080", label: "Harga Veo 3.1 Fast 1080p (Rp)", placeholder: "1000", description: "Harga per generate Veo 3.1 Fast 1080p." },
  { key: "price_grok_720", label: "Harga Grok AI 720p (Rp)", placeholder: "800", description: "Harga per generate Grok AI 720p." },
  { key: "price_wan_2_5", label: "Harga WAN 2.5 1080p (Rp)", placeholder: "1500", description: "Harga per generate WAN 2.5 1080p." },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const json = await res.json();
          setSettings(json.data || {});
        }
      } catch {
        toast.error("Gagal memuat settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave(key: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] || "" }),
      });
      if (res.ok) {
        toast.success("Tersimpan!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal menyimpan");
      }
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSaving(null);
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          App Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurasi link, harga, dan pengaturan global website.
        </p>
      </div>

      <div className="space-y-4">
        {SETTINGS_FIELDS.map((field) => (
          <div key={field.key} className="bg-card/30 border border-border/50 rounded-xl p-5 space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">{field.label}</label>
              <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings[field.key] || ""}
                onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-border/50 text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={() => handleSave(field.key)}
                disabled={saving === field.key}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {saving === field.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
