"use client";

import { useState } from "react";
import { Loader2, KeyRound, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ValidateKeyPage() {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleValidate() {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      setResult(data);

      if (res.ok) {
        toast.success("Validation request succeeded");
      } else {
        toast.error(data.error || "Validation failed");
      }
    } catch (e: any) {
      toast.error("Failed to fetch validation endpoint");
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-blue-400" />
          API Key Validation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uji coba API Key untuk Magnific (kling-v2-5-pro) untuk memastikan payload dapat mengembalikan Task ID dan status 200 OK.
        </p>
      </div>

      <Card className="bg-card/30 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Validate API Key</CardTitle>
          <CardDescription>Masukkan API key dari Magnific/Freepik yang ingin divalidasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="FPSXd2e87d25eec34c709ac84df919b37d73"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleValidate();
              }}
            />
            <Button onClick={handleValidate} disabled={loading} className="w-32">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Validate"}
            </Button>
          </div>

          {result && (
            <div className={`mt-6 rounded-lg border ${result.status === 200 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                {result.status === 200 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <h3 className={`font-semibold ${result.status === 200 ? 'text-green-500' : 'text-red-500'}`}>
                  {result.status === 200 ? "API Key Valid (200 OK)" : `Invalid / Error (${result.status})`}
                </h3>
              </div>
              <div className="bg-black/40 p-4 rounded-md">
                {result.status === 200 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Validasi berhasil. Berhasil membuat request ke model kling-v2-5-pro.</p>
                    <p className="text-sm font-mono text-green-400 mt-2">
                      <span className="text-muted-foreground mr-2">Task ID:</span> 
                      {result.data?.task_id?.toString() || result.data?.uuid?.toString() || result.data?.id?.toString() || result.data?.data?.task_id?.toString() || result.data?.data?.uuid?.toString() || result.data?.data?.id?.toString() || "Task ID not found"}
                    </p>
                    <div className="mt-3 p-3 bg-black/50 rounded-md overflow-x-auto text-[10px] font-mono text-muted-foreground/70">
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
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
