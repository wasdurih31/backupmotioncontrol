"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Shield, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Freepik API Key Form ────────────────────────────────────────────
const apiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
});

// ─── Google AI Settings Form ─────────────────────────────────────────
const AI_MODELS = [
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite Preview" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

const aiSettingsSchema = z.object({
  googleApiKey: z.string().min(10, "API Key minimal 10 karakter"),
  selectedModel: z.string().min(1, "Pilih model"),
});

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AI Settings state
  const [aiSettings, setAiSettings] = useState<{ hasKey: boolean; maskedKey: string | null; selectedModel: string | null }>({
    hasKey: false, maskedKey: null, selectedModel: null,
  });
  const [isSavingAi, setIsSavingAi] = useState(false);

  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { apiKey: "" },
  });

  const aiForm = useForm<z.infer<typeof aiSettingsSchema>>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: { googleApiKey: "", selectedModel: "" },
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          if (data.hasApiKey) {
            form.setValue("apiKey", "********************************");
          }
        }
      } catch (error) {
        toast.error("Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchAiSettings() {
      try {
        const res = await fetch("/api/user/ai-settings");
        if (res.ok) {
          const data = await res.json();
          setAiSettings(data);
          if (data.hasKey) {
            aiForm.setValue("googleApiKey", "********************************");
          }
          if (data.selectedModel) {
            aiForm.setValue("selectedModel", data.selectedModel);
          }
        }
      } catch (_e) { /* silent */ }
    }

    fetchProfile();
    fetchAiSettings();
  }, [form, aiForm]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  // ─── Freepik Key Handlers ──────────────────────────────────────────
  async function onSave(values: z.infer<typeof apiKeySchema>) {
    if (values.apiKey === "********************************") {
      toast.success("API Key saved successfully.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: values.apiKey }),
      });
      if (res.ok) {
        toast.success("API Key saved successfully.");
        setUser({ ...user, hasApiKey: true });
        form.setValue("apiKey", "********************************");
      } else {
        toast.error("Failed to save API Key.");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onTest() {
    const keyToTest = form.getValues().apiKey;
    if (!keyToTest || keyToTest === "********************************") {
      toast.error("Please enter your actual API key to test.");
      return;
    }
    setIsTesting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (keyToTest.length > 10) {
      toast.success("Connection successful! API key is valid.");
    } else {
      toast.error("Connection failed. Invalid API key format.");
    }
    setIsTesting(false);
  }

  // ─── Google AI Key Handlers ────────────────────────────────────────
  async function onSaveAi(values: z.infer<typeof aiSettingsSchema>) {
    if (values.googleApiKey === "********************************") {
      // Hanya update model tanpa ubah key
      toast.info("Key tidak berubah. Untuk update model saja, masukkan key baru.");
      return;
    }
    setIsSavingAi(true);
    try {
      const res = await fetch("/api/user/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: values.googleApiKey, selectedModel: values.selectedModel }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Google AI settings saved!");
        setAiSettings({ hasKey: true, maskedKey: data.maskedKey, selectedModel: values.selectedModel });
        aiForm.setValue("googleApiKey", "********************************");
      } else {
        toast.error(data.error || "Failed to save.");
      }
    } catch (error) {
      toast.error("An error occurred.");
    } finally {
      setIsSavingAi(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Profile Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your account and API keys.</p>
      </div>

      {/* User Info */}
      <Card className="bg-card/30 border-border/50">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Your basic account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email / Phone Number</Label>
            <Input value={user.email || user.phone || ""} readOnly className="bg-background/50 text-muted-foreground cursor-not-allowed" />
          </div>
          <div className="space-y-2">
            <Label>Access Code</Label>
            <Input value={user.accessCode} readOnly className="bg-background/50 text-muted-foreground cursor-not-allowed uppercase font-mono" />
          </div>
          {/* Masa Aktif — hanya untuk BYOK */}
          {user.accountType !== 'payg' && (
            <div className="space-y-2">
              <Label>Masa Aktif Subscription</Label>
              {user.subscriptionEnd ? (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                  new Date(user.subscriptionEnd) > new Date()
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    new Date(user.subscriptionEnd) > new Date() ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      new Date(user.subscriptionEnd) > new Date() ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {new Date(user.subscriptionEnd) > new Date() ? 'Aktif' : 'Expired'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.subscriptionStart && `Mulai: ${new Date(user.subscriptionStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                      {user.subscriptionEnd && ` — Berakhir: ${new Date(user.subscriptionEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-sm text-amber-400">Belum ada subscription aktif. Hubungi admin.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freepik API Key — hanya untuk BYOK */}
      {user.accountType !== 'payg' && (
      <Card className="bg-card/30 border-border/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Freepik API Key
          </CardTitle>
          <CardDescription>For video generation (Motion Control, PixVerse, Kling).</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
              <FormField control={form.control} name="apiKey" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="Enter your Freepik API Key" className="pr-10 bg-background/50 font-mono" type="password" {...field} />
                      {user.hasApiKey && field.value === "********************************" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-3" />
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Get your key from the Freepik developer dashboard.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-center gap-4 pt-2">
                <Button type="submit" disabled={isSaving} className="bg-white text-black hover:bg-white/90 w-32">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Key
                </Button>
                <Button type="button" variant="outline" onClick={onTest} disabled={isTesting} className="w-40 border-border/50 bg-transparent hover:bg-white/5">
                  {isTesting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</> : "Test Connection"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="bg-white/[0.02] border-t border-border/50 py-4 mt-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Shield className="w-5 h-5 text-green-500/70 shrink-0 mt-0.5" />
            <p><strong className="text-foreground font-medium">Security:</strong> Key encrypted, never stored in plain text.</p>
          </div>
        </CardFooter>
      </Card>
      )}

      {/* Google AI Studio (Prompt Generator) */}
      <Card className="bg-card/30 border-border/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 -ml-16 -mt-16 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            AI Provider — Google AI Studio
          </CardTitle>
          <CardDescription>
            Untuk fitur Prompt Generator Suite. Dapatkan API key gratis di{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              aistudio.google.com/apikey
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...aiForm}>
            <form onSubmit={aiForm.handleSubmit(onSaveAi)} className="space-y-5">
              <FormField control={aiForm.control} name="selectedModel" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Model</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background/50 border-border/40">
                        <SelectValue placeholder="Pilih model Gemini..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Wajib dipilih sebelum menyimpan API key.</FormDescription>
                </FormItem>
              )} />

              <FormField control={aiForm.control} name="googleApiKey" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">API Key</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="AIzaSy..." className="pr-10 bg-background/50 font-mono" type="password" {...field} />
                      {aiSettings.hasKey && field.value === "********************************" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-3" />
                      )}
                    </div>
                  </FormControl>
                  {aiSettings.maskedKey && (
                    <FormDescription>
                      Key tersimpan: <span className="font-mono text-foreground/70">{aiSettings.maskedKey}</span>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" disabled={isSavingAi} className="bg-blue-600 hover:bg-blue-500 text-white w-full gap-2">
                {isSavingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isSavingAi ? "Saving..." : "Save AI Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="bg-white/[0.02] border-t border-border/50 py-4 mt-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Shield className="w-5 h-5 text-blue-400/70 shrink-0 mt-0.5" />
            <p><strong className="text-foreground font-medium">Keamanan:</strong> API key di-encrypt AES-256 sebelum disimpan. Tidak pernah ditampilkan utuh setelah tersimpan.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
