"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, MessageCircle } from "lucide-react";

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

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user profile and settings in parallel
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

          // WhatsApp number from admin settings
          if (settings?.whatsapp_admin_link) {
            // Support both formats: full link (https://wa.me/628xxx) or just number (628xxx)
            const waValue = settings.whatsapp_admin_link;
            const match = waValue.match(/(\d{10,15})/);
            setWhatsappNumber(match ? match[1] : waValue);
          }

          // Custom topup amounts from admin settings
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

  function buildWhatsAppLink(amount: number) {
    if (!whatsappNumber) return "#";
    const message = `Halo admin, saya mau top up saldo UniverseAI Studio.

Nominal: Rp ${amount.toLocaleString("id-ID")}
Email: ${user?.email || "-"}
ID Akun: ${user?.id || "-"}

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
          Pilih nominal top up, lalu hubungi admin via WhatsApp untuk pembayaran.
        </p>
      </div>

      {!whatsappNumber && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400">
          Nomor WhatsApp admin belum dikonfigurasi. Hubungi admin untuk informasi top up.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topupOptions.map((opt) => (
          <div
            key={opt.amount}
            className="bg-[#141414] border border-[#333] rounded-2xl p-6 flex flex-col items-center text-center"
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

      <div className="bg-[#141414] border border-[#333] rounded-xl p-4">
        <p className="text-sm text-[#a3a3a3]">
          <strong className="text-[#e5e5e5]">Cara top up:</strong>
        </p>
        <ol className="text-sm text-[#a3a3a3] mt-2 space-y-1 list-decimal list-inside">
          <li>Pilih nominal top up di atas</li>
          <li>Klik tombol WhatsApp untuk menghubungi admin</li>
          <li>Lakukan pembayaran sesuai instruksi admin</li>
          <li>Saldo akan ditambahkan setelah pembayaran dikonfirmasi</li>
        </ol>
      </div>
    </div>
  );
}
