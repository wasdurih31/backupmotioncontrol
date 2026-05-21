"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, MessageCircle, Copy, CheckCircle2, AlertCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TOPUP_OPTIONS = [
  { amount: 10000, label: "Rp 10.000" },
  { amount: 25000, label: "Rp 25.000" },
  { amount: 50000, label: "Rp 50.000" },
];

export default function TopUpPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [topupOptions, setTopupOptions] = useState(DEFAULT_TOPUP_OPTIONS);
  const [copied, setCopied] = useState(false);

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

          if (settings?.whatsapp_admin_link) {
            const waValue = settings.whatsapp_admin_link;
            const match = waValue.match(/(\d{10,15})/);
            setWhatsappNumber(match ? match[1] : waValue);
          }

          const customAmounts = [
            settings?.topup_amount_1,
            settings?.topup_amount_2,
            settings?.topup_amount_3,
          ].filter(Boolean).map(Number).filter(n => n > 0);

          if (customAmounts.length > 0) {
            setTopupOptions(customAmounts.map(amount => ({
              amount,
              label: `Rp ${amount.toLocaleString("id-ID")}`,
            })));
          }
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

  function buildWhatsAppLink(amount: number) {
    if (!whatsappNumber) return "#";
    const message = `Halo admin, saya mau top up saldo UniverseAI Studio.

Nominal: Rp ${amount.toLocaleString("id-ID")}
Email: ${user?.email || "-"}
User ID: ${user?.id || "-"}

Mohon info pembayaran. Terima kasih!`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#a3a3a3]" />
      </div>
    );
  }

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

      {/* User ID Card — penting untuk verifikasi */}
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
            <span>Pilih nominal top up di bawah, lalu klik untuk membayar</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">2</span>
            <span>Di halaman pembayaran, isi <strong className="text-foreground">Email</strong> dan <strong className="text-foreground">User ID</strong> dengan benar</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">3</span>
            <span>Selesaikan pembayaran sesuai metode yang tersedia</span>
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
      {!whatsappNumber && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
          Sistem pembayaran belum dikonfigurasi. Hubungi admin.
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
            <a
              href={buildWhatsAppLink(opt.amount)}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full ${!whatsappNumber ? 'pointer-events-none opacity-50' : ''}`}
            >
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
                <MessageCircle className="w-4 h-4" />
                WhatsApp Admin
              </button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
