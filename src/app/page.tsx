"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkLoggedIn() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            router.push("/dashboard");
          }
        }
      } catch {
        // not logged in, stay on landing
      }
    }
    checkLoggedIn();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Hero */}
      <header className="text-center pt-20 pb-12 px-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          UniverseAI <span className="text-[#a3a3a3]">Studio</span>
        </h1>
        <p className="text-lg md:text-xl text-[#a3a3a3] mt-4 max-w-2xl mx-auto">
          Platform AI Video Generation — Pilih paket sesuai kebutuhan Anda
        </p>
      </header>

      {/* Pricing Cards */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: PAY AS YOU GO */}
          <div className="bg-[#141414] border border-[#333] rounded-2xl p-6 flex flex-col">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-2">
              Pay As You Go
            </div>
            <h2 className="text-2xl font-bold mb-1">Pay As You Go</h2>
            <p className="text-[#a3a3a3] text-sm mb-6">Cukup daftar dan isi saldo</p>

            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-2">Model tersedia</p>
                <ul className="text-sm space-y-1">
                  <li>• Kling Motion Control Std/Pro</li>
                  <li>• Veo 3.1 Fast 720/1080</li>
                  <li>• Grok AI 720</li>
                </ul>
              </div>

              <div>
                <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-2">Harga</p>
                <p className="text-sm">Rp 650 - Rp 1.000 per generate</p>
              </div>

              <div>
                <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-2">Top-up</p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 text-sm">Rp 10.000</span>
                  <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 text-sm">Rp 25.000</span>
                  <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1 text-sm">Rp 50.000</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link href="/login">
                <button className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors">
                  Daftar &amp; Top Up
                </button>
              </Link>
              <p className="text-xs text-[#a3a3a3] text-center">
                Daftar akun dulu, lalu hubungi admin via WhatsApp untuk isi saldo
              </p>
            </div>
          </div>

          {/* Card 2: BYOK */}
          <div className="bg-[#141414] border border-[#333] rounded-2xl p-6 flex flex-col">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#a3a3a3] mb-2">
              BYOK
            </div>
            <h2 className="text-2xl font-bold mb-1">BYOK (Bring Your Own Key)</h2>
            <p className="text-[#a3a3a3] text-sm mb-6">Rp 49.000/bulan</p>

            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-2">Model tersedia</p>
                <ul className="text-sm space-y-1">
                  <li>• Kling Motion Control Std/Pro</li>
                  <li>• PixVerse V5</li>
                  <li>• Kling 2.1 Pro</li>
                </ul>
              </div>

              <div>
                <p className="text-xs text-[#a3a3a3] uppercase tracking-wider mb-2">Fitur</p>
                <p className="text-sm">Unlimited generate dengan API key sendiri</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <a href="#byok-signup" target="_blank" rel="noopener noreferrer">
                <button className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors">
                  Daftar BYOK
                </button>
              </a>
              <p className="text-xs text-[#a3a3a3] text-center">
                Hubungi admin untuk mendaftar paket BYOK
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[#a3a3a3] border-t border-[#333]">
        UniverseAI Studio &copy; 2026
      </footer>
    </div>
  );
}
