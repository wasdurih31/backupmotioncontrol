"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
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
const CONTENT_STYLES = ["Soft Sell", "Problem Solution", "Beauty Creator", "Testimonial"];
const BEAUTY_ENVS = ["Bathroom Mirror", "Bedroom Natural Light", "Vanity Table", "Luxury Hotel Bathroom", "Minimalist Room"];
const FASHION_ENVS = ["Cafe Lifestyle", "City Walk", "Bedroom Mirror", "Rooftop Casual", "Shopping Mall"];
const ALL_ENVS = [...BEAUTY_ENVS, ...FASHION_ENVS];
const CASUAL_DEVICES = ["iPhone 13", "iPhone 15 Pro", "iPhone 16 Pro", "Samsung S24"];
const PRO_DEVICES = ["Sony A7S III", "Sony FX3", "Canon R5", "Fujifilm XT5"];
const ALL_DEVICES = [...CASUAL_DEVICES, ...PRO_DEVICES];
const DURATIONS = ["5", "6", "8", "10", "15"];
const WORD_LIMITS: Record<string, string> = { "5": "15-20", "6": "15-20", "8": "20-35", "10": "35-50", "15": "50-80" };
const VIDEO_MODELS = ["Veo 3.1 (8s)", "Seedance 2 (5-15s)", "Grok AI (6-10s)", "Sora 2 (12s)"];

const schema = z.object({
  provider: z.string(),
  model: z.string(),
  productName: z.string().min(1, "Nama produk wajib diisi"),
  productCategory: z.string(),
  contentStyle: z.string(),
  environment: z.string(),
  manualEnv: z.string().optional(),
  useManualEnv: z.boolean().optional(),
  cameraDevice: z.string(),
  duration: z.string(),
  videoModel: z.string(),
  characterDesc: z.string().optional(),
  productDesc: z.string().optional(),
  scriptMode: z.string(),
  manualScript: z.string().optional(),
}).refine((d) => !(d.useManualEnv && (!d.manualEnv || !d.manualEnv.trim())), { message: "Latar belakang wajib diisi", path: ["manualEnv"] });

type FV = z.infer<typeof schema>;

