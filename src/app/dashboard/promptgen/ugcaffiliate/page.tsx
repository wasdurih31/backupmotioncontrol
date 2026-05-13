"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, CheckCircle2, ArrowLeft, ShoppingBag } from "lucide-react";
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
const VIDEO_MODELS = ["Veo 3.1 (8s)", "Seedance 2 (5-15s)", "Grok AI (6-10s)", "Sora 2 (12s)"];

const schema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  productName: z.string().min(1, "Nama produk wajib diisi"),
  productCategory: z.string().min(1, "Kategori wajib dipilih"),
  contentStyle: z.string().min(1, "Pilih content style"),
  environment: z.string().min(1, "Pilih environment"),
  customEnvironment: z.string().optional(),
  cameraDevice: z.string().min(1, "Pilih camera device"),
  duration: z.string().min(1, "Pilih durasi"),
  videoModel: z.string().min(1, "Pilih video model"),
  characterDesc: z.string().optional(),
  productDesc: z.string().optional(),
  scriptMode: z.string().min(1, "Pilih mode script"),
  manualScript: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function UGCAffiliatePageComponent() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "openrouter",
      model: "auto-free",
      productName: "",
      productCategory: "beauty",
      contentStyle: "Soft Sell",
      environment: "Bedroom Natural Light",
      customEnvironment: "",
      cameraDevice: "iPhone 15 Pro",
      duration: "8",
      videoModel: "Veo 3.1 (8s)",
      characterDesc: "",
      productDesc: "",
      scriptMode: "auto",
      manualScript: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsGenerating(true);
    setResult(null);

    const isSmartphone = CASUAL_DEVICES.includes(values.cameraDevice);
    const cameraStyle = isSmartphone
      ? "smartphone realism, social media exposure, front camera feel"
      : "cinematic depth of field, professional lighting response";
    const env = values.customEnvironment?.trim() || values.environment;

    const systemPrompt = `You are a professional storyboard artist creating UGC AFFILIATE IMAGE PROMPTS for TikTok/Shopee.

YOUR TASK:
Generate 4 separate IMAGE GENERATION PROMPTS (standalone photos, NOT a storyboard sheet). Each prompt creates one single image — same model + product in different pose/angle/expression.

CRITICAL DO NOT USE — trigger AI to render subtitles/overlays/posters:
- Spoken dialogue / quotation marks
- Screenplay terms: Hook, Problem, Solution, CTA, Goal, Reaction, Result
- Metadata labels: GLOBAL STYLE:, CHARACTER LOCK:, PRODUCT LOCK:, Camera Angle:
- Words like "subtitles", "caption", "text overlay" in positive context

USE INSTEAD — Pure visual description:
- Command sentence: "Buatlah foto UGC..." / "Create a UGC photo of..."
- Subject + action + framing + lighting
- 1 short visual sentence (15-30 words)
- NO dialogue, NO quotes

PRODUCT RULE (CRITICAL):
- DO NOT describe packaging (no "frosted jar", "white cap", "pink label")
- ALWAYS use: "produk sesuai gambar referensi"

CHARACTER RULE:
- Naturally: "wanita yang sama", "model yang sama" across all 4 variants
- NEVER use "CHARACTER LOCK:" label

LOCKED across 4 variants: same model, same product (gambar referensi), same visual style, same environment
VARIABLE across variants: pose, camera angle, expression, product interaction, framing

Camera style: ${cameraStyle}
Environment: ${env}

OUTPUT FORMAT (markdown):

### IMAGE PROMPT VARIANT 1
Buatlah foto UGC: [1 natural sentence describing pose/action/lighting — 15-30 words]
Gunakan gaya fotografi smartphone realistis, pencahayaan alami, estetik media sosial autentik.
Negative prompt: no subtitles, no text overlay, no infographic design, no poster layout, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting

### IMAGE PROMPT VARIANT 2
Buatlah foto UGC: [different pose/angle]
Gunakan gaya fotografi smartphone realistis, pencahayaan alami, estetik media sosial autentik.
Negative prompt: no subtitles, no text overlay, no infographic design, no poster layout, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting

### IMAGE PROMPT VARIANT 3
Buatlah foto UGC: [different pose/angle]
Gunakan gaya fotografi smartphone realistis, pencahayaan alami, estetik media sosial autentik.
Negative prompt: no subtitles, no text overlay, no infographic design, no poster layout, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting

### IMAGE PROMPT VARIANT 4
Buatlah foto UGC: [different pose/angle]
Gunakan gaya fotografi smartphone realistis, pencahayaan alami, estetik media sosial autentik.
Negative prompt: no subtitles, no text overlay, no infographic design, no poster layout, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting

### VIDEO PROMPT
Scene 1:
Motion: [model action + camera movement, 1 short sentence]
Script: "[dialogue in Bahasa Indonesia, natural spoken style]"

Scene 2:
Motion: [model action + camera movement]
Script: "[dialogue]"

...repeat for all scenes (4-6 scenes for ${values.duration}s video)...

VIDEO PROMPT RULES:
- Each scene: Motion + Script
- Motion: physical action + camera movement (handheld, zoom, static, etc.)
- Script: short spoken dialogue, natural Bahasa Indonesia, affiliate-friendly
- ${values.scriptMode === "manual" && values.manualScript ? `Use this manual script: "${values.manualScript}"` : "Generate natural affiliate dialogue"}
- Keep each Script line to 2-8 words
- Total script fits within ${values.duration}s at ~2-3 words/second

### JSON Image
{ "variants": [{"variant":1,"prompt":"...","negative_prompt":"..."},{"variant":2,...},...] }

### JSON Video
{ "scenes": [{"scene":1,"motion":"...","script":"..."},...],"duration":"${values.duration}s" }`;

    const userPrompt = `Generate 4 standalone UGC affiliate photo prompts + 1 video prompt.

CRITICAL:
- Each Image Prompt Variant MUST start with "Buatlah foto UGC:"
- Purely visual description, NO dialogue, NO quotes
- Product: use "produk sesuai gambar referensi" (do NOT describe packaging)
- Model: "wanita yang sama" / "model yang sama" across all variants

Product name: ${values.productName}
Category: ${values.productCategory}
Content vibe: ${values.contentStyle.toLowerCase()} (natural, not labeled)
Environment: ${env}
Camera: ${values.cameraDevice}
Video duration: ${values.duration}s
Video model target: ${values.videoModel}
${values.characterDesc ? `Character: ${values.characterDesc}` : ""}
${values.productDesc ? `Product notes (context only, do NOT describe packaging): ${values.productDesc}` : ""}
${values.scriptMode === "manual" && values.manualScript ? `Voiceover (for Video Prompt only, NOT image prompts): "${values.manualScript}"` : ""}

Write in Bahasa Indonesia (natural creator style).
Generate all 4 image variants + video prompt + JSON in the exact output format.`;

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
      toast.success("Prompt berhasil di-generate!");
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsGenerating(false);
    }
  }

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
            <ShoppingBag className="w-6 h-6 text-green-400" />
            UGC Affiliate
          </h1>
          <p className="text-sm text-muted-foreground">Generate 4 variasi prompt gambar + video prompt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/30 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">AI Model</FormLabel>
                    <Select
                      value={`${form.getValues("provider")}|${form.getValues("model")}`}
                      onValueChange={(val) => {
                        const opt = MODEL_OPTIONS.find((o) => o.value === val);
                        if (opt) {
                          form.setValue("provider", opt.provider);
                          form.setValue("model", opt.model);
                        }
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
                    <FormControl><Input placeholder="Contoh: Wardah UV Shield" {...field} className="bg-black/20 border-border/40" /></FormControl>
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
                        <SelectContent>
                          {ALL_ENVS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="cameraDevice" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Camera Device</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {ALL_DEVICES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
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

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Durasi Video (s)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {DURATIONS.map((d) => <SelectItem key={d} value={d}>{d}s</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="videoModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Video Model</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {VIDEO_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

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
                      <FormControl><Textarea placeholder="Tulis script kamu..." {...field} className="bg-black/20 border-border/40 h-20" /></FormControl>
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="characterDesc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Deskripsi Karakter (opsional)</FormLabel>
                    <FormControl><Input placeholder="Contoh: Wanita Asia, rambut panjang, 22 tahun" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="productDesc" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Deskripsi Produk (opsional)</FormLabel>
                    <FormControl><Input placeholder="Contoh: Tube pink 30ml, label gold" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                <Button type="submit" disabled={isGenerating} className="w-full bg-green-600 hover:bg-green-500 h-11 gap-2">
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><ShoppingBag className="w-4 h-4" /> Generate UGC Prompts</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {isGenerating && (
            <Card className="bg-card/30 border-green-500/20 animate-pulse">
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">AI sedang membuat variasi prompt...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {result && <UGCResultTabs result={result} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Parse UGC output: Image Variants (1-4), Video Prompt, JSON Image, JSON Video.
 */
function parseUGCResult(raw: string): { images: string; video: string; jsonImage: string; jsonVideo: string } {
  const imageParts: string[] = [];
  const videoParts: string[] = [];
  const jsonImageParts: string[] = [];
  const jsonVideoParts: string[] = [];

  const imageRegex = /###?\s*IMAGE PROMPT VARIANT\s*\d+\s*\n([\s\S]*?)(?=###?\s*IMAGE PROMPT VARIANT|###?\s*VIDEO PROMPT|###?\s*JSON|$)/gi;
  const videoRegex = /###?\s*VIDEO PROMPT\s*\n([\s\S]*?)(?=###?\s*JSON|###?\s*IMAGE|$)/gi;
  const jsonImageRegex = /###?\s*JSON\s*(?:Image|Gambar)\s*\n([\s\S]*?)(?=###?\s*JSON\s*(?:Video)|###?\s*IMAGE|###?\s*VIDEO|$)/gi;
  const jsonVideoRegex = /###?\s*JSON\s*(?:Video)\s*\n([\s\S]*?)(?=###?\s*IMAGE|###?\s*VIDEO|$)/gi;

  let match;
  while ((match = imageRegex.exec(raw)) !== null) imageParts.push(match[1].trim());
  while ((match = videoRegex.exec(raw)) !== null) videoParts.push(match[1].trim());
  while ((match = jsonImageRegex.exec(raw)) !== null) jsonImageParts.push(match[1].trim());
  while ((match = jsonVideoRegex.exec(raw)) !== null) jsonVideoParts.push(match[1].trim());

  // Fallback: kalau AI output satu "### JSON" saja
  if (jsonImageParts.length === 0 && jsonVideoParts.length === 0) {
    const genericJsonRegex = /###?\s*JSON\s*\n([\s\S]*?)(?=###?\s*IMAGE|###?\s*VIDEO|$)/gi;
    while ((match = genericJsonRegex.exec(raw)) !== null) {
      jsonImageParts.push(match[1].trim());
    }
  }

  return {
    images: imageParts.length > 0 ? imageParts.map((p, i) => `── Variant ${i + 1} ──\n${p}`).join("\n\n") : raw,
    video: videoParts.length > 0 ? videoParts.join("\n\n") : "",
    jsonImage: jsonImageParts.length > 0 ? jsonImageParts.join("\n\n") : "",
    jsonVideo: jsonVideoParts.length > 0 ? jsonVideoParts.join("\n\n") : "",
  };
}

function UGCResultTabs({ result }: { result: string }) {
  const [activeTab, setActiveTab] = useState<"images" | "video" | "jsonImage" | "jsonVideo">("images");
  const [copiedTab, setCopiedTab] = useState(false);

  const parsed = parseUGCResult(result);

  const tabs = [
    { id: "images" as const, label: "🖼️ Image Prompts", content: parsed.images },
    { id: "video" as const, label: "🎬 Video Prompt", content: parsed.video },
    { id: "jsonImage" as const, label: "{ } JSON Image", content: parsed.jsonImage },
    { id: "jsonVideo" as const, label: "{ } JSON Video", content: parsed.jsonVideo },
  ];

  const currentContent = tabs.find((t) => t.id === activeTab)?.content || result;

  const handleCopyTab = () => {
    navigator.clipboard.writeText(currentContent);
    setCopiedTab(true);
    toast.success("Copied!");
    setTimeout(() => setCopiedTab(false), 2000);
  };

  return (
    <Card className="bg-card/30 border-green-500/20">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Hasil Generate
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopyTab} className="gap-1.5 text-xs">
            {copiedTab ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedTab ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="flex gap-1 border-b border-border/30 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-black/40 rounded-xl p-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {currentContent ? (
            <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">{currentContent}</pre>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-8">
              Section ini tidak ditemukan. Coba generate ulang.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
