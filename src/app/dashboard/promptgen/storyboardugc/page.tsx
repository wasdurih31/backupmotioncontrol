"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const MODEL_OPTIONS = [
  { value: "openrouter|auto-free", label: "Auto Free (OpenRouter)" },
  { value: "openrouter|gemma-4-26b", label: "Gemma 4 26B (Free)" },
  { value: "groq|llama-4-scout", label: "Llama 4 Scout (Free)" },
  { value: "groq|llama-4-maverick", label: "Llama 4 Maverick (Free)" },
  { value: "google|gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (BYOK)" },
  { value: "google|gemini-3-flash-preview", label: "Gemini 3 Flash Preview (BYOK)" },
  { value: "google|gemini-2.5-flash", label: "Gemini 2.5 Flash (BYOK)" },
];
const CATEGORIES = ["Beauty", "Fashion", "Food", "Tech", "Lifestyle"];
const CONTENT_STYLES = ["Soft Sell", "Problem Solution", "Beauty Creator", "Testimonial"];
const ENVIRONMENTS = ["Bathroom Mirror", "Bedroom Natural Light", "Vanity Table", "Luxury Hotel Bathroom", "Minimalist Room", "Cafe Lifestyle", "City Walk", "Rooftop Casual", "Shopping Mall"];
const CASUAL_DEVICES = ["iPhone 13", "iPhone 15 Pro", "iPhone 16 Pro", "Samsung S24"];
const PRO_DEVICES = ["Sony A7S III", "Sony FX3", "Canon R5", "Fujifilm XT5"];
const ALL_DEVICES = [...CASUAL_DEVICES, ...PRO_DEVICES];
const SCENE_COUNTS = ["3", "4", "5", "6", "7", "8", "9", "10", "12"];
const DURATIONS = ["5", "6", "8", "10", "15"];
const WORD_LIMITS: Record<string, string> = { "5": "15-20", "6": "15-20", "8": "20-35", "10": "35-50", "15": "50-80" };

const schema = z.object({
  provider: z.string(), model: z.string(),
  productName: z.string().min(1, "Wajib diisi"),
  productCategory: z.string(), contentStyle: z.string(),
  environment: z.string(), manualEnv: z.string().optional(), useManualEnv: z.boolean().optional(),
  cameraDevice: z.string(), sceneCount: z.string(), duration: z.string(),
  scriptMode: z.string(), manualScript: z.string().optional(),
}).refine((d) => !(d.useManualEnv && (!d.manualEnv || !d.manualEnv.trim())), { message: "Latar belakang wajib diisi", path: ["manualEnv"] });

type FV = z.infer<typeof schema>;

function computeChunks(total: number) {
  if (total <= 6) return [{ start: 1, end: total }];
  const n = Math.ceil(total / 4);
  const base = Math.floor(total / n);
  let rem = total % n, cur = 1;
  const c: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < n; i++) { const s = base + (rem > 0 ? 1 : 0); if (rem > 0) rem--; c.push({ start: cur, end: cur + s - 1 }); cur += s; }
  return c;
}
function gridFor(n: number) { return n <= 4 ? "2x2" : n <= 6 ? "2x3" : n <= 9 ? "3x3" : "4x3"; }

