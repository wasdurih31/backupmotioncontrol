"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Pricing {
  kling_std: number;
  kling_pro: number;
  veo_720: number;
  veo_1080: number;
  grok_720: number;
  whatsapp_link: string;
  byok_link: string;
}

function fmtRp(n: number) {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function Home() {
  const router = useRouter();
  const [pricing, setPricing] = useState<Pricing | null>(null);

  useEffect(() => {
    async function init() {
      // Cek login
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.id) { router.push("/dashboard"); return; }
        }
      } catch { /* not logged in */ }

      // Fetch pricing
      try {
        const res = await fetch("/api/pricing");
        if (res.ok) {
          const json = await res.json();
          const pr = json.pricing || {};
          const st = json.settings || {};
          setPricing({
            kling_std: pr.price_kling_std || 650,
            kling_pro: pr.price_kling_pro || 1000,
            veo_720: pr.price_veo_720 || 600,
            veo_1080: pr.price_veo_1080 || 1000,
            grok_720: pr.price_grok_720 || 800,
            whatsapp_link: st.whatsapp_admin_link || '',
            byok_link: st.byok_signup_link || '',
          });
        }
      } catch { /* use defaults */ }
    }
    init();
  }, [router]);

  const p = pricing || { kling_std: 650, kling_pro: 1000, veo_720: 600, veo_1080: 1000, grok_720: 800, whatsapp_link: "", byok_link: "" };
  const minPrice = Math.min(p.kling_std, p.kling_pro, p.veo_720, p.veo_1080, p.grok_720);
  const maxPrice = Math.max(p.kling_std, p.kling_pro, p.veo_720, p.veo_1080, p.grok_720);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-sans antialiased">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">UniverseAI <span className="text-[#666]">Studio</span></span>
          <Link href="/login" className="text-sm font-medium text-[#a3a3a3] hover:text-white transition-colors">
            Login →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#666] mb-6">AI Video Generation Platform</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Generate video AI<br />
            <span className="text-[#a3a3a3]">tanpa biaya per detik.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto leading-relaxed">
            Platform lain mencharge Rp 10.000–20.000 per video. Di sini mulai dari {fmtRp(minPrice)}. Flat rate, bukan per detik.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-3.5 bg-white text-black font-semibold rounded-lg hover:bg-[#e5e5e5] transition-colors text-sm">
              Mulai Generate
            </Link>
            <a href="#pricing" className="px-8 py-3.5 border border-[#333] text-[#e5e5e5] font-medium rounded-lg hover:bg-[#141414] transition-colors text-sm">
              Lihat Harga
            </a>
          </div>
        </div>
      </section>

      {/* Price Comparison - Hard Selling */}
      <section className="py-20 px-6 border-t border-[#1a1a1a] relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[11px] uppercase tracking-[0.15em] text-green-400 font-bold">Hemat Hingga 96%</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Kenapa bayar mahal<br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">kalau bisa hemat?</span>
            </h2>
            <p className="text-[#888] max-w-2xl mx-auto text-lg">
              Bandingkan sendiri harga generate video AI di website lain vs di UniverseAI Studio.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="bg-[#111113] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            {/* Table Header */}
            <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider font-bold border-b border-[#262626] bg-[#0c0c0e]">
              <div className="col-span-3 px-6 py-4 text-[#666] flex items-center gap-2">
                🎬 Model AI Video
              </div>
              <div className="col-span-2 px-4 py-4 text-[#666] flex items-center gap-1">
                ⏱️ Durasi
              </div>
              <div className="col-span-3 px-4 py-4 text-red-400/80 flex items-center gap-1">
                ❌ Harga Website Lain
              </div>
              <div className="col-span-2 px-4 py-4 text-green-400/80 flex items-center gap-1">
                ✅ Harga Kami
              </div>
              <div className="col-span-2 px-4 py-4 text-[#666] flex items-center gap-1">
                🔥 Status
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#1a1a1a]">
              {/* Kling Motion Control */}
              <div className="grid grid-cols-12 px-0 items-center group hover:bg-white/[0.02] transition-colors">
                <div className="col-span-3 px-6 py-5">
                  <span className="text-[#e5e5e5] font-semibold text-sm">Kling Motion Control</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-[#888] text-sm font-mono">15 Detik</span>
                </div>
                <div className="col-span-3 px-4 py-5">
                  <span className="text-red-400/70 text-sm font-mono line-through decoration-red-500/50">Rp 18.000 / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-green-400 text-sm font-bold font-mono">{fmtRp(p.kling_std)} / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
                    HEMAT {Math.round((1 - p.kling_std / 18000) * 100)}% 🤑
                  </span>
                </div>
              </div>

              {/* Veo 3.1 Fast */}
              <div className="grid grid-cols-12 px-0 items-center group hover:bg-white/[0.02] transition-colors">
                <div className="col-span-3 px-6 py-5">
                  <span className="text-[#e5e5e5] font-semibold text-sm">Veo 3.1 Fast</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-[#888] text-sm font-mono">10 Detik</span>
                </div>
                <div className="col-span-3 px-4 py-5">
                  <span className="text-red-400/70 text-sm font-mono line-through decoration-red-500/50">Rp 15.000 / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-green-400 text-sm font-bold font-mono">{fmtRp(p.veo_720)} / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
                    HEMAT {Math.round((1 - p.veo_720 / 15000) * 100)}% 🚀
                  </span>
                </div>
              </div>

              {/* Grok AI Video */}
              <div className="grid grid-cols-12 px-0 items-center group hover:bg-white/[0.02] transition-colors">
                <div className="col-span-3 px-6 py-5">
                  <span className="text-[#e5e5e5] font-semibold text-sm">Grok AI Video</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-[#888] text-sm font-mono">10 Detik</span>
                </div>
                <div className="col-span-3 px-4 py-5">
                  <span className="text-red-400/70 text-sm font-mono line-through decoration-red-500/50">Rp 12.000 / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="text-green-400 text-sm font-bold font-mono">{fmtRp(p.grok_720)} / generate</span>
                </div>
                <div className="col-span-2 px-4 py-5">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
                    HEMAT {Math.round((1 - p.grok_720 / 12000) * 100)}% 🤑
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom CTA Banner */}
            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-t border-green-500/20 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center text-lg">💰</div>
                <div>
                  <p className="text-white font-bold text-sm">Hemat sampai jutaan rupiah per bulan!</p>
                  <p className="text-green-400/60 text-xs">Mulai dari {fmtRp(minPrice)} per generate. Tanpa biaya per detik.</p>
                </div>
              </div>
              <Link href="/login" className="shrink-0">
                <button className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-105 active:scale-95">
                  Mulai Generate Sekarang →
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#555] mt-4">
            * Harga kompetitor berdasarkan pricing resmi API per Mei 2026. Harga UniverseAI Studio sudah flat per video.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pricing" className="py-20 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#666] mb-4">Pilih Paket</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Dua cara pakai. Satu tujuan.</h2>
            <p className="text-[#888] mt-4 max-w-xl mx-auto">Mau bayar per video atau unlimited? Pilih yang cocok.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PAYG */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-white/20 via-white/60 to-white/20" />
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#888] font-semibold bg-[#1a1a1a] px-3 py-1 rounded">Populer</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">Pay As You Go</h3>
              <p className="text-[#888] text-sm mb-8">Isi saldo, generate kapanpun. Tanpa langganan.</p>

              <div className="space-y-5 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#666] font-semibold mb-3">Model AI tersedia</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Kling Motion Control Std</span><span className="font-mono text-white">{fmtRp(p.kling_std)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Kling Motion Control Pro</span><span className="font-mono text-white">{fmtRp(p.kling_pro)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Veo 3.1 Fast 720p</span><span className="font-mono text-white">{fmtRp(p.veo_720)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Veo 3.1 Fast 1080p</span><span className="font-mono text-white">{fmtRp(p.veo_1080)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Grok AI 720p</span><span className="font-mono text-white">{fmtRp(p.grok_720)}</span></div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#666] font-semibold mb-3">Harga</p>
                  <p className="text-sm">{fmtRp(minPrice)} - {fmtRp(maxPrice)} per generate</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#666] font-semibold mb-3">Isi saldo</p>
                  <div className="flex gap-2">
                    <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm font-mono">10K</span>
                    <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm font-mono">25K</span>
                    <span className="bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm font-mono">50K</span>
                  </div>
                </div>

                <ul className="text-sm text-[#888] space-y-2">
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Tanpa langganan bulanan</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Saldo tidak expired</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Tidak perlu API key</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> 5 video paralel</li>
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <Link href="/login">
                  <button className="w-full py-3.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-[#e5e5e5] transition-colors">
                    Daftar Gratis
                  </button>
                </Link>
                <p className="text-[11px] text-[#555] text-center">Daftar via Google, lalu hubungi admin untuk isi saldo</p>
              </div>
            </div>

            {/* BYOK */}
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-8 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#666] font-semibold bg-[#1a1a1a] px-3 py-1 rounded">Unlimited</span>
              </div>
              <h3 className="text-2xl font-bold mb-1">BYOK</h3>
              <p className="text-[#888] text-sm mb-2">Bring Your Own Key</p>
              <p className="text-3xl font-bold mb-8">Rp 49.000<span className="text-sm font-normal text-[#666]">/bulan</span></p>

              <div className="space-y-5 flex-1">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#666] font-semibold mb-3">Model AI tersedia</p>
                  <div className="space-y-2 text-sm text-[#ccc]">
                    <p>• Kling Motion Control Std/Pro</p>
                    <p>• PixVerse V5</p>
                    <p>• Kling 2.1 Pro</p>
                  </div>
                </div>

                <ul className="text-sm text-[#888] space-y-2">
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Generate unlimited</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Pakai API key sendiri</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> 5 video paralel</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Akses prompt generator</li>
                  <li className="flex items-center gap-2"><span className="text-white">✓</span> Tidak ada biaya per video</li>
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <a href={p.byok_link || "#byok-signup"} target="_blank" rel="noopener noreferrer">
                  <button className="w-full py-3.5 rounded-lg border border-[#333] text-[#e5e5e5] font-semibold text-sm hover:bg-[#1a1a1a] transition-colors">
                    Hubungi Admin
                  </button>
                </a>
                <p className="text-[11px] text-[#555] text-center">Hubungi admin untuk setup akun BYOK + API key</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">Tiga langkah. Selesai.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto mb-4 text-sm font-bold">1</div>
              <h3 className="font-semibold mb-2">Daftar</h3>
              <p className="text-sm text-[#888]">Login dengan Google. Akun langsung aktif.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto mb-4 text-sm font-bold">2</div>
              <h3 className="font-semibold mb-2">Isi Saldo</h3>
              <p className="text-sm text-[#888]">Hubungi admin via WhatsApp. Saldo masuk instan.</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mx-auto mb-4 text-sm font-bold">3</div>
              <h3 className="font-semibold mb-2">Generate</h3>
              <p className="text-sm text-[#888]">Upload file, pilih model, klik generate. Done.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-[#555]">UniverseAI Studio © 2026</span>
          <div className="flex gap-6 text-sm text-[#555]">
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
