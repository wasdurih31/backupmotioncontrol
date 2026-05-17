"use client";

import { useState } from "react";
import { Loader2, Wallet, Search, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface UserInfo {
  id: string;
  email: string | null;
  accountType: string;
  balance: number;
}

export default function AdminTopUpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ balanceBefore: number; balanceAfter: number } | null>(null);

  async function handleSearch() {
    if (!searchQuery.trim()) {
      toast.error("Masukkan email atau ID user");
      return;
    }
    setSearching(true);
    setUser(null);
    setLastResult(null);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.data && data.data.length > 0) {
        const u = data.data[0];
        setUser({
          id: u.id,
          email: u.email,
          accountType: u.accountType || 'byok',
          balance: u.balance || 0,
        });
      } else {
        toast.error("User tidak ditemukan");
      }
    } catch {
      toast.error("Gagal mencari user");
    } finally {
      setSearching(false);
    }
  }

  async function handleTopUp() {
    if (!user) return;
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Masukkan nominal yang valid");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount: numAmount,
          description: description || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Berhasil top up Rp ${numAmount.toLocaleString("id-ID")}`);
        setLastResult({ balanceBefore: data.balanceBefore, balanceAfter: data.balanceAfter });
        setUser({ ...user, balance: data.balanceAfter });
        setAmount("");
        setDescription("");
      } else {
        toast.error(data.error || "Gagal top up");
      }
    } catch {
      toast.error("Gagal top up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="w-6 h-6 text-green-400" />
          Top Up User Balance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cari user lalu tambahkan saldo
        </p>
      </div>

      {/* Search */}
      <div className="bg-card/30 border border-border/50 rounded-xl p-6 space-y-4">
        <label className="text-sm text-muted-foreground">Cari user (email atau ID)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="user@email.com atau user-id..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-black/30 border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari
          </button>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div className="bg-card/30 border border-border/50 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Info User</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium text-foreground">{user.email || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">ID:</span>
              <p className="font-mono text-xs text-foreground">{user.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipe Akun:</span>
              <p className="font-medium text-foreground uppercase">{user.accountType}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Saldo Saat Ini:</span>
              <p className="font-bold text-foreground">Rp {user.balance.toLocaleString("id-ID")}</p>
            </div>
          </div>

          <hr className="border-border/50" />

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nominal Top Up (Rupiah)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 25000"
                min="1"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Deskripsi (opsional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Transfer BCA 25rb"
                className="w-full px-4 py-2.5 rounded-lg bg-black/30 border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={handleTopUp}
              disabled={submitting || !amount}
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Add Balance
            </button>
          </div>

          {/* Success Result */}
          {lastResult && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-green-400 font-medium">Top up berhasil!</p>
                <p className="text-muted-foreground mt-1">
                  Saldo sebelum: Rp {lastResult.balanceBefore.toLocaleString("id-ID")} → 
                  Saldo sesudah: <strong className="text-foreground">Rp {lastResult.balanceAfter.toLocaleString("id-ID")}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