export default function UGCAffiliatePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"images" | "video" | "jsonImage" | "jsonVideo">("images");
  const [copied, setCopied] = useState(false);

  const form = useForm<FV>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "openrouter", model: "auto-free", productName: "", productCategory: "beauty",
      contentStyle: "Soft Sell", environment: "Bedroom Natural Light", manualEnv: "",
      useManualEnv: false, cameraDevice: "iPhone 15 Pro", duration: "8",
      videoModel: "Veo 3.1 (8s)", characterDesc: "", productDesc: "",
      scriptMode: "auto", manualScript: "",
    },
  });

  const useManualEnv = form.watch("useManualEnv");
  const scriptMode = form.watch("scriptMode");
  const duration = form.watch("duration");

  async function onSubmit(values: FV) {
    setIsGenerating(true);
    setResult(null);

    const isSmartphone = CASUAL_DEVICES.includes(values.cameraDevice);
    const cameraStyle = isSmartphone
      ? "smartphone realism, social media exposure, front camera feel"
      : "cinematic depth of field, professional lighting response";
    const env = values.useManualEnv && values.manualEnv?.trim() ? values.manualEnv.trim() : values.environment;

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
Scene 1: [visual description of what model does]
Scene 2: [visual description]
Scene 3: [visual description]
Scene 4: [visual description]
...repeat for 4-6 scenes matching ${values.duration}s duration...

Voice Over: "[One connected conversational voice over. Must sound like a real TikTok creator — emotional, relatable, casual Bahasa Indonesia. Flows naturally across all scenes.]"

Camera Style: [camera + shooting style]
Motion Style: [movement description]

VIDEO PROMPT RULES:
- Scenes: VISUALS ONLY (what model does, no dialogue mixed in)
- Voice Over: ONE connected conversational paragraph (not per-scene fragments)
- Must feel: spontaneous, emotional, natural spoken Indonesian, social-media native
- ${values.scriptMode === "manual" && values.manualScript ? `Use this manual voice over: "${values.manualScript}"` : "Generate natural TikTok creator voice over"}
- Total voice over: ${parseInt(values.duration) <= 6 ? "15-20" : parseInt(values.duration) <= 8 ? "20-35" : parseInt(values.duration) <= 10 ? "35-50" : "50-80"} words
- GOOD: "Aduh kenapa kulit aku akhir-akhir ini kering banget sih..."
- BAD: "Kulit terasa kering." "Kasar tidak nyaman."

### JSON Image
{ "variants": [{"variant":1,"prompt":"...","negative_prompt":"..."},{"variant":2,...},...] }

### JSON Video
{ "scenes": [{"scene":1,"visual":"..."},...],"voice_over":"...","camera_style":"...","motion_style":"...","duration":"${values.duration}s" }`;

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
      if (!res.ok) { toast.error(data.error || "Gagal generate prompt"); return; }
      setResult(data.result);
      toast.success("Prompt berhasil!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally { setIsGenerating(false); }
  }

  // Parse result into tabs
  function getSection(key: string): string {
    if (!result) return "";
    const regexMap: Record<string, RegExp> = {
      images: /###?\s*IMAGE PROMPT VARIANT\s*\d+\s*\n([\s\S]*?)(?=###?\s*IMAGE PROMPT VARIANT|###?\s*VIDEO PROMPT|###?\s*JSON|$)/gi,
      video: /###?\s*VIDEO PROMPT\s*\n([\s\S]*?)(?=###?\s*JSON|###?\s*IMAGE|$)/gi,
      jsonImage: /###?\s*JSON\s*(?:Image|Gambar)\s*\n([\s\S]*?)(?=###?\s*JSON\s*(?:Video)|###?\s*IMAGE|###?\s*VIDEO|$)/gi,
      jsonVideo: /###?\s*JSON\s*(?:Video)\s*\n([\s\S]*?)(?=###?\s*IMAGE|###?\s*VIDEO|$)/gi,
    };
    const re = regexMap[key];
    if (!re) return result;
    const parts: string[] = [];
    let m;
    while ((m = re.exec(result)) !== null) parts.push(m[1].trim());
    if (parts.length === 0 && key === "images") return result;
    if (key === "images" && parts.length > 0) {
      return parts.map((p, i) => `── Variant ${i + 1} ──\n${p}`).join("\n\n");
    }
    return parts.length > 0 ? parts.join("\n\n---\n\n") : "";
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
            <h1 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-white" /> UGC Affiliate
            </h1>
            <p className="text-sm text-[#a3a3a3] leading-relaxed">Generate 4 variasi prompt gambar + video prompt untuk TikTok affiliate.</p>
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
              <input className={inputClass} placeholder="e.g. Wardah UV Shield" {...form.register("productName")} />
              {form.formState.errors.productName && <p className="text-red-400 text-xs mt-1">{form.formState.errors.productName.message}</p>}
            </div>

            {/* Category + Content Style */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Category</label>
                <select className={selectClass} {...form.register("productCategory")}>
                  <option value="beauty">Beauty</option>
                  <option value="fashion">Fashion</option>
                  <option value="food">Food</option>
                  <option value="tech">Tech</option>
                  <option value="lifestyle">Lifestyle</option>
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
                  {ALL_ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
              {form.formState.errors.manualEnv && <p className="text-red-400 text-xs mt-1">{form.formState.errors.manualEnv.message}</p>}
            </div>

            {/* Camera + Video Model */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>Device Camera</label>
                <select className={selectClass} {...form.register("cameraDevice")}>
                  {ALL_DEVICES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Video Model</label>
                <select className={selectClass} {...form.register("videoModel")}>
                  {VIDEO_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

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

            {/* Character Desc (optional) */}
            <div><label className={labelClass}>Character (optional)</label>
              <input className={inputClass} placeholder="e.g. Wanita Asia, rambut panjang, 22 tahun" {...form.register("characterDesc")} />
            </div>

            {/* Product Desc (optional) */}
            <div><label className={labelClass}>Product Notes (optional)</label>
              <input className={inputClass} placeholder="e.g. Tube pink 30ml, label gold (context only)" {...form.register("productDesc")} />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button type="submit" disabled={isGenerating}
                className="w-full bg-white text-black font-semibold text-sm py-4 rounded-lg hover:bg-[#e5e5e5] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><ShoppingBag className="w-4 h-4" /> Generate UGC Prompts</>}
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
              {([["images", "Image Prompts"], ["video", "Video Prompt"], ["jsonImage", "JSON Image"], ["jsonVideo", "JSON Video"]] as const).map(([id, label]) => (
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
                  <p className="text-[#a3a3a3] mb-4"># SYSTEM: UGC_AFFILIATE_GENERATOR</p>
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
                <span className="text-[10px] font-semibold tracking-wider text-[#666] uppercase block mb-1">Variants</span>
                <span className="font-mono text-xs text-white">4</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
