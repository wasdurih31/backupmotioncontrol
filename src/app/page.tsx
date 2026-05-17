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
          if (data.id) router.push("/dashboard");
        }
      } catch { /* not logged in */ }
    }
    checkLoggedIn();
  }, [router]);

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
            Platform lain mencharge Rp 10.000–20.000 per video. Di sini mulai dari Rp 650. Flat rate, bukan per detik.
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

      {/* Price Comparison */}
      <section className="py-20 px-6 border-t border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#666] mb-4">Perbandingan Harga</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Mereka charge per detik.<br />
              <span className="text-[#666]">Kami charge flat per video.</span>
            </h2>
          </div>

          {/* Comparison Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 text-[11px] uppercase tracking-wider text-[#666] font-semibold border-b border-[#262626] px-6 py-4">
              <span>Platform</span>
              <span>Model</span>
              <span>Harga / Video 5s</span>
              <span>Sistem</span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              <div className="grid grid-cols-4 px-6 py-4 text-sm items-center">
                <span className="text-[#888]">Runway</span>
                <span className="text-[#888]">Gen-4</span>
                <span className="text-[#e5e5e5] font-mono">~Rp 9.600</span>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-1 rounded w-fit">per detik</span>
              </div>
              <div className="grid grid-cols-4 px-6 py-4 text-sm items-center">
                <span className="text-[#888]">Runway</span>
                <span className="text-[#888]">Gen-4.5</span>
                <span className="text-[#e5e5e5] font-mono">~Rp 20.000</span>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-1 rounded w-fit">per detik</span>
              </div>
              <div className="grid grid-cols-4 px-6 py-4 text-sm items-center">
                <span className="text-[#888]">Kling AI</span>
                <span className="text-[#888]">Pro (10s)</span>
                <span className="text-[#e5e5e5] font-mono">~Rp 10.000</span>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-1 rounded w-fit">credit system</span>
              </div>
              <div className="grid grid-cols-4 px-6 py-4 text-sm items-center">
                <span className="text-[#888]">Veo 3.1</span>
                <span className="text-[#888]">Fast (8s)</span>
                <span className="text-[#e5e5e5] font-mono">~Rp 12.800</span>
                <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-2 py-1 rounded w-fit">per detik</span>
              </div>
              <div className="grid grid-cols-4 px-6 py-5 text-sm items-center bg-white/[0.02]">
                <span className="text-white font-semibold">UniverseAI</span>
                <span className="text-white">Semua Model</span>
                <span className="text-white font-bold font-mono">Rp 650–1.000</span>
                <span className="text-[10px] text-white bg-white/10 px-2 py-1 rounded w-fit font-medium">flat / video</span>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#555] mt-4">
            * Harga kompetitor berdasarkan pricing resmi per Mei 2026. Konversi USD ke IDR ~Rp 16.000.
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
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Kling Motion Control Std</span><span className="font-mono text-white">Rp 650</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Kling Motion Control Pro</span><span className="font-mono text-white">Rp 1.000</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Veo 3.1 Fast 720p</span><span className="font-mono text-white">Rp 600</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Veo 3.1 Fast 1080p</span><span className="font-mono text-white">Rp 1.000</span></div>
                    <div className="flex justify-between text-sm"><span className="text-[#ccc]">Grok AI 720p</span><span className="font-mono text-white">Rp 800</span></div>
                  </div>
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
                <a href="#byok-signup" target="_blank" rel="noopener noreferrer">
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
