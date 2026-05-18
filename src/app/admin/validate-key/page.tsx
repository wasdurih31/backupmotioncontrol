"use client";

import { useState } from "react";
import { Loader2, KeyRound, CheckCircle, XCircle, Play, Clock, Hash } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ValidateKeyPage() {
  const [apiKey, setApiKey] = useState("");
  const [count, setCount] = useState(1);
  const [delay, setDelay] = useState(3);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  async function handleValidate() {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    if (count < 1 || count > 50) {
      toast.error("Jumlah validasi harus antara 1 - 50");
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress({ current: 0, total: count });

    for (let i = 0; i < count; i++) {
      setProgress({ current: i + 1, total: count });
      
      try {
        const res = await fetch("/api/admin/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });

        const data = await res.json();
        const newResult = { ...data, status: res.status, index: i + 1, timestamp: new Date().toLocaleTimeString() };
        
        setResults((prev) => [newResult, ...prev]);

        if (res.ok) {
          toast.success(`Validasi ${i + 1} berhasil`);
        } else {
          toast.error(`Validasi ${i + 1} gagal`);
        }
      } catch (e: any) {
        setResults((prev) => [{ error: e.message, status: 500, index: i + 1, timestamp: new Date().toLocaleTimeString() }, ...prev]);
        toast.error(`Validasi ${i + 1} error`);
      }

      // Delay before next request (if not the last one)
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }
    }

    setLoading(false);
    setProgress({ current: 0, total: 0 });
    toast.success("Semua proses validasi selesai");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-blue-400" />
          API Key Validation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uji coba API Key untuk Magnific (kling-v2-5-pro) secara massal dengan delay otomatis.
        </p>
      </div>

      <Card className="bg-card/30 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Validate API Key</CardTitle>
          <CardDescription>Masukkan API key dan parameter pengujian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key Magnific/Freepik</label>
              <Input
                type="text"
                placeholder="FPSXd2e87d25eec34c709ac84df919b37d73"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-sm bg-black/20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> Jumlah Request
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="bg-black/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Delay (Detik)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={delay}
                  onChange={(e) => setDelay(parseInt(e.target.value) || 1)}
                  className="bg-black/20"
                />
              </div>
            </div>
            
            <Button onClick={handleValidate} disabled={loading} className="w-full mt-2 h-10">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> 
                  Memproses {progress.current} / {progress.total}...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Mulai Validasi
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results History */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Riwayat Validasi ({results.length})
          </h2>
          <div className="space-y-4">
            {results.map((result, idx) => (
              <div key={idx} className={`rounded-lg border ${result.status === 200 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'} p-4`}>
                <div className="flex items-center justify-between mb-3 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2">
                    {result.status === 200 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <h3 className={`font-semibold ${result.status === 200 ? 'text-green-500' : 'text-red-500'}`}>
                      {result.status === 200 ? `Request #${result.index} Valid (200 OK)` : `Request #${result.index} Error (${result.status})`}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{result.timestamp}</span>
                </div>

                <div className="bg-black/40 p-4 rounded-md">
                  {result.status === 200 ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Validasi berhasil. Berhasil membuat request ke model kling-v2-5-pro.</p>
                      <p className="text-sm font-mono text-green-400 mt-2">
                        <span className="text-muted-foreground mr-2">Task ID:</span> 
                        {result.data?.task_id?.toString() || result.data?.uuid?.toString() || result.data?.id?.toString() || result.data?.data?.task_id?.toString() || result.data?.data?.uuid?.toString() || result.data?.data?.id?.toString() || "Task ID not found"}
                      </p>
                      <div className="mt-3 p-3 bg-black/50 rounded-md overflow-x-auto text-[10px] font-mono text-muted-foreground/70 max-h-48">
                        {JSON.stringify(result.data, null, 2)}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Validasi gagal atau limit tercapai.</p>
                      <p className="text-sm font-mono text-red-400 mt-2">
                        <span className="text-muted-foreground mr-2">Status:</span> 
                        {result.error || result.details?.message || result.details?.error || "Terjadi kesalahan yang tidak diketahui"}
                      </p>
                      <div className="mt-3 p-3 bg-black/50 rounded-md overflow-x-auto text-[10px] font-mono text-red-400/70 max-h-48">
                        {JSON.stringify(result.details || result, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
