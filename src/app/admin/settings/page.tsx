"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Settings, Save, Link2, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SettingsMap {
  [key: string]: string;
}

interface SettingField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
}

interface SettingGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  fields: SettingField[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "links",
    title: "Link & CTA",
    subtitle: "Tautan tujuan untuk tombol di landing page dan dashboard.",
    icon: Link2,
    accent: "text-cyan-400",
    fields: [
      {
        key: "whatsapp_admin_link",
        label: "Link WhatsApp Admin",
        placeholder: "https://wa.me/628123456789",
        description: "Link WhatsApp untuk top-up saldo dan kontak admin. Format: https://wa.me/628xxx",
      },
      {
        key: "byok_signup_link",
        label: "Link Pendaftaran BYOK",
        placeholder: "https://link-pendaftaran.com",
        description: "Link tujuan saat user klik 'Daftar BYOK' di landing page.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Harga Per Generate (PAYG)",
    subtitle: "Biaya yang dikenakan ke saldo user per generate per model.",
    icon: DollarSign,
    accent: "text-green-400",
    fields: [
      { key: "price_kling_std", label: "Kling V2.6 MC Std", placeholder: "650", description: "Per generate Kling V2.6 Motion Control Standard." },
      { key: "price_kling_pro", label: "Kling V2.6 MC Pro", placeholder: "1000", description: "Per generate Kling V2.6 Motion Control Pro." },
      { key: "price_kling_v3_std", label: "Kling V3 MC Std", placeholder: "850", description: "Per generate Kling V3 Motion Control Standard." },
      { key: "price_kling_v3_pro", label: "Kling V3 MC Pro", placeholder: "1300", description: "Per generate Kling V3 Motion Control Pro." },
      { key: "price_kling_v3_i2v_std", label: "Kling V3 I2V Std", placeholder: "750", description: "Per generate Kling V3 Image-to-Video Standard." },
      { key: "price_kling_v3_i2v_pro", label: "Kling V3 I2V Pro", placeholder: "1200", description: "Per generate Kling V3 Image-to-Video Pro." },
      { key: "price_veo_720", label: "Veo 3.1 Fast 720p", placeholder: "600", description: "Per generate Veo 3.1 Fast 720p." },
      { key: "price_veo_1080", label: "Veo 3.1 Fast 1080p", placeholder: "1000", description: "Per generate Veo 3.1 Fast 1080p." },
      { key: "price_grok_720", label: "Grok AI 720p", placeholder: "800", description: "Per generate Grok AI 720p." },
      { key: "price_wan_2_5", label: "WAN 2.5 1080p", placeholder: "1500", description: "Per generate WAN 2.5 1080p." },
    ],
  },
  {
    id: "topup_links",
    title: "Link Top Up (Lynk.id)",
    subtitle: "Link checkout Lynk.id untuk setiap nominal top-up PAYG.",
    icon: Link2,
    accent: "text-emerald-400",
    fields: [
      { key: "topup_link_1", label: "Link Top Up Nominal 1", placeholder: "https://lynk.id/username/product-slug-1", description: "Link checkout Lynk.id untuk nominal pertama (sesuai topup_amount_1)." },
      { key: "topup_link_2", label: "Link Top Up Nominal 2", placeholder: "https://lynk.id/username/product-slug-2", description: "Link checkout Lynk.id untuk nominal kedua (sesuai topup_amount_2)." },
      { key: "topup_link_3", label: "Link Top Up Nominal 3", placeholder: "https://lynk.id/username/product-slug-3", description: "Link checkout Lynk.id untuk nominal ketiga (sesuai topup_amount_3)." },
      { key: "topup_support_text", label: "Teks Support Admin", placeholder: "Hubungi Admin Support", description: "Teks tombol/link support yang tampil di halaman top-up. Bisa berisi link." },
      { key: "topup_support_link", label: "Link Support Admin", placeholder: "https://wa.me/628xxx", description: "URL tujuan saat user klik teks support (WhatsApp, Telegram, dll)." },
      { key: "topup_tutorial_text", label: "Teks Tutorial Top Up", placeholder: "Lihat Tutorial Top Up", description: "Teks tombol/link tutorial yang tampil di halaman top-up." },
      { key: "topup_tutorial_link", label: "Link Tutorial Top Up", placeholder: "https://youtube.com/watch?v=xxx", description: "URL tujuan saat user klik teks tutorial (YouTube, artikel, dll)." },
    ],
  },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [originalSettings, setOriginalSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // single-field save (link tab)
  const [savingAll, setSavingAll] = useState(false); // batch save (pricing tab)
  const [activeTab, setActiveTab] = useState<string>(SETTING_GROUPS[0].id);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const json = await res.json();
          const data = json.data || {};
          setSettings(data);
          setOriginalSettings(data);
        }
      } catch {
        toast.error("Gagal memuat settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  /** Save 1 field saja (tab Link & CTA) */
  async function handleSaveOne(key: string) {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: settings[key] || "" }),
      });
      if (res.ok) {
        setOriginalSettings((prev) => ({ ...prev, [key]: settings[key] || "" }));
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

  /** Save semua field yang berubah dalam group (tab Pricing). */
  async function handleSaveGroup(group: SettingGroup) {
    const changedKeys = group.fields
      .map((f) => f.key)
      .filter((k) => (settings[k] || "") !== (originalSettings[k] || ""));

    if (changedKeys.length === 0) {
      toast("Tidak ada perubahan untuk disimpan");
      return;
    }

    setSavingAll(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Kirim semua perubahan secara paralel
      const results = await Promise.allSettled(
        changedKeys.map((key) =>
          fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value: settings[key] || "" }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || `Gagal menyimpan ${key}`);
            }
            return key;
          }),
        ),
      );

      const savedKeys: string[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          successCount++;
          savedKeys.push(r.value);
        } else {
          errorCount++;
        }
      });

      // Update originalSettings hanya untuk yang berhasil
      if (savedKeys.length > 0) {
        setOriginalSettings((prev) => {
          const next = { ...prev };
          for (const k of savedKeys) next[k] = settings[k] || "";
          return next;
        });
      }

      if (errorCount === 0) {
        toast.success(`✓ ${successCount} setting tersimpan`);
      } else if (successCount === 0) {
        toast.error(`Gagal menyimpan semua perubahan`);
      } else {
        toast.warning(`${successCount} tersimpan, ${errorCount} gagal`);
      }
    } catch {
      toast.error("Gagal menyimpan");
    } finally {
      setSavingAll(false);
    }
  }

  // Hitung group aktif & dirty count SEBELUM conditional return (Rules of Hooks)
  const currentGroup = useMemo(
    () => SETTING_GROUPS.find((g) => g.id === activeTab) ?? SETTING_GROUPS[0],
    [activeTab],
  );

  const dirtyCount = useMemo(() => {
    return currentGroup.fields.filter(
      (f) => (settings[f.key] || "") !== (originalSettings[f.key] || ""),
    ).length;
  }, [currentGroup, settings, originalSettings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPricingTab = currentGroup.id === "pricing";

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

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-3">
        {SETTING_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const isActive = activeTab === group.id;
          return (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-primary/10 border border-primary/30 text-foreground shadow-inner"
                  : "bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <GroupIcon className={`w-4 h-4 ${isActive ? group.accent : ""}`} />
              {group.title}
            </button>
          );
        })}
      </div>

      {/* Header section */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 min-w-0">
          <currentGroup.icon className={`w-5 h-5 shrink-0 ${currentGroup.accent}`} />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{currentGroup.title}</h2>
            <p className="text-xs text-muted-foreground truncate">{currentGroup.subtitle}</p>
          </div>
        </div>

        {/* Tombol "Save All" hanya muncul di tab Pricing */}
        {isPricingTab && (
          <button
            onClick={() => handleSaveGroup(currentGroup)}
            disabled={savingAll || dirtyCount === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shrink-0 transition-all ${
              dirtyCount === 0
                ? "bg-white/5 text-muted-foreground border border-border/40 cursor-not-allowed"
                : "bg-green-500/15 text-green-300 border border-green-500/40 hover:bg-green-500/25"
            }`}
          >
            {savingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : dirtyCount === 0 ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {dirtyCount === 0
              ? "Tersimpan"
              : `Simpan Perubahan${dirtyCount > 1 ? ` (${dirtyCount})` : ""}`}
          </button>
        )}
      </div>

      {/* Content */}
      {isPricingTab ? (
        // Tab Pricing: Compact list dengan satu save di atas
        <div className="bg-card/30 border border-border/50 rounded-xl overflow-hidden divide-y divide-border/40">
          {currentGroup.fields.map((field) => {
            const isDirty = (settings[field.key] || "") !== (originalSettings[field.key] || "");
            return (
              <div
                key={field.key}
                className={`grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 px-4 py-3 transition-colors ${
                  isDirty ? "bg-amber-500/5" : "hover:bg-white/[0.02]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{field.label}</span>
                    {isDirty && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                        unsaved
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{field.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings[field.key] || ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^\d]/g, "");
                      setSettings({ ...settings, [field.key]: digits });
                    }}
                    placeholder={field.placeholder}
                    className={`w-28 px-3 py-1.5 rounded-md bg-black/30 border text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50 ${
                      isDirty ? "border-amber-500/50" : "border-border/40"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Tab Links: tetap per-field save untuk URL (lebih hati-hati)
        <div className="space-y-4">
          {currentGroup.fields.map((field) => (
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
                  onClick={() => handleSaveOne(field.key)}
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
      )}
    </div>
  );
}
