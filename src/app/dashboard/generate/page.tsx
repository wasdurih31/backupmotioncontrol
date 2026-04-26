"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UploadCloud, Image as ImageIcon, Video as VideoIcon, Loader2,
  CheckCircle2, X, Terminal, ChevronUp, ChevronDown,
  Circle, XCircle, Sparkles, Download, Play, RefreshCw, Settings, Clock
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateStore, type PipelineStep, type LogEntry } from "@/store/useGenerateStore";
import LoadingOverlay from "@/components/LoadingOverlay";

// ─── Process Monitor ─────────────────────────────────────────────────
function ProcessMonitor({ steps, logs, isOpen, onToggle, isRunning }: {
  steps: PipelineStep[]; logs: LogEntry[]; isOpen: boolean; onToggle: () => void; isRunning: boolean;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const completedSteps = steps.filter((s) => s.status === "success").length;
  const hasError = steps.some((s) => s.status === "error");
  const totalSteps = steps.length;

  const statusIcon = (s: PipelineStep) => {
    if (s.status === "running") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    if (s.status === "success") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (s.status === "error") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Circle className="w-3.5 h-3.5 text-white/15" />;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            {isRunning && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
          </div>
          <span className="text-sm font-medium text-foreground">
            {isRunning ? "Processing..." : hasError ? "Process Failed" : completedSteps === totalSteps && completedSteps > 0 ? "Process Complete" : "Process Pipeline"}
          </span>
          {(isRunning || completedSteps > 0) && <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{completedSteps}/{totalSteps}</span>}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {(isRunning || completedSteps > 0) && (
        <div className="h-0.5 bg-white/5">
          <div className={`h-full transition-all duration-500 ease-out ${hasError ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
        </div>
      )}
      {isOpen && (
        <div className="border-t border-border/30">
          <div className="px-4 py-3 space-y-1">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 py-1.5">
                <div className="shrink-0 w-5 flex justify-center">{statusIcon(step)}</div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${step.status === "running" ? "text-blue-300" : step.status === "success" ? "text-green-300/80" : step.status === "error" ? "text-red-300" : "text-white/30"}`}>{step.label}</span>
                  {step.detail && <span className={`text-[10px] ml-2 ${step.status === "error" ? "text-red-400/70" : "text-muted-foreground"}`}>— {step.detail}</span>}
                </div>
                {step.timestamp && <span className="text-[10px] text-white/20 font-mono shrink-0">{step.timestamp}</span>}
              </div>
            ))}
          </div>
          {logs.length > 0 && (
            <div className="border-t border-border/20 bg-black/30">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-border/10">
                <div className="flex gap-1"><span className="w-2 h-2 rounded-full bg-red-500/50" /><span className="w-2 h-2 rounded-full bg-yellow-500/50" /><span className="w-2 h-2 rounded-full bg-green-500/50" /></div>
                <span className="text-[10px] text-white/30 font-mono">output</span>
              </div>
              <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-0.5 font-mono">
                {logs.map((log, i) => (
                  <div key={i} className="text-[11px] leading-relaxed flex gap-2">
                    <span className="text-white/20 shrink-0">{log.time}</span>
                    <span className={log.level === "success" ? "text-green-400" : log.level === "error" ? "text-red-400" : log.level === "warn" ? "text-amber-400" : "text-white/50"}>{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result Section (compact card) ───────────────────────────────────
function ResultSection() {
  const pollingStatus = useGenerateStore((s) => s.pollingStatus);
  const resultVideoUrl = useGenerateStore((s) => s.resultVideoUrl);
  const activeTaskId = useGenerateStore((s) => s.activeTaskId);
  const clearResult = useGenerateStore((s) => s.clearResult);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (pollingStatus === "idle" && !activeTaskId) return null;

  return (
    <div className="space-y-4">
      {pollingStatus === "polling" && (
        <div className="rounded-xl border border-blue-500/10 bg-black/40 backdrop-blur-sm overflow-hidden min-h-[300px] flex items-center justify-center">
          <LoadingOverlay isVisible={pollingStatus === "polling"} />
        </div>
      )}

      {pollingStatus === "completed" && resultVideoUrl && (
        <div className="rounded-xl border border-green-500/20 bg-card/30 backdrop-blur-sm overflow-hidden shadow-2xl">
          <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Generation Complete</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">Result ID: {activeTaskId?.slice(0, 8)}</span>
          </div>
          <div className="relative bg-black cursor-pointer group" onClick={() => {
            if (videoRef.current) {
              if (document.fullscreenElement) document.exitFullscreen();
              else videoRef.current.requestFullscreen().catch(() => {});
            }
          }}>
            <video ref={videoRef} src={resultVideoUrl} className="w-full aspect-video object-contain" controls autoPlay loop playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-black/20">
               <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-xs text-white border border-white/20">Click for Fullscreen</div>
            </div>
          </div>
          <div className="p-4 flex gap-3">
            <a href={`/api/download?url=${encodeURIComponent(resultVideoUrl)}`} download className="flex-1">
              <Button type="button" size="lg" className="w-full bg-white text-black hover:bg-white/90 font-bold gap-2 text-sm shadow-lg shadow-white/5">
                <Download className="w-4 h-4" /> Download Video
              </Button>
            </a>
            <Button type="button" size="lg" variant="outline" className="flex-1 border-border/50 bg-transparent hover:bg-white/5 gap-2 text-sm" onClick={clearResult}>
              <RefreshCw className="w-4 h-4" /> Generate New
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center pb-4 px-4 italic">The video will be automatically deleted after 30 minutes.</p>
        </div>
      )}

      {pollingStatus === "completed" && !resultVideoUrl && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm p-10 text-center">
          <p className="text-lg font-medium text-foreground mb-2">Video processed but URL not available</p>
          <p className="text-sm text-muted-foreground mb-6">The video may have expired or was removed from storage.</p>
          <Button type="button" size="lg" variant="outline" className="border-border/50 gap-2 px-8" onClick={clearResult}><RefreshCw className="w-4 h-4" /> Try Again</Button>
        </div>
      )}

      {pollingStatus === "failed" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm p-10 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">Video generation failed</p>
          <p className="text-sm text-muted-foreground mb-6">Something went wrong on the Freepik side. Please try again with different inputs.</p>
          <Button type="button" size="lg" variant="outline" className="border-border/50 gap-2 px-8" onClick={clearResult}><RefreshCw className="w-4 h-4" /> Try Again</Button>
        </div>
      )}
    </div>
  );
}

// ─── Gallery Section ───────────────────────────────────────────────────
function GallerySection() {
  const [tasks, setTasks] = useState<any[]>([]);
  const galleryRefreshTrigger = useGenerateStore((s) => s.galleryRefreshTrigger);
  const activeTaskId = useGenerateStore((s) => s.activeTaskId); // To exclude the active one if we want, but it's fine to show all.

  useEffect(() => {
    let mounted = true;
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/tasks");
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json.data) {
          const now = Date.now();
          const validTasks = json.data.filter((t: any) => {
            if (t.status !== "success" || !t.resultUrl) return false;
            // Filter out the currently active task so it doesn't duplicate with ResultSection
            if (t.id === activeTaskId) return false;
            if (t.expiresAt && new Date(t.expiresAt).getTime() < now) return false;
            return true;
          });
          setTasks(validTasks);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchTasks();
    return () => { mounted = false; };
  }, [galleryRefreshTrigger, activeTaskId]);

  if (tasks.length === 0) return null;

  return (
    <div className="space-y-4 pt-6 border-t border-border/30">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        Video Gallery (Recent)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tasks.map((t) => (
          <div key={t.id} className="rounded-xl border border-border/50 bg-card/30 overflow-hidden relative group flex flex-col">
            <div className="relative bg-black/50 flex-1">
              <video src={t.resultUrl} className="w-full h-full aspect-video object-contain" controls playsInline />
            </div>
            <div className="p-3 border-t border-border/30 flex justify-between items-center bg-black/40">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-mono">ID: {t.id.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleTimeString()}</span>
              </div>
              <a href={`/api/download?url=${encodeURIComponent(t.resultUrl)}`} download>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-white">
                  <Download className="w-4 h-4" />
                </Button>
              </a>
            </div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[9px] text-white/70 border border-white/10 pointer-events-none">
              Auto-deletes in 30m
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
const generateSchema = z.object({
  prompt: z.string().max(2500, "Prompt cannot exceed 2500 characters").optional(),
  character_orientation: z.enum(["video", "image"]).optional(),
  cfg_scale: z.number().min(0).max(1).optional(),
  model: z.string().optional(),
  engine: z.enum(["kling", "pixverse", "kling_2_1_pro"]),
  resolution: z.enum(["360p", "540p", "720p", "1080p"]).optional(),
  duration: z.number().optional(),
  negative_prompt: z.string().optional(),
  style: z.string().optional(),
}).refine(data => {
  if (data.engine !== 'kling' && (!data.prompt || data.prompt.toString().trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Prompt is required for this model",
  path: ["prompt"],
});

interface UploadZoneProps {
  type: "video" | "image";
  file: File | null;
  previewUrl: string | null;
  setFile: (file: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isGenerating: boolean;
}

function UploadZone({ type, file, previewUrl, setFile, inputRef, isGenerating }: UploadZoneProps) {
  const isVideo = type === "video";
  const accept = isVideo ? ".mp4,.mov,.webm,.m4v" : ".png,.jpg,.jpeg,.webp";
  const label = isVideo ? "Video" : "Image";
  const formats = isVideo ? "MP4, MOV, WEBM" : "PNG, JPG, WEBP";
  const Icon = isVideo ? VideoIcon : ImageIcon;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium leading-none flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {isVideo ? "Ref" : "Char"} {label} <span className="text-red-500">*</span>
      </label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
      {file && previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-black/40 group flex items-center justify-center h-40">
          {isVideo ? <video src={previewUrl} className="max-w-full max-h-full object-contain" controls muted playsInline /> : <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             {!isGenerating && (
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-2 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-lg">
                <X className="w-4 h-4" />
              </button>
             )}
          </div>
        </div>
      ) : (
        <div className={`border border-dashed border-border/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all bg-card/20 h-40 ${isGenerating ? "opacity-50 pointer-events-none" : ""}`} onClick={() => inputRef.current?.click()}>
          <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-[10px] font-medium text-foreground">Upload {label}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{formats}</p>
        </div>
      )}
    </div>
  );
}

export default function GenerateVideoPage() {
  const videoFile = useGenerateStore((s) => s.videoFile);
  const imageFile = useGenerateStore((s) => s.imageFile);
  const setVideoFile = useGenerateStore((s) => s.setVideoFile);
  const setImageFile = useGenerateStore((s) => s.setImageFile);
  const steps = useGenerateStore((s) => s.steps);
  const logs = useGenerateStore((s) => s.logs);
  const isSubmitting = useGenerateStore((s) => s.isSubmitting);
  const showMonitor = useGenerateStore((s) => s.showMonitor);
  const monitorOpen = useGenerateStore((s) => s.monitorOpen);
  const setMonitorOpen = useGenerateStore((s) => s.setMonitorOpen);
  const runGeneration = useGenerateStore((s) => s.runGeneration);
  const activeTaskId = useGenerateStore((s) => s.activeTaskId);
  const pollingStatus = useGenerateStore((s) => s.pollingStatus);
  const loadLatestTask = useGenerateStore((s) => s.loadLatestTask);
  const [hasMounted, setHasMounted] = useState(false);

  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [videoFile]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [imageFile]);

  useEffect(() => { loadLatestTask(); setHasMounted(true); }, [loadLatestTask]);

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: { 
      prompt: "", 
      character_orientation: "video", 
      cfg_scale: 0.5, 
      model: "std", 
      engine: "kling",
      resolution: "720p",
      duration: 5,
      negative_prompt: "",
      style: ""
    },
  });

  useEffect(() => {
    if (pollingStatus === "polling" || pollingStatus === "completed") {
      setTimeout(() => { resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
    }
  }, [pollingStatus]);

  // Debug & User Feedback: Toast form errors if validation fails
  const errors = form.formState.errors;
  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const fieldName = errorKeys[0];
      const firstError = errors[fieldName as keyof typeof errors];
      if (firstError?.message) {
        toast.error(`Form Error (${fieldName}): ${firstError.message}`);
      }
    }
  }, [errors]);

  const isGenerating = isSubmitting || pollingStatus === "polling";
  const isBlocked = !!activeTaskId && pollingStatus !== "completed" && pollingStatus !== "failed";

  async function onSubmit(values: z.infer<typeof generateSchema>) {
    console.log("Submit Clicked", values);
    toast.info("Starting process...");

    if (values.engine === "kling") {
      if (!videoFile || !imageFile) { 
        toast.error("Both a reference video AND a character image are required for Kling."); 
        return; 
      }
    } else {
      if (!imageFile) { 
        toast.error("A source image is required for PixVerse."); 
        return; 
      }
    }
    
    if (isBlocked) { 
      toast.error(`System busy: Task ${activeTaskId} is ${pollingStatus}. Please wait.`); 
      return; 
    }
    
    runGeneration(values);
  }

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  return ( <>
    {hasMounted && (
      <>
    <div className="max-w-[1400px] mx-auto min-h-full pb-12">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 h-full">
        
        {/* LEFT SIDEBAR - Inputs */}
        <aside className="w-full md:w-[380px] shrink-0 space-y-6 md:h-[calc(100vh-120px)] md:overflow-y-auto pr-0 md:pr-4 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="mb-8 space-y-4">
                <h1 className="text-2xl font-bold tracking-tight">Generate Video</h1>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-0.5">
                    <div className="w-1 h-3 bg-blue-500/80 rounded-full" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-black">Model System</span>
                  </div>
                  <FormField control={form.control} name="engine" render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full bg-white/5 border-border/40 h-11 text-xs focus:ring-1 focus:ring-blue-500/50 transition-all hover:bg-white/[0.08] shadow-inner">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] text-white/40 font-medium uppercase tracking-tighter">
                              {field.value === "pixverse" ? "PixVerse" : "Kling"}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {field.value === "kling" ? "Motion Control" : field.value === "kling_2_1_pro" ? "Kling 2.1 Pro" : "Image to Video"}
                            </span>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
                        <SelectGroup>
                          <SelectLabel className="text-[9px] uppercase tracking-widest text-white/20 px-3 py-2">Kling AI Engine</SelectLabel>
                          <SelectItem value="kling" className="text-xs py-2.5 cursor-pointer focus:bg-blue-500/10">
                            Motion Control
                          </SelectItem>
                          <SelectItem value="kling_2_1_pro" className="text-xs py-2.5 cursor-pointer focus:bg-blue-500/10">
                            Kling 2.1 Pro
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[9px] uppercase tracking-widest text-white/20 px-3 py-2">PixVerse Engine</SelectLabel>
                          <SelectItem value="pixverse" className="text-xs py-2.5 cursor-pointer focus:bg-purple-500/10">
                            PixVerse V5
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>

              <div className={form.watch("engine") === "kling" ? "grid grid-cols-2 gap-4" : "block"}>
                {form.watch("engine") === "kling" && (
                  <UploadZone 
                    type="video" 
                    file={videoFile} 
                    previewUrl={videoPreviewUrl} 
                    setFile={setVideoFile} 
                    inputRef={videoInputRef} 
                    isGenerating={isGenerating}
                  />
                )}
                <UploadZone 
                  type="image" 
                  file={imageFile} 
                  previewUrl={imagePreviewUrl} 
                  setFile={setImageFile} 
                  inputRef={imageInputRef} 
                  isGenerating={isGenerating}
                />
              </div>

              <div className="space-y-6">
                <FormField control={form.control} name="prompt" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                      Text Prompt {form.watch("engine") === "kling" ? "(Optional)" : <span className="text-red-500">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the motion details..." 
                        className="resize-none h-32 bg-card/50 border-border/50 focus:border-blue-500/50 transition-all text-sm" 
                        maxLength={2500} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Card className="bg-card/20 border-border/40 overflow-hidden backdrop-blur-xl shadow-2xl">
                  <CardHeader className="px-5 py-4 border-b border-border/40 bg-white/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] uppercase tracking-[0.2em] font-black flex items-center gap-2.5 text-white/90">
                      <div className={`w-1.5 h-1.5 rounded-full ${form.watch("engine") === "kling" ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"}`} />
                      Configuration
                    </CardTitle>
                    <Settings className="w-3.5 h-3.5 text-white/30" />
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-border/30">
                    {form.watch("engine") === "kling" ? (
                      <>
                        <div className="grid grid-cols-2 divide-x divide-border/30">
                          <FormField control={form.control} name="model" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <div className="flex flex-col gap-1.5">
                                <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                  <Sparkles className="w-3 h-3 text-blue-400/70" />
                                  Model
                                </FormLabel>
                                <div className="h-5 flex items-center">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20 w-fit">
                                    {field.value === "pro" ? "PREMIUM" : "STANDARD"}
                                  </span>
                                </div>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-blue-500/30 transition-all focus:ring-1 focus:ring-blue-500/50">
                                    <SelectValue placeholder="Model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                  <SelectItem value="std" className="text-xs">STD</SelectItem>
                                  <SelectItem value="pro" className="text-xs">PRO</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="character_orientation" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <div className="flex flex-col gap-1.5">
                                <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                  <VideoIcon className="w-3 h-3 text-amber-400/70" />
                                  Constraint
                                </FormLabel>
                                <div className="h-5 flex items-center">
                                  <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20 w-fit">
                                    {field.value === "video" ? "30s MAX" : "10s MAX"}
                                  </span>
                                </div>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-amber-500/30 transition-all focus:ring-1 focus:ring-amber-500/50">
                                    <SelectValue placeholder="Constraint" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                  <SelectItem value="video" className="text-xs">Video</SelectItem>
                                  <SelectItem value="image" className="text-xs">Image</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="cfg_scale" render={({ field }) => (
                          <FormItem className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <Terminal className="w-3 h-3 text-green-400/70" />
                                Guidance Scale
                              </FormLabel>
                              <span className="text-[11px] font-mono font-bold text-green-400">{field.value?.toFixed(1)}</span>
                            </div>
                            <FormControl>
                              <div className="px-1 py-1">
                                <Input 
                                  type="range" 
                                  step="0.1" 
                                  min="0" 
                                  max="1" 
                                  className="h-1.5 w-full bg-white/10 rounded-full appearance-none cursor-pointer accent-green-500 hover:accent-green-400 transition-all" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                />
                                <div className="flex justify-between mt-2 px-0.5">
                                  <span className="text-[8px] text-white/20 font-bold">MIN</span>
                                  <span className="text-[8px] text-white/20 font-bold">MAX</span>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )} />
                      </>
                    ) : form.watch("engine") === "pixverse" ? (
                      <>
                        <div className="grid grid-cols-2 divide-x divide-border/30">
                          <FormField control={form.control} name="resolution" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <ImageIcon className="w-3 h-3 text-purple-400/70" />
                                Resolution
                              </FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-purple-500/30 transition-all focus:ring-1 focus:ring-purple-500/50">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                  <SelectItem value="360p" className="text-xs">360p</SelectItem>
                                  <SelectItem value="540p" className="text-xs">540p</SelectItem>
                                  <SelectItem value="720p" className="text-xs">720p</SelectItem>
                                  <SelectItem value="1080p" className="text-xs">1080p</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="duration" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <Clock className="w-3 h-3 text-amber-400/70" />
                                Duration
                              </FormLabel>
                              <Select onValueChange={(val) => field.onChange(parseInt(val || "5"))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-amber-500/30 transition-all focus:ring-1 focus:ring-amber-500/50">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                  <SelectItem value="5" className="text-xs">5 Seconds</SelectItem>
                                  <SelectItem value="8" className="text-xs">8 Seconds</SelectItem>
                                  <SelectItem value="10" className="text-xs">10 Seconds</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="style" render={({ field }) => (
                          <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                            <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-pink-400/70" />
                              Art Style
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-pink-500/30 transition-all focus:ring-1 focus:ring-pink-500/50">
                                  <SelectValue placeholder="Optional Style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                <SelectItem value="" className="text-xs">Default (Realistic)</SelectItem>
                                <SelectItem value="anime" className="text-xs">Anime</SelectItem>
                                <SelectItem value="3d_animation" className="text-xs">3D Animation</SelectItem>
                                <SelectItem value="clay" className="text-xs">Clay</SelectItem>
                                <SelectItem value="cyberpunk" className="text-xs">Cyberpunk</SelectItem>
                                <SelectItem value="comic" className="text-xs">Comic</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="negative_prompt" render={({ field }) => (
                          <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                            <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                              <XCircle className="w-3 h-3 text-red-400/70" />
                              Negative Prompt
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="What to exclude..." 
                                className="bg-black/20 border-border/40 h-9 text-xs focus:border-red-500/30" 
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )} />
                      </>
                    ) : form.watch("engine") === "kling_2_1_pro" ? (
                      <>
                        <div className="grid grid-cols-1 divide-x divide-border/30">
                          <FormField control={form.control} name="duration" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <Clock className="w-3 h-3 text-amber-400/70" />
                                Duration
                              </FormLabel>
                              <Select onValueChange={(val) => field.onChange(parseInt(val || "5"))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs hover:border-amber-500/30 transition-all focus:ring-1 focus:ring-amber-500/50">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                  <SelectItem value="5" className="text-xs">5 Seconds</SelectItem>
                                  <SelectItem value="10" className="text-xs">10 Seconds</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="cfg_scale" render={({ field }) => (
                          <FormItem className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors border-t border-border/30">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <Terminal className="w-3 h-3 text-green-400/70" />
                                Guidance Scale
                              </FormLabel>
                              <span className="text-[11px] font-mono font-bold text-green-400">{field.value?.toFixed(1)}</span>
                            </div>
                            <FormControl>
                              <div className="px-1 py-1">
                                <Input 
                                  type="range" 
                                  step="0.1" 
                                  min="0" 
                                  max="1" 
                                  className="h-1.5 w-full bg-white/10 rounded-full appearance-none cursor-pointer accent-green-500 hover:accent-green-400 transition-all" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                                />
                                <div className="flex justify-between mt-2 px-0.5">
                                  <span className="text-[8px] text-white/20 font-bold">MIN</span>
                                  <span className="text-[8px] text-white/20 font-bold">MAX</span>
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="negative_prompt" render={({ field }) => (
                          <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors border-t border-border/30">
                            <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                              <XCircle className="w-3 h-3 text-red-400/70" />
                              Negative Prompt
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="What to exclude..." 
                                className="bg-black/20 border-border/40 h-9 text-xs focus:border-red-500/30" 
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )} />
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <div className="pt-4 pb-4 md:static md:p-0">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="bg-blue-600 text-white hover:bg-blue-500 font-bold px-8 w-full gap-2 relative overflow-hidden group shadow-xl shadow-blue-500/10 h-12" 
                  disabled={isGenerating || isBlocked}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> UPLOADING...</>
                  ) : isBlocked ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> SYSTEM BUSY ({pollingStatus})</>
                  ) : (
                    <><Sparkles className="h-5 w-5" /> START GENERATE</>
                  )}
                </Button>
                {isBlocked && !isSubmitting && <p className="text-[10px] text-center text-muted-foreground mt-2 animate-pulse">Processing on server. Please wait...</p>}
              </div>
            </form>
          </Form>
        </aside>

        {/* MAIN AREA - Monitor & Results */}
        <main className="flex-1 min-w-0 space-y-8">
          <div className="space-y-8">
            {showMonitor && <ProcessMonitor steps={steps} logs={logs} isOpen={monitorOpen} onToggle={() => setMonitorOpen(!monitorOpen)} isRunning={isSubmitting} />}
            <div ref={resultSectionRef}><ResultSection /></div>
            <GallerySection />
          </div>
          
          {/* Mobile Spacer to ensure content isn't covered by bottom nav */}
          <div className="h-32 md:hidden" />
        </main>
      </div>
      </div>
      </>
      )}
    </> );
}
