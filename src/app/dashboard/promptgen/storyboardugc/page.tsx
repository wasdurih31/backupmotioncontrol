"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, CheckCircle2, ArrowLeft, Film, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const MODEL_OPTIONS = [
  { value: "openrouter|auto-free", label: "Auto Free (OpenRouter)", provider: "openrouter", model: "auto-free" },
  { value: "openrouter|gemma-4-26b", label: "Gemma 4 26B (Free)", provider: "openrouter", model: "gemma-4-26b" },
  { value: "groq|llama-4-scout", label: "Llama 4 Scout (Free)", provider: "groq", model: "llama-4-scout" },
  { value: "groq|llama-4-maverick", label: "Llama 4 Maverick (Free)", provider: "groq", model: "llama-4-maverick" },
  { value: "google|gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (BYOK)", provider: "google", model: "gemini-3.1-flash-lite" },
  { value: "google|gemini-3-flash-preview", label: "Gemini 3 Flash Preview (BYOK)", provider: "google", model: "gemini-3-flash-preview" },
  { value: "google|gemini-2.5-flash", label: "Gemini 2.5 Flash (BYOK)", provider: "google", model: "gemini-2.5-flash" },
];

const CONTENT_STYLES = ["Soft Sell", "Problem Solution", "Beauty Creator", "Testimonial"];
const BEAUTY_ENVS = ["Bathroom Mirror", "Bedroom Natural Light", "Vanity Table", "Luxury Hotel Bathroom", "Minimalist Room"];
const FASHION_ENVS = ["Cafe Lifestyle", "City Walk", "Bedroom Mirror", "Rooftop Casual", "Shopping Mall"];
const ALL_ENVS = [...BEAUTY_ENVS, ...FASHION_ENVS];
const CASUAL_DEVICES = ["iPhone 13", "iPhone 15 Pro", "iPhone 16 Pro", "Samsung S24"];
const PRO_DEVICES = ["Sony A7S III", "Sony FX3", "Canon R5", "Fujifilm XT5"];
const ALL_DEVICES = [...CASUAL_DEVICES, ...PRO_DEVICES];
const DURATIONS = ["5", "6", "8", "10", "15"];
const SCENE_COUNTS = ["3", "4", "5", "6", "7", "8", "9", "10", "12"];
const VIDEO_MODELS = ["Veo 3.1 (8s)", "Seedance 2 (5-15s)", "Grok AI (6-10s)", "Sora 2 (12s)"];

const schema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  productName: z.string().min(1, "Nama produk wajib diisi"),
  productCategory: z.string().min(1),
  contentStyle: z.string().min(1),
  environment: z.string().min(1),
  customEnvironment: z.string().optional(),
  cameraDevice: z.string().min(1),
  duration: z.string().min(1),
  sceneCount: z.string().min(1),
  scriptMode: z.string().min(1),
  manualScript: z.string().optional(),
  videoModel: z.string().min(1),
  characterDesc: z.string().optional(),
  productDesc: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/**
 * Hitung distribusi scene ke chunks.
 * Preferred chunk size: 4 scenes. Distribute evenly.
 * Examples: 7→[4,3], 8→[4,4], 9→[3,3,3], 10→[4,3,3], 12→[4,4,4]
 */
function computeChunks(total: number): Array<{ start: number; end: number }> {
  if (total <= 6) return [{ start: 1, end: total }];
  const numChunks = Math.ceil(total / 4);
  const baseSize = Math.floor(total / numChunks);
  let remainder = total % numChunks;
  const chunks: Array<{ start: number; end: number }> = [];
  let current = 1;
  for (let i = 0; i < numChunks; i++) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    chunks.push({ start: current, end: current + size - 1 });
    current += size;
  }
  return chunks;
}

