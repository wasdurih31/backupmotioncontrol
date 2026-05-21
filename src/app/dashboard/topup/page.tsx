"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, Copy, CheckCircle2, AlertCircle, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TOPUP_OPTIONS = [
  { amount: 10000, label: "Rp 10.000" },
  { amount: 25000, label: "Rp 25.000" },
  { amount: 50000, label: "Rp 50.000" },
];

export default function TopUpPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [topupOptions, setTopupOptions] = useState<{ amount: number; label: string; link: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [supportText, setSupportText] = useState("");
  const [supportLink, setSupportLink] = useState("");
  const [supportIcon, setSupportIcon] = useState("");
  const [tutorialText, setTutorialText] = useState("");
  const [tutorialLink, setTutorialLink] = useState("");
  const [tutorialIcon, setTutorialIcon] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, pricingRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/pricing"),
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data);
        }

        if (pricingRes.ok) {
          const { settings } = await pricingRes.json();

          // Build topup options from admin settings
          const amounts = [
            settings?.topup_amount_1,
            settings?.topup_amount_2,
            settings?.topup_amount_3,
          ].map(Number).filter(n => n > 0);

          const links = [
            settings?.topup_link_1 || '',
            settings?.topup_link_2 || '',
            settings?.topup_link_3 || '',
          ];

          if (amounts.length > 0) {
            setTopupOptions(amounts.map((amount, i) => ({
              amount,
              label: `Rp ${amount.toLocaleString("id-ID")}`,
              link: links[i] || '',
            })));
          } else {
            setTopupOptions(DEFAULT_TOPUP_OPTIONS.map((opt, i) => ({
              ...opt,
              link: links[i] || '',
            })));
          }

          // Support & Tutorial
          setSupportText(settings?.topup_support_text || '');
          setSupportLink(settings?.topup_support_link || '');
          setSupportIcon(settings?.topup_support_icon || '');
          setTutorialText(settings?.topup_tutorial_text || '');
          setTutorialLink(settings?.topup_tutorial_link || '');
          setTutorialIcon(settings?.topup_tutorial_icon || '');
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handleCopyUserId() {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id).then(() => {
      setCopied(true);
      toast.success("User ID disalin!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Gagal menyalin");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#a3a3a3]" />
      </div>
    );
  }

  const hasAnyLink = topupOptions.some(opt => opt.link);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-400" />
          Top Up Saldo
        </h1>
        <p className="text-sm text-[#a3a3a3] mt-1">
          Isi saldo untuk generate video. Pembayaran otomatis terverifikasi.
        </p>
      </div>

      {/* User ID Card */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">User ID Anda</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salin dan masukkan User ID ini saat pembayaran agar saldo otomatis masuk.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 rounded-lg bg-black/40 border border-blue-500/30 font-mono text-sm text-blue-300 truncate select-all">
            {user?.id || "-"}
          </div>
          <button
            onClick={handleCopyUserId}
            className="px-3 py-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-xs font-medium">{copied ? "Disalin" : "Salin"}</span>
          </button>
        </div>
      </div>

      {/* Instruksi */}
      <div className="bg-[#141414] border border-[#333] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-semibold text-foreground">Cara Top Up (Otomatis)</p>
        </div>
        <ol className="text-sm text-[#a3a3a3] space-y-2.5 list-none">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">1</span>
            <span>Salin <strong className="text-foreground">User ID</strong> di atas</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">2</span>
            <span>Pilih nominal dan klik <strong className="text-foreground">Bayar Sekarang</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">3</span>
            <span>Di halaman pembayaran, isi <strong className="text-foreground">Email</strong> dan paste <strong className="text-foreground">User ID</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">4</span>
            <span>Saldo <strong className="text-green-400">otomatis masuk</strong> setelah pembayaran berhasil</span>
          </li>
        </ol>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
          <p className="text-xs text-amber-300">
            ⚠️ Pastikan User ID yang diisi <strong>sama persis</strong> dengan yang tertera di atas. Jika salah, saldo tidak akan masuk otomatis.
          </p>
        </div>
      </div>

      {/* Nominal Options */}
      {!hasAnyLink && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
          Link pembayaran belum dikonfigurasi. Hubungi admin.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topupOptions.map((opt) => (
          <div
            key={opt.amount}
            className="bg-[#141414] border border-[#333] rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-500/30 transition-colors"
          >
            <p className="text-2xl font-bold mb-1">{opt.label}</p>
            <p className="text-xs text-[#a3a3a3] mb-6">Top up saldo</p>
            {opt.link ? (
              <a
                href={opt.link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  Bayar Sekarang
                </button>
              </a>
            ) : (
              <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-muted-foreground font-semibold cursor-not-allowed opacity-50">
                Belum tersedia
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Support & Tutorial Links */}
      {(supportText || tutorialText) && (
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {supportText && (
            <a
              href={supportLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-[#333] bg-[#141414] hover:bg-white/5 hover:border-blue-500/30 transition-all group"
            >
              {supportIcon && (
                <img src={supportIcon} alt="" className="w-6 h-6 rounded object-contain shrink-0" />
              )}
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {supportText}
              </span>
            </a>
          )}
          {tutorialText && (
            <a
              href={tutorialLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-[#333] bg-[#141414] hover:bg-white/5 hover:border-purple-500/30 transition-all group"
            >
              {tutorialIcon && (
                <img src={tutorialIcon} alt="" className="w-6 h-6 rounded object-contain shrink-0" />
              )}
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {tutorialText}
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
