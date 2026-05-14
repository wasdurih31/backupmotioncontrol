"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Copy, CheckCircle2, ArrowLeft, Film, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const MODEL_OPTIONS = [
  { value: "openrouter|auto-free", label: "Auto Free (OpenRouter)" },
  { value: "openrouter|gemma-4-26b", label: "Gemma 4 26B (Free)" },
  { value: "groq|llama-4-scout", label: "Llama 4 Scout (Free)" },
  { value: "groq|llama-4-maverick", label: "Llama 4 Maverick (Free)" },
  { value: "google|gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (BYOK)" },
  { value: "google|gemini-3-flash-preview", label: "Gemini 3 Flash Preview (BYOK)" },
  { value: "google|gemini-2.5-flash", label: "Gemini 2.5 Flash (BYOK)" },
];

const CATEGORIES = ["beauty", "fashion", "food", "tech", "lifestyle"];
const CONTENT_STYLES = ["Soft Sell", "Problem Solution", "Beauty Creator", "Testimonial"];
const ENVIRONMENTS = [
  "Bathroom Mirror", "Bedroom Natural Light", "Vanity Table", "Luxury Hotel Bathroom",
  "Minimalist Room", "Cafe Lifestyle", "City Walk", "Rooftop Casual", "Shopping Mall",
];
const CASUAL_DEVICES = ["iPhone 13", "iPhone 15 Pro", "iPhone 16 Pro", "Samsung S24"];
const PRO_DEVICES = ["Sony A7S III", "Sony FX3", "Canon R5", "Fujifilm XT5"];
const ALL_DEVICES = [...CASUAL_DEVICES, ...PRO_DEVICES];
const SCENE_COUNTS = ["3", "4", "5", "6", "7", "8", "9", "10", "12"];
const DURATIONS = ["5", "6", "8", "10", "15"];

const WORD_LIMITS: Record<string, string> = {
  "5": "15-20 kata", "6": "15-20 kata", "8": "20-35 kata", "10": "35-50 kata", "15": "50-80 kata",
};

