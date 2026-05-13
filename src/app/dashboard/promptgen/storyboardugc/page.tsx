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

/**
 * Parse AI output menjadi sections terpisah: Storyboard Prompt, Video Prompt, JSON.
 * AI output format: ## Prompt Part N → ### Storyboard Prompt → ### Video Prompt → ### JSON
 */
function parseResult(raw: string): { storyboard: string; video: string; json: string } {
  // Coba split berdasarkan heading markdown
  const storyboardParts: string[] = [];
  const videoParts: string[] = [];
  const jsonParts: string[] = [];

  // Regex untuk menangkap section
  const storyboardRegex = /###?\s*Storyboard Prompt\s*\n([\s\S]*?)(?=###?\s*Video Prompt|###?\s*JSON|##\s*Prompt Part|$)/gi;
  const videoRegex = /###?\s*Video Prompt\s*\n([\s\S]*?)(?=###?\s*JSON|###?\s*Storyboard|##\s*Prompt Part|$)/gi;
  const jsonRegex = /###?\s*JSON\s*\n([\s\S]*?)(?=###?\s*Storyboard|###?\s*Video|##\s*Prompt Part|$)/gi;

  let match;
  while ((match = storyboardRegex.exec(raw)) !== null) storyboardParts.push(match[1].trim());
  while ((match = videoRegex.exec(raw)) !== null) videoParts.push(match[1].trim());
  while ((match = jsonRegex.exec(raw)) !== null) jsonParts.push(match[1].trim());

  return {
    storyboard: storyboardParts.length > 0 ? storyboardParts.join("\n\n---\n\n") : raw,
    video: videoParts.length > 0 ? videoParts.join("\n\n---\n\n") : "",
    json: jsonParts.length > 0 ? jsonParts.join("\n\n") : "",
  };
}