export default function StoryboardUGCPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"image" | "video" | "jsonImg" | "jsonVid">("image");
  const [copied, setCopied] = useState(false);

  const form = useForm<FV>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "openrouter", model: "auto-free", productName: "", productCategory: "Beauty",
      contentStyle: "Problem Solution", environment: "Bedroom Natural Light", manualEnv: "",
      useManualEnv: false, cameraDevice: "iPhone 15 Pro", sceneCount: "6", duration: "10",
      scriptMode: "auto", manualScript: "",
    },
  });

  const useManualEnv = form.watch("useManualEnv");
  const scriptMode = form.watch("scriptMode");
  const duration = form.watch("duration");
  const sc = parseInt(form.watch("sceneCount") || "6");
  const chunks = computeChunks(sc);

  async function onSubmit(values: FV) {
    setIsGenerating(true); setResult(null);
    const sceneCount = parseInt(values.sceneCount);
    const dur = values.duration;
    const isPhone = CASUAL_DEVICES.includes(values.cameraDevice);
    const camStyle = isPhone ? `${values.cameraDevice} selfie camera, natural smartphone photography` : `${values.cameraDevice}, cinematic depth of field`;
    const env = values.useManualEnv && values.manualEnv?.trim() ? values.manualEnv.trim() : values.environment;
    const cks = computeChunks(sceneCount);
    const parts = cks.length;
    const chunkInfo = cks.map((c, i) => `Part ${i + 1}: Scene ${c.start}-${c.end}`).join(", ");
    const wt = WORD_LIMITS[dur] || "35-50";

    const systemPrompt = `You are a professional storyboard artist creating COMIC-GRID STORYBOARD SHEET images for UGC affiliate content.
Create an IMAGE GENERATION PROMPT (storyboard sheet) + VIDEO PROMPT with natural voice over.

STORYBOARD IMAGE: comic-grid (${cks.map((c, i) => `Part ${i + 1}: ${gridFor(c.end - c.start + 1)}`).join(", ")}). Each panel = photo + white caption area below with "Scene N" + description. Captions REQUIRED. Photography: ${camStyle}. Setting: ${env}.
Scenes: visual only, 10-25 words, no dialogue. Product: "produk sesuai gambar referensi". Character: "wanita yang sama".
DO NOT USE: Hook, CTA, Goal, screenplay labels, dialogue in image prompt.
${parts > 1 ? "CONTINUATION: subsequent parts start with 'Lanjutan storyboard sebelumnya...'" : ""}

VIDEO PROMPT: Scene list (visuals only) + Voice Over (ONE connected conversational paragraph, ${wt} words, natural TikTok creator style, Bahasa Indonesia).
${values.scriptMode === "manual" && values.manualScript ? `USE THIS VOICE OVER: "${values.manualScript}"` : "Generate natural affiliate voice over."}

OUTPUT (for EACH part):
## Prompt Part [N]
### Storyboard Prompt
Create a clean UGC storyboard sheet with a [GRID] comic-grid layout. Photo panel + white caption area below. Captions REQUIRED. Photography: ${camStyle}. Setting: ${env}.
Scene 1: ...
...
Negative prompt: no subtitles on photo, no text overlay on image, no tiktok caption, no infographic, no poster, no watermark, distorted face, extra fingers, blurry product
### Video Prompt
Scene 1: [visual]
...
Voice Over: "[connected paragraph, ${wt} words]"
Camera Style: ${camStyle}
Motion Style: natural handheld, casual creator pacing
### JSON Image
{ "part": N, "layout": "GRID", "scenes": [...], "negative_prompt": "..." }
### JSON Video
{ "part": N, "scenes": [...], "voice_over": "...", "duration": "${dur}s" }`;

    const userPrompt = `Generate ${sceneCount}-scene UGC storyboard for ${dur}s TikTok affiliate video. Split: ${parts} part(s): ${chunkInfo}
Product: ${values.productName} | Category: ${values.productCategory} | Vibe: ${values.contentStyle.toLowerCase()} | Env: ${env} | Camera: ${values.cameraDevice}
${values.scriptMode === "manual" && values.manualScript ? `Voice over: "${values.manualScript}"` : "Voice over: auto generate"}
Write in Bahasa Indonesia. Generate ALL parts.`;

    try {
      const res = await fetch("/api/promptgen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt, userPrompt, provider: values.provider, model: values.model }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Gagal generate"); return; }
      setResult(data.result);
      toast.success("Prompt berhasil!");
    } catch (err: any) { toast.error(err.message || "Error"); }
    finally { setIsGenerating(false); }
  }

  // Parse result into tabs
  function getSection(key: string): string {
    if (!result) return "";
    const regexMap: Record<string, RegExp> = {
      image: /###?\s*Storyboard Prompt\s*\n([\s\S]*?)(?=###?\s*Video Prompt|###?\s*JSON|##\s*Prompt Part|$)/gi,
      video: /###?\s*Video Prompt\s*\n([\s\S]*?)(?=###?\s*JSON|###?\s*Storyboard|##\s*Prompt Part|$)/gi,
      jsonImg: /###?\s*JSON\s*(?:Image|Gambar)?\s*\n([\s\S]*?)(?=###?\s*JSON\s*Video|###?\s*Video|###?\s*Storyboard|##\s*Prompt Part|$)/gi,
      jsonVid: /###?\s*JSON\s*Video\s*\n([\s\S]*?)(?=###?\s*Storyboard|##\s*Prompt Part|$)/gi,
    };
    const re = regexMap[key];
    if (!re) return result;
    const parts: string[] = [];
    let m;
    while ((m = re.exec(result)) !== null) parts.push(m[1].trim());
    return parts.length > 0 ? parts.join("\n\n---\n\n") : (key === "image" ? result : "");
  }

  const currentContent = getSection(activeTab);
  const handleCopy = () => { navigator.clipboard.writeText(currentContent); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); };

  const selectClass = "w-full bg-[#141414] border border-[#333] text-[#e5e5e5] font-mono text-sm px-4 py-3.5 rounded-lg focus:border-white focus:ring-1 focus:ring-white transition-all appearance-none outline-none";
  const inputClass = "w-full bg-[#141414] border border-[#333] text-[#e5e5e5] font-mono text-sm px-4 py-3.5 rounded-lg focus:border-white focus:ring-1 focus:ring-white transition-all outline-none placeholder:text-[#555]";
  const labelClass = "text-[11px] font-semibold tracking-[0.05em] text-[#a3a3a3] uppercase block mb-2";

  return (
    <div className="min-h-screen pb-24">
      {/* Back button */}
      <div className="mb-8">
        <Link href="/dashboard/promptgen" className="inline-flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left: Form */}
        <section className="lg:col-span-5 flex flex-col gap-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight">Storyboard UGC</h1>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">Configure parameters for your AI storyboard prompt.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* AI Model */}
            <div><label className={labelClass}>AI Model</label>
              <select className={selectClass} value={`${form.getValues("provider")}|${form.getValues("model")}`}
                onChange={(e) => { const [p, m] = e.target.value.split("|"); form.setValue("provider", p); form.setValue("model", m); }}>
                {MODEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Product Name */}
            <div><label className={labelClass}>Product Name</label>
              <input className={inputClass} placeholder="e.g. Glad2Glow Peeling Gel" {...form.register("productName")} />
              {form.formState.errors.productName && <p className="text-red-400 text-xs mt-1">{form.formState.errors.productName.message}</p>}
            </div>

            {/* Category + Content Style */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Category</label>
                <select className={selectClass} {...form.register("productCategory")}>
                  {CATEGORIES.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Content Style</label>
                <select className={selectClass} {...form.register("contentStyle")}>
                  {CONTENT_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Background */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold tracking-[0.05em] text-[#a3a3a3] uppercase">Background</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[10px] text-[#666]">Manual</span>
                  <input type="checkbox" className="w-3.5 h-3.5 rounded accent-white bg-[#141414] border-[#333]"
                    checked={!!useManualEnv} onChange={(e) => form.setValue("useManualEnv", e.target.checked)} />
                </label>
              </div>
              {useManualEnv ? (
                <input className={inputClass} placeholder="Wajib diisi. Contoh: Kamar tidur minimalis, cahaya jendela pagi" {...form.register("manualEnv")} />
              ) : (
                <select className={selectClass} {...form.register("environment")}>
                  {ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
              {form.formState.errors.manualEnv && <p className="text-red-400 text-xs mt-1">{form.formState.errors.manualEnv.message}</p>}
            </div>

            {/* Camera + Scenes */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Device Camera</label>
                <select className={selectClass} {...form.register("cameraDevice")}>
                  {ALL_DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Scenes</label>
                <select className={selectClass} {...form.register("sceneCount")}>
                  {SCENE_COUNTS.map((s) => <option key={s} value={s}>{s} Scenes</option>)}
                </select>
              </div>
            </div>

            {/* Chunking info */}
            {chunks.length > 1 && (
              <div className="bg-[#141414] border border-[#333] rounded-lg px-4 py-2.5 text-[11px] text-[#a3a3a3]">
                Auto-split: {chunks.map((c, i) => `Part ${i + 1} (Scene ${c.start}-${c.end})`).join(" → ")}
              </div>
            )}

            {/* Duration + Script */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Duration</label>
                <select className={selectClass} {...form.register("duration")}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} Seconds</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Script</label>
                <select className={selectClass} {...form.register("scriptMode")}>
                  <option value="auto">Auto AI Script</option>
                  <option value="manual">Manual Script</option>
                </select>
              </div>
            </div>

            {/* Manual Script */}
            {scriptMode === "manual" && (
              <div className="space-y-2">
                <div className="bg-[#141414] border border-[#333] rounded-lg px-4 py-3 text-[11px] text-[#a3a3a3]">
                  <span className="text-white font-medium">Durasi {duration}s</span> → gunakan sekitar <span className="text-white font-medium">{WORD_LIMITS[duration] || "35-50"} kata</span>. Pace: ~2-3 kata/detik.
                </div>
                <textarea className={`${inputClass} h-28 resize-none`} placeholder="Contoh: Aduh kenapa kulit aku akhir-akhir ini kering banget sih..." {...form.register("manualScript")} />
              </div>
            )}

            {/* Submit */}
            <div className="pt-4">
              <button type="submit" disabled={isGenerating}
                className="w-full bg-white text-black font-semibold text-sm py-4 rounded-lg hover:bg-[#e5e5e5] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><span className="text-lg">✦</span> Generate Storyboard</>}
              </button>
            </div>
          </form>
        </section>

        {/* Right: Prompt Shell */}
        <section className="lg:col-span-7 flex flex-col bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden shadow-2xl min-h-[500px]">
          {/* Shell Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-[#262626]">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${result ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : isGenerating ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)] animate-pulse" : "bg-[#555]"}`} />
              <span className="text-[11px] font-semibold tracking-widest text-[#a3a3a3] uppercase">Prompt Shell</span>
            </div>
            {result && (
              <button onClick={handleCopy} className="text-[#a3a3a3] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                {copied ? "✓ Copied" : "⎘ Copy"}
              </button>
            )}
          </div>

          {/* Tabs */}
          {result && (
            <div className="flex border-b border-[#262626] px-6">
              {([["image", "Image Prompt"], ["video", "Video Prompt"], ["jsonImg", "JSON Image"], ["jsonVid", "JSON Video"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)} className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === id ? "border-white text-white" : "border-transparent text-[#666] hover:text-[#a3a3a3]"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Terminal Content */}
          <div className="flex-1 bg-[#0a0a0a] m-4 rounded-xl border border-[#262626] overflow-hidden">
            <div className="p-6 h-[500px] overflow-y-auto font-mono text-sm text-[#e5e5e5] leading-relaxed custom-scrollbar">
              {isGenerating && !result && (
                <div className="animate-pulse">
                  <p className="text-green-400 mb-4">// Generation active...</p>
                  <p className="text-[#a3a3a3] mb-4"># SYSTEM: UGC_STORYBOARD_GENERATOR</p>
                  <p className="text-[#555]">Waiting for AI response...</p>
                </div>
              )}
              {!isGenerating && !result && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[#555] text-center">Configure parameters and click Generate to see output here.</p>
                </div>
              )}
              {result && (
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed">{currentContent || "Section not found."}</pre>
              )}
            </div>
          </div>

          {/* Footer metadata */}
          {result && (
            <div className="px-6 py-4 border-t border-[#262626] grid grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-[#666] uppercase block mb-1">Characters</span>
                <span className="font-mono text-xs text-white">{currentContent.length.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-[#666] uppercase block mb-1">Parts</span>
                <span className="font-mono text-xs text-white">{chunks.length}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