const schema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  productName: z.string().min(1, "Nama produk wajib diisi"),
  productCategory: z.string().min(1),
  contentStyle: z.string().min(1),
  environment: z.string(),
  manualEnv: z.string().optional(),
  useManualEnv: z.boolean().optional(),
  cameraDevice: z.string().min(1),
  sceneCount: z.string().min(1),
  duration: z.string().min(1),
  scriptMode: z.string().min(1),
  manualScript: z.string().optional(),
}).refine((data) => {
  if (data.useManualEnv && (!data.manualEnv || data.manualEnv.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "Latar belakang manual wajib diisi",
  path: ["manualEnv"],
});

type FormValues = z.infer<typeof schema>;

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

function parseResult(raw: string): { storyboard: string; video: string; jsonImage: string; jsonVideo: string } {
  const storyboardParts: string[] = [];
  const videoParts: string[] = [];
  const jsonImageParts: string[] = [];
  const jsonVideoParts: string[] = [];

  const storyboardRegex = /###?\s*Storyboard Prompt\s*\n([\s\S]*?)(?=###?\s*Video Prompt|###?\s*JSON|##\s*Prompt Part|$)/gi;
  const videoRegex = /###?\s*Video Prompt\s*\n([\s\S]*?)(?=###?\s*JSON|###?\s*Storyboard|##\s*Prompt Part|$)/gi;
  const jsonImageRegex = /###?\s*JSON\s*(?:Image|Gambar)\s*\n([\s\S]*?)(?=###?\s*JSON\s*(?:Video)|###?\s*Storyboard|##\s*Prompt Part|$)/gi;
  const jsonVideoRegex = /###?\s*JSON\s*(?:Video)\s*\n([\s\S]*?)(?=###?\s*Storyboard|##\s*Prompt Part|$)/gi;

  let match;
  while ((match = storyboardRegex.exec(raw)) !== null) storyboardParts.push(match[1].trim());
  while ((match = videoRegex.exec(raw)) !== null) videoParts.push(match[1].trim());
  while ((match = jsonImageRegex.exec(raw)) !== null) jsonImageParts.push(match[1].trim());
  while ((match = jsonVideoRegex.exec(raw)) !== null) jsonVideoParts.push(match[1].trim());

  if (jsonImageParts.length === 0 && jsonVideoParts.length === 0) {
    const genericJsonRegex = /###?\s*JSON\s*\n([\s\S]*?)(?=###?\s*Storyboard|###?\s*Video|##\s*Prompt Part|$)/gi;
    while ((match = genericJsonRegex.exec(raw)) !== null) jsonImageParts.push(match[1].trim());
  }

  return {
    storyboard: storyboardParts.length > 0 ? storyboardParts.join("\n\n---\n\n") : raw,
    video: videoParts.length > 0 ? videoParts.join("\n\n---\n\n") : "",
    jsonImage: jsonImageParts.length > 0 ? jsonImageParts.join("\n\n") : "",
    jsonVideo: jsonVideoParts.length > 0 ? jsonVideoParts.join("\n\n") : "",
  };
}

function ResultTabs({ result }: { result: string }) {
  const [activeTab, setActiveTab] = useState<"storyboard" | "video" | "jsonImage" | "jsonVideo">("storyboard");
  const [copiedTab, setCopiedTab] = useState(false);
  const parsed = parseResult(result);
  const tabs = [
    { id: "storyboard" as const, label: "🖼️ Image Prompt", content: parsed.storyboard },
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
          <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" />Hasil Generate</CardTitle>
          <Button variant="outline" size="sm" onClick={handleCopyTab} className="gap-1.5 text-xs">
            {copiedTab ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedTab ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="flex gap-1 border-b border-border/30 -mx-6 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? "border-blue-500 text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >{tab.label}</button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-black/40 rounded-xl p-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
          {currentContent ? <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">{currentContent}</pre>
            : <p className="text-xs text-muted-foreground italic text-center py-8">Section tidak ditemukan. Coba generate ulang.</p>}
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
      provider: "openrouter", model: "auto-free",
      productName: "", productCategory: "beauty", contentStyle: "Problem Solution",
      environment: "Bedroom Natural Light", manualEnv: "", useManualEnv: false,
      cameraDevice: "iPhone 15 Pro", sceneCount: "6", duration: "10",
      scriptMode: "auto", manualScript: "",
    },
  });

  const useManualEnv = form.watch("useManualEnv");
  const scriptMode = form.watch("scriptMode");
  const duration = form.watch("duration");
  const sceneCount = parseInt(form.watch("sceneCount") || "6");
  const previewChunks = computeChunks(sceneCount);

  function gridFor(n: number): string {
    if (n <= 4) return "2x2";
    if (n <= 6) return "2x3";
    if (n <= 9) return "3x3";
    return "4x3";
  }

  async function onSubmit(values: FormValues) {
    setIsGenerating(true);
    setResult(null);

    const sc = parseInt(values.sceneCount);
    const dur = values.duration;
    const isSmartphone = CASUAL_DEVICES.includes(values.cameraDevice);
    const cameraStyle = isSmartphone
      ? `${values.cameraDevice} selfie camera, natural smartphone photography style, authentic social media aesthetic`
      : `${values.cameraDevice}, cinematic depth of field, professional lighting response`;
    const env = values.useManualEnv && values.manualEnv?.trim() ? values.manualEnv.trim() : values.environment;

    const chunks = computeChunks(sc);
    const totalParts = chunks.length;
    const chunkInfo = chunks.map((c, i) => `Part ${i + 1}: Scene ${c.start}-${c.end}`).join(", ");
    const wordTarget = dur === "5" || dur === "6" ? "15-20" : dur === "8" ? "20-35" : dur === "10" ? "35-50" : "50-80";

    const systemPrompt = `You are a professional storyboard artist creating COMIC-GRID STORYBOARD SHEET images for UGC affiliate content.

YOUR TASK: Create an IMAGE GENERATION PROMPT (storyboard sheet) + a VIDEO PROMPT with natural voice over.

STORYBOARD IMAGE RULES:
- Comic-grid layout (${chunks.map((c, i) => `Part ${i + 1}: ${gridFor(c.end - c.start + 1)}`).join(", ")})
- Each panel = photo + white caption area below with "Scene N" label + description
- Captions REQUIRED below every panel (rendered as text in caption area, NOT overlay on photo)
- Photography style: ${cameraStyle}
- Setting: ${env}
- Scenes: visual description only, 10-25 words, no dialogue
- Product: "produk sesuai gambar referensi" (NEVER describe packaging)
- Character: "wanita yang sama" / "model yang sama" across scenes

CRITICAL DO NOT USE: screenplay labels (Hook, CTA, Goal), metadata blocks, dialogue in image prompt, TikTok subtitle style

SCENE CHUNKING: ${sc} scenes → ${totalParts} part(s): ${chunkInfo}
${totalParts > 1 ? "CONTINUATION: subsequent parts start with 'Lanjutan storyboard sebelumnya dengan wanita yang sama...'" : ""}

VIDEO PROMPT RULES:
- Scene list: visual descriptions only (what model does)
- Voice Over: ONE connected conversational paragraph (NOT per-scene fragments)
- Voice Over style: natural TikTok creator, emotional, relatable, casual Bahasa Indonesia
- Voice Over word count: ${wordTarget} words for ${dur}s video
- GOOD: "Aduh kenapa kulit aku akhir-akhir ini kering banget sih..."
- BAD: "Kulit terasa kering." (robotic fragment)
${values.scriptMode === "manual" && values.manualScript ? `- USE THIS MANUAL VOICE OVER: "${values.manualScript}"` : "- Generate natural affiliate voice over (problem → frustration → discovery → result → recommendation)"}

OUTPUT FORMAT (for EACH part):

## Prompt Part [N]

### Storyboard Prompt
Create a clean UGC storyboard sheet with a [GRID] comic-grid layout.
Layout: photo panel + white caption area below with "Scene N" bold label and description. Captions REQUIRED. Text in caption area only, NOT overlay on photo. Editorial magazine style.
Photography: ${cameraStyle}. Setting: ${env}.

Scene 1: [wanita yang sama + visual action + framing + lighting]
Scene 2: ...
...

Negative prompt: no subtitles on photo, no text overlay on image, no tiktok caption, no infographic design, no poster design, no watermark, distorted face, extra fingers, blurry product, CGI skin, plastic skin

### Video Prompt
Scene 1: [visual description]
Scene 2: [visual description]
...

Voice Over: "[one connected conversational paragraph, ${wordTarget} words]"

Camera Style: ${cameraStyle}
Motion Style: natural handheld movement, realistic body motion, casual creator pacing

### JSON Image
{ "part": N, "layout": "GRID", "scenes": [...], "negative_prompt": "..." }

### JSON Video
{ "part": N, "scenes": [...], "voice_over": "...", "camera_style": "...", "duration": "${dur}s" }`;

    const userPrompt = `Generate ${sc}-scene UGC storyboard for ${dur}s TikTok affiliate video.
Split: ${totalParts} part(s): ${chunkInfo}

Product: ${values.productName}
Category: ${values.productCategory}
Vibe: ${values.contentStyle.toLowerCase()}
Environment: ${env}
Camera: ${values.cameraDevice}
${values.scriptMode === "manual" && values.manualScript ? `Voice over (use exactly): "${values.manualScript}"` : "Voice over: auto generate (natural TikTok creator style)"}

Write in Bahasa Indonesia. Generate ALL parts in exact format above.`;

    try {
      const res = await fetch("/api/promptgen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, provider: values.provider, model: values.model }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal generate"); return; }
      setResult(data.result);
      toast.success(`Prompt berhasil! (${totalParts} part${totalParts > 1 ? "s" : ""})`);
    } catch (err: any) { toast.error(err.message || "Error"); }
    finally { setIsGenerating(false); }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/promptgen"><Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Film className="w-6 h-6 text-blue-400" />Storyboard UGC</h1>
          <p className="text-sm text-muted-foreground">Generate storyboard prompt untuk affiliate content</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/30 border-border/50">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* AI Model */}
                <FormField control={form.control} name="model" render={() => (
                  <FormItem>
                    <FormLabel className="text-xs">AI Model</FormLabel>
                    <Select value={`${form.getValues("provider")}|${form.getValues("model")}`}
                      onValueChange={(v) => { const parts = (v || "").split("|"); form.setValue("provider", parts[0] || "openrouter"); form.setValue("model", parts[1] || "auto-free"); }}>
                      <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{MODEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />

                {/* Nama Produk */}
                <FormField control={form.control} name="productName" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs">Nama Produk *</FormLabel>
                    <FormControl><Input placeholder="Contoh: Glad2Glow Peeling Gel" {...field} className="bg-black/20 border-border/40" /></FormControl>
                  </FormItem>
                )} />

                {/* Kategori + Content Style */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="productCategory" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contentStyle" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Content Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{CONTENT_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Latar Belakang */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Latar Belakang</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[10px] text-muted-foreground">Manual</span>
                      <input type="checkbox" className="w-4 h-4 rounded accent-blue-500"
                        checked={!!useManualEnv} onChange={(e) => form.setValue("useManualEnv", e.target.checked)} />
                    </label>
                  </div>
                  {useManualEnv ? (
                    <FormField control={form.control} name="manualEnv" render={({ field, fieldState }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Wajib diisi. Contoh: Kamar tidur minimalis dengan cahaya jendela pagi" {...field} className={`bg-black/20 border-border/40 ${fieldState.error ? "border-red-500/50" : ""}`} /></FormControl>
                        {fieldState.error && <p className="text-[11px] text-red-400 mt-1">{fieldState.error.message}</p>}
                      </FormItem>
                    )} />
                  ) : (
                    <FormField control={form.control} name="environment" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>{ENVIRONMENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  )}
                </div>

                {/* Camera + Scene */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="cameraDevice" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Device Camera</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{ALL_DEVICES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sceneCount" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Jumlah Scene</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{SCENE_COUNTS.map((s) => <SelectItem key={s} value={s}>{s} scene</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Chunking preview */}
                {previewChunks.length > 1 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5 text-[11px] text-blue-300/80">
                    <span className="font-bold text-blue-300">Auto-split:</span>{" "}
                    {previewChunks.map((c, i) => `Part ${i + 1} (Scene ${c.start}-${c.end})`).join(" → ")}
                  </div>
                )}

                {/* Durasi + Script Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="duration" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Durasi Video</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={d}>{d} detik</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="scriptMode" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Script / Voice Over</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="bg-black/20 border-border/40"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="auto">Auto AI Script</SelectItem>
                          <SelectItem value="manual">Manual Script</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {/* Manual Script */}
                {scriptMode === "manual" && (
                  <div className="space-y-2">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-200/80">
                        <p className="font-bold text-amber-300 mb-0.5">Panduan durasi script:</p>
                        <p>Untuk video <span className="font-bold text-white">{duration} detik</span>, gunakan sekitar <span className="font-bold text-white">{WORD_LIMITS[duration] || "35-50 kata"}</span>.</p>
                        <p className="mt-1 text-amber-300/60">Pace bicara natural: ~2-3 kata/detik. Tulis seperti kamu ngomong ke kamera.</p>
                      </div>
                    </div>
                    <FormField control={form.control} name="manualScript" render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Voice Over Script</FormLabel>
                        <FormControl><Textarea placeholder="Contoh: Aduh kenapa kulit aku akhir-akhir ini kering banget sih. Padahal udah pakai skincare tapi masih terasa kasar..." {...field} className="bg-black/20 border-border/40 h-28" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                )}

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