export default function StoryboardUGCPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "openrouter",
      model: "auto-free",
      productName: "",
      productCategory: "beauty",
      contentStyle: "Problem Solution",
      environment: "Bedroom Natural Light",
      customEnvironment: "",
      cameraDevice: "iPhone 15 Pro",
      duration: "10",
      sceneCount: "6",
      scriptMode: "auto",
      manualScript: "",
      videoModel: "Veo 3.1 (8s)",
      characterDesc: "",
      productDesc: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsGenerating(true);
    setResult(null);

    const sceneCount = parseInt(values.sceneCount);
    const duration = parseInt(values.duration);
    const isSmartphone = CASUAL_DEVICES.includes(values.cameraDevice);

    const cameraStyle = isSmartphone
      ? "smartphone realism, social media exposure, front camera feel, natural lighting"
      : "cinematic depth of field, professional lighting response, shallow bokeh";

    const env = values.customEnvironment?.trim() || values.environment;

    // ── Scene Chunking ──
    const chunks = computeChunks(sceneCount);
    const totalParts = chunks.length;
    const chunkInfo = chunks.map((c, i) => `Part ${i + 1}: Scene ${c.start}-${c.end}`).join(", ");

    const systemPrompt = `You are an expert AI prompt generator specialized in TikTok affiliate UGC storyboards.

CRITICAL RULES:
- Each prompt part MUST stay under 2000 characters (preferred: 1200-1800 chars)
- Use short descriptive phrases, NOT long cinematic paragraphs
- Each scene: scene number, goal, camera angle, character action, product interaction, environment, motion, duration
- Camera style: ${cameraStyle}
- Environment: ${env}

SCENE CHUNKING:
- Total scenes: ${sceneCount}
- Split into ${totalParts} prompt part(s): ${chunkInfo}
${totalParts > 1 ? `
CONTINUATION RULES (CRITICAL for multi-part):
- Every part MUST continue from previous part seamlessly
- Maintain: same character, same product, same environment, same emotional progression, same visual style, same camera style
- Each new part starts with continuation context: "continuation of previous storyboard, same [character], same [product], same [environment], same visual style"
- DO NOT restart story in new part
- BAD: Part 2 feels like completely different video
- GOOD: Part 2 feels like direct continuation from Part 1
` : ""}
PROMPT STRUCTURE (per part):
1. GLOBAL STYLE (camera, lighting, mood — 1 line)
2. REFERENCE LOCK (character + product lock)
${totalParts > 1 ? "3. CONTINUATION CONTEXT\n4. SCENE LIST\n5. NEGATIVE PROMPT" : "3. SCENE LIST\n4. NEGATIVE PROMPT"}

CHARACTER LOCK: "Use the exact same person from reference image. Maintain identical facial features and appearance."
PRODUCT LOCK: "Use the exact same product from reference image. Maintain identical packaging and label design."

AFFILIATE PACING:
- 5-8s: Hook > Problem > Solution > CTA
- 10-15s: Hook > Problem > Reaction > Solution > Result > CTA

OUTPUT FORMAT (for EACH part separately):
## Prompt Part [N]
### Storyboard Prompt
(the actual image prompt, UNDER 2000 chars)
### Video Prompt
(single compressed video prompt for this part, duration-aware, UNDER 2000 chars)
### JSON
(machine-readable structure for this part)`;

    const userPrompt = `Generate a ${sceneCount}-scene storyboard for a ${duration}s TikTok affiliate video.
Split into ${totalParts} prompt part(s): ${chunkInfo}

Product: ${values.productName}
Category: ${values.productCategory}
Content Style: ${values.contentStyle}
Environment: ${env}
Camera Device: ${values.cameraDevice}
Video Model Target: ${values.videoModel}
${values.characterDesc ? `Character Description: ${values.characterDesc}` : ""}
${values.productDesc ? `Product Description: ${values.productDesc}` : ""}
${values.scriptMode === "manual" && values.manualScript ? `Manual Script: "${values.manualScript}"` : "Script Mode: Auto AI (generate affiliate-optimized dialogue)"}

Generate ALL ${totalParts} prompt part(s). Each part MUST be under 2000 characters.${totalParts > 1 ? " Each subsequent part must continue seamlessly from the previous." : ""}`;

    try {
      const res = await fetch("/api/promptgen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, provider: values.provider, model: values.model }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal generate prompt");
        return;
      }

      setResult(data.result);
      toast.success(`Prompt berhasil di-generate! (${totalParts} part${totalParts > 1 ? "s" : ""})`);
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsGenerating(false);
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Preview chunking info
  const watchedSceneCount = parseInt(form.watch("sceneCount") || "6");
  const previewChunks = computeChunks(watchedSceneCount);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/promptgen">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-blue-400" />
            Storyboard UGC
          </h1>
          <p className="text-sm text-muted-foreground">Generate storyboard prompt untuk affiliate content</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-card/30 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="model" render={() => (
                  <FormItem>
                    <FormLabel className="text-xs">AI Model</FormLabel>
                    <Select
                      value={`${form.getValues("provider")}|${form.getValues("model")}`}
                      onValueChange={(val) => {
                        const opt = MODEL_OPTIONS.find((o) => o.value === val);
                        if (opt) { form.setValue("provider", opt.provider); form.setValue("model", opt.model); }
                      }}
                    >
                      <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {MODEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="productName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Nama Produk *</FormLabel>
                    <FormControl><Input placeholder="Contoh: Skintific Moisturizer" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="productCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="beauty">Beauty</SelectItem>
                          <SelectItem value="fashion">Fashion</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="tech">Tech</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contentStyle" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Content Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CONTENT_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="environment" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Environment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{ALL_ENVS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cameraDevice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Camera Device</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{ALL_DEVICES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="customEnvironment" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Custom Environment (opsional)</FormLabel>
                    <FormControl><Input placeholder="Deskripsi background custom..." {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-3 gap-3">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Durasi (s)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}s</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sceneCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Scenes</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{SCENE_COUNTS.map((s) => <SelectItem key={s} value={s}>{s} scenes</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="videoModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Video Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{VIDEO_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Chunking preview */}
                {previewChunks.length > 1 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300/80">
                    <span className="font-bold text-blue-300">Auto-split:</span>{" "}
                    {previewChunks.map((c, i) => `Part ${i + 1} (Scene ${c.start}-${c.end})`).join(" → ")}
                    <br />
                    <span className="text-blue-400/60">Setiap part max 2000 karakter dengan continuation.</span>
                  </div>
                )}

                <FormField control={form.control} name="scriptMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Script Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Auto AI Script</SelectItem>
                        <SelectItem value="manual">Manual Script</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                {form.watch("scriptMode") === "manual" && (
                  <FormField control={form.control} name="manualScript" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Manual Script</FormLabel>
                      <FormControl><Textarea placeholder="Tulis script kamu di sini..." {...field} className="bg-black/20 border-border/40 h-24" /></FormControl>
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="characterDesc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Deskripsi Karakter (opsional)</FormLabel>
                    <FormControl><Input placeholder="Contoh: Wanita Asia, hijab, 25 tahun" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="productDesc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Deskripsi Produk (opsional)</FormLabel>
                    <FormControl><Input placeholder="Contoh: Botol putih 50ml, label pink" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <Button type="submit" disabled={isGenerating} className="w-full bg-blue-600 hover:bg-blue-500 h-11 gap-2">
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Storyboard</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {isGenerating && (
            <Card className="bg-card/30 border-blue-500/20 animate-pulse">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">AI sedang membuat storyboard...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className="bg-card/30 border-green-500/20">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Hasil Generate
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy All"}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="bg-black/40 rounded-xl p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">{result}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
