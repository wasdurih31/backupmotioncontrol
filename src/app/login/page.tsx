"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const loginSchema = z.object({
  identifier: z.string().min(3, "Email/No HP wajib diisi"),
  accessCode: z.string().min(4, "Access Code minimal 4 karakter"),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showByokForm, setShowByokForm] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", accessCode: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Login berhasil!");
        router.push("/dashboard");
      } else {
        toast.error(data.error || "Login gagal. Periksa kredensial Anda.");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-6">
      <Link href="/" className="absolute top-8 left-8 text-[#a3a3a3] hover:text-white flex items-center gap-2 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">UniverseAI Studio</h1>
          <p className="text-[#a3a3a3]">Pilih metode login</p>
        </div>

        <div className="space-y-4">
          {/* Google Login (PAYG) */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-xl hover:bg-[#e5e5e5] transition-all shadow-[0_0_20px_rgba(255,255,255,0.08)]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Login dengan Google
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-[#333]" />
            <span className="text-[11px] text-[#666] uppercase tracking-wider">atau</span>
            <div className="flex-1 h-px bg-[#333]" />
          </div>

          {/* BYOK Login Toggle */}
          {!showByokForm ? (
            <button
              onClick={() => setShowByokForm(true)}
              className="w-full flex items-center justify-center gap-3 bg-[#141414] border border-[#333] text-[#e5e5e5] font-medium py-4 rounded-xl hover:bg-[#1f1f1f] hover:border-[#555] transition-all"
            >
              <KeyRound className="w-4 h-4 text-[#a3a3a3]" />
              Login BYOK (Kode Akses)
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-[#141414] border border-[#333] rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#a3a3a3]" /> Login BYOK
                </span>
                <button onClick={() => setShowByokForm(false)} className="text-[11px] text-[#666] hover:text-white transition-colors">
                  Tutup
                </button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="identifier" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] text-[#a3a3a3] uppercase tracking-wider font-semibold">Email / No HP</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" className="h-11 bg-[#0a0a0a] border-[#333] focus:border-white font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accessCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] text-[#a3a3a3] uppercase tracking-wider font-semibold">Access Code</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="KEY-XXXX" className="h-11 bg-[#0a0a0a] border-[#333] focus:border-white font-mono text-sm uppercase placeholder:normal-case" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-white/90 font-semibold" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</> : "Login"}
                  </Button>
                </form>
              </Form>
            </motion.div>
          )}
        </div>

        <p className="text-center text-[11px] text-[#555] mt-8">
          Belum punya akun? Lihat paket di <Link href="/" className="text-white hover:underline">halaman utama</Link>.
        </p>
      </motion.div>
    </div>
  );
}