function ResultTabs({ result }: { result: string }) {
  const [activeTab, setActiveTab] = useState<"storyboard" | "video" | "json">("storyboard");
  const [copiedTab, setCopiedTab] = useState(false);

  const parsed = parseResult(result);

  const tabs = [
    { id: "storyboard" as const, label: "🖼️ Image Prompt", content: parsed.storyboard },
    { id: "video" as const, label: "🎬 Video Prompt", content: parsed.video },
    { id: "json" as const, label: "{ } JSON", content: parsed.json },
  ];

  const currentContent = tabs.find((t) => t.id === activeTab)?.content || result;

  const handleCopyTab = () => {
    navigator.clipboard.writeText(currentContent);
    setCopiedTab(true);
    toast.success(`${activeTab === "storyboard" ? "Image" : activeTab === "video" ? "Video" : "JSON"} prompt copied!`);
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
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/30 -mx-6 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
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
              Section ini tidak ditemukan dalam output AI. Coba generate ulang.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StoryboardUGCPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
      ? `${values.cameraDevice} selfie camera, natural smartphone photography style, authentic social media aesthetic`
      : `${values.cameraDevice}, cinematic depth of field, professional lighting response`;

    const env = values.customEnvironment?.trim() || values.environment;

    // ── Scene Chunking ──
    const chunks = computeChunks(sceneCount);
    const totalParts = chunks.length;
    const chunkInfo = chunks.map((c, i) => `Part ${i + 1}: Scene ${c.start}-${c.end}`).join(", ");

    // ── Grid Layout Auto-Rule ──
    // Per-part grid size based on scenes in that part (not total).
    function gridFor(n: number): string {
      if (n <= 4) return "2x2";
      if (n <= 6) return "2x3";
      if (n <= 9) return "3x3";
      return "4x3";
    }

    const systemPrompt = `You are a professional storyboard artist creating COMIC-GRID STORYBOARD SHEET images for UGC affiliate content.

YOUR TASK:
Create an IMAGE GENERATION PROMPT that produces a clean storyboard SHEET — comic-grid layout where each panel has a photograph AND a caption area below with scene label and description.

REFERENCE VISUAL STYLE of the output image:
- Photo panels arranged in a clean grid (2x2 / 2x3 / 3x3 / 4x3 depending on scene count)
- Each panel is a real photograph (smartphone UGC style)
- BELOW each photo panel there is a WHITE CAPTION AREA containing:
  * Scene label like "Scene 1" in bold
  * 2-3 line description in smaller text (scene details, shot type, lighting)
- Captions are RENDERED AS TEXT in the caption area (NOT as overlay on the photo)
- White/minimal background between panels, editorial magazine feel

CAPTIONS ARE REQUIRED — storyboard must NOT be photos only. Every panel MUST have its caption block below.

Caption placement rule:
- Text is rendered OUTSIDE the photo (in the caption area below the panel)
- Text is NOT overlay/subtitle on top of the photo
- Font: clean sans-serif, dark text on white/light background

CRITICAL DO NOT USE — trigger AI to render subtitles/TikTok overlays:
- Spoken dialogue / quotation marks ("Wow terasa lembut!")
- Screenplay terms: Hook, Problem, Solution, CTA, Goal, Result, Reaction
- Metadata labels: GLOBAL STYLE:, CHARACTER LOCK:, PRODUCT LOCK:, Camera Angle:
- TikTok-style subtitle text burned onto the photo

PRODUCT CONSISTENCY (CRITICAL):
- DO NOT describe product packaging (no "frosted jar", "white cap")
- ALWAYS use: "produk sesuai gambar referensi"

CHARACTER CONSISTENCY:
- Naturally repeat: "wanita yang sama", "model yang sama" across scenes
- NEVER use "CHARACTER LOCK:" label

SCENE CHUNKING:
- Total scenes: ${sceneCount}
- Split into ${totalParts} part(s): ${chunkInfo}
- Each part stays under 2000 chars
${totalParts > 1 ? `
MULTI-PART CONTINUATION:
- Start subsequent parts with: "Lanjutan storyboard sebelumnya dengan wanita yang sama dan produk dari gambar referensi yang sama."
- Same visual style, same environment, same mood
` : ""}
CAMERA STYLE: ${cameraStyle}
ENVIRONMENT: ${env}

OUTPUT FORMAT (markdown, for EACH part):

## Prompt Part [N]

### Storyboard Prompt
Create a clean UGC storyboard sheet with a [GRID] comic-grid layout.
Layout: each panel = rectangular photo on top + white caption area below with "Scene N" bold label and 2-3 line description in smaller text. Captions are REQUIRED under every panel. Text is rendered in the caption area only, NOT as overlay on the photo. Editorial magazine style, minimalist typography, clean spacing.
Photography style: realistic smartphone UGC photography, natural lighting, authentic social media aesthetic, ${cameraStyle}.
Setting: ${env}.

Scene 1: [wanita yang sama + action + framing + lighting, 10-25 words, pure visual description, no dialogue]
Scene 2: [wanita yang sama + action + framing + lighting]
...

Render each "Scene N: ..." as the caption text below its respective photo panel.

Negative prompt: no subtitles on photo, no text overlay on image, no tiktok caption, no infographic design, no poster design, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin, over cinematic lighting

### Video Prompt
[1 short natural paragraph describing the ${duration}s video motion/pacing, no labels, duration-aware${values.scriptMode === "manual" && values.manualScript ? `. Incorporate voiceover: "${values.manualScript}"` : ""}]

### JSON
{ "part": N, "layout": "GRID", "scenes": [...], "negative_prompt": "..." }

For this part, use grid size: ${chunks.map((c, i) => `Part ${i + 1} = ${gridFor(c.end - c.start + 1)}`).join(", ")}.`;

    const userPrompt = `Generate a ${sceneCount}-scene UGC storyboard sheet for a ${duration}s TikTok affiliate video.
Split into ${totalParts} part(s): ${chunkInfo}

CRITICAL: Each "Storyboard Prompt" section MUST:
- Start with: "Create a clean UGC storyboard comic grid layout."
- Specify grid size (${chunks.map((c, i) => `Part ${i + 1}: ${gridFor(c.end - c.start + 1)}`).join(", ")})
- Include instruction that text must stay OUTSIDE image frames
- List each scene as pure visual description (no dialogue, no quotes)

Product name: ${values.productName}
Category: ${values.productCategory}
Content vibe: ${values.contentStyle.toLowerCase()} (natural, not labeled)
Environment: ${env}
Camera: ${values.cameraDevice}
Video model target: ${values.videoModel}
${values.characterDesc ? `Character: ${values.characterDesc}` : ""}
${values.productDesc ? `Product notes (context only, do NOT describe packaging): ${values.productDesc}` : ""}
${values.scriptMode === "manual" && values.manualScript ? `Voiceover (for Video Prompt only, NOT image prompt): "${values.manualScript}"` : ""}

Write in Bahasa Indonesia (natural creator style).
Generate ALL ${totalParts} part(s) in the EXACT output format above.`;

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

          {result && <ResultTabs result={result} />}
        </div>
      </div>
    </div>
  );
}
