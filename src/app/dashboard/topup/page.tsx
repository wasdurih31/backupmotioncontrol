"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, MessageCircle } from "lucide-react";

const TOPUP_OPTIONS = [
  { amount: 10000, label: "Rp 10.000" },
  { amount: 25000, label: "Rp 25.000" },
  { amount: 50000, label: "Rp 50.000" },
];

const WHATSAPP_NUMBER = "628000000000";

export default function TopUpPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  function buildWhatsAppLink(amount: number) {
    const message = `Halo admin, saya mau top up saldo UniverseAI Studio.

Nominal: Rp ${amount.toLocaleString("id-ID")}
Email: ${user?.email || "-"}
ID Akun: ${user?.id || "-"}

Mohon info pembayaran. Terima kasih!`;

    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TOPUP_OPTIONS.map((opt) => (
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
              className="w-full"
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
