"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UploadCloud, Image as ImageIcon, Video as VideoIcon, Loader2,
  CheckCircle2, X, Terminal, ChevronUp, ChevronDown,
  Circle, XCircle, Sparkles, Download, Play, RefreshCw, Settings, Clock,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateStore, MAX_CONCURRENT_TASKS, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES, type PipelineStep, type LogEntry } from "@/store/useGenerateStore";
import LoadingOverlay from "@/components/LoadingOverlay";

// Smart client-side download to save server bandwidth
const handleSmartDownload = async (url: string, defaultFilename: string, e: React.MouseEvent) => {
  e.preventDefault();
  const toastId = toast.loading("Downloading video directly...");
  try {
    // Attempt client-side fetch to bypass server proxy (saves Vercel bandwidth)
    const res = await fetch(url);
    if (!res.ok) throw new Error("CORS or Network issue");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
    toast.success("Download complete!", { id: toastId });
  } catch (error) {
    toast.dismiss(toastId);
    // Fallback: Open in new tab so user can right-click -> Save Video As
    window.open(url, "_blank");
  }
};

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
            <Button type="button" size="lg" className="flex-1 bg-white text-black hover:bg-white/90 font-bold gap-2 text-sm shadow-lg shadow-white/5" onClick={(e) => handleSmartDownload(resultVideoUrl, `universeai-${activeTaskId?.slice(0, 8)}.mp4`, e)}>
              <Download className="w-4 h-4" /> Download Video
            </Button>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 hover:text-white" onClick={(e) => handleSmartDownload(t.resultUrl, `universeai-${t.id.slice(0, 8)}.mp4`, e)}>
                <Download className="w-4 h-4" />
              </Button>
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

// ─── Active Tasks List — menampilkan semua task yang sedang diproses ──
function ActiveTasksList() {
  const tasks = useGenerateStore((s) => s.tasks);
  const focusedTaskId = useGenerateStore((s) => s.focusedTaskId);
  const focusTask = useGenerateStore((s) => s.focusTask);
  const dismissTask = useGenerateStore((s) => s.dismissTask);

  // Tick setiap detik untuk update "elapsed" di UI tanpa memanggil Date.now()
  // selama render (yang tidak pure).
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const list = useMemo(
    () => Object.values(tasks).sort((a, b) => b.startedAt - a.startedAt),
    [tasks],
  );

  if (list.length === 0) return null;

  const fmtElapsed = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}m ${r}s` : `${r}s`;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">Proses Berjalan</span>
          <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
            {list.filter((t) => t.status === "polling").length}/{MAX_CONCURRENT_TASKS}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border/20">
        {list.map((t) => {
          const isFocused = t.taskId === focusedTaskId;
          const elapsed = nowMs - t.startedAt;
          return (
            <div
              key={t.taskId}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isFocused ? "bg-blue-500/5" : "hover:bg-white/[0.03]"}`}
              onClick={() => focusTask(t.taskId)}
            >
              <div className="shrink-0">
                {t.status === "polling" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {t.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {t.status === "failed" && <XCircle className="w-4 h-4 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-foreground truncate">{t.taskId.slice(0, 12)}...</span>
                  {t.engine && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                      {t.engine}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {t.status === "polling" ? `Running · ${fmtElapsed(elapsed)}` : t.status === "completed" ? "Selesai" : "Gagal"}
                </span>
              </div>
              {t.status !== "polling" && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); dismissTask(t.taskId); }}
                  className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
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
  paygModel: z.string().optional(),
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

// Batas durasi video referensi (detik). Freepik Kling motion-control mendukung
// durasi hingga 30 detik, video lebih panjang akan langsung ditolak.
const MAX_VIDEO_DURATION_SEC = 30;

/** Baca durasi video di sisi browser via metadata HTMLVideoElement. */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.muted = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const d = video.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("Tidak dapat membaca durasi video"));
      } else {
        resolve(d);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Gagal memuat metadata video"));
    };
    // Timeout 10 detik — file rusak atau codec tidak didukung browser.
    setTimeout(() => {
      cleanup();
      reject(new Error("Timeout membaca durasi video"));
    }, 10000);
  });
}

function UploadZone({ type, file, previewUrl, setFile, inputRef, isGenerating }: UploadZoneProps) {
  const isVideo = type === "video";
  const accept = isVideo ? ".mp4,.mov,.webm,.m4v" : ".png,.jpg,.jpeg,.webp";
  const label = isVideo ? "Video" : "Image";
  const formats = isVideo ? "MP4, MOV, WEBM" : "PNG, JPG, WEBP";
  const Icon = isVideo ? VideoIcon : ImageIcon;

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    // Reset segera agar user bisa pilih file yang sama lagi setelah gagal.
    const resetInput = () => { e.target.value = ""; };
    if (!picked) return;

    // 1. Cek ukuran.
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File ${label.toLowerCase()} terlalu besar (${(picked.size / 1048576).toFixed(1)} MB). Maksimum ${MAX_FILE_SIZE_MB} MB.`);
      resetInput();
      return;
    }

    // 2. Cek durasi (hanya untuk video).
    if (isVideo) {
      const probeToastId = toast.loading("Memeriksa durasi video...");
      try {
        const duration = await getVideoDuration(picked);
        toast.dismiss(probeToastId);
        if (duration > MAX_VIDEO_DURATION_SEC) {
          toast.error(`Durasi video ${duration.toFixed(1)}s melebihi batas. Maksimum ${MAX_VIDEO_DURATION_SEC} detik.`);
          resetInput();
          return;
        }
      } catch (err: any) {
        toast.dismiss(probeToastId);
        toast.error(`Tidak dapat memvalidasi durasi video: ${err.message || "unknown error"}`);
        resetInput();
        return;
      }
    }

    setFile(picked);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium leading-none flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {isVideo ? "Ref" : "Char"} {label} <span className="text-red-500">*</span>
      </label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handlePick} />
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
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">
            Max {MAX_FILE_SIZE_MB} MB{isVideo ? ` · ${MAX_VIDEO_DURATION_SEC}s` : ""}
          </p>
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
  const pollingStatus = useGenerateStore((s) => s.pollingStatus);
  const loadLatestTask = useGenerateStore((s) => s.loadLatestTask);
  const [hasMounted, setHasMounted] = useState(false);

  // PAYG state
  const [userProfile, setUserProfile] = useState<{ accountType: string; balance: number } | null>(null);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [selectedPaygModel, setSelectedPaygModel] = useState<string>('kling_std');
  const [grokDuration, setGrokDuration] = useState<number>(6);

  const isPayg = userProfile?.accountType === 'payg';
  const currentCost = isPayg ? (pricing[`price_${selectedPaygModel}`] || 0) : 0;
  const balanceInsufficient = isPayg && userProfile && userProfile.balance < currentCost;

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

  // Fetch user profile and pricing for PAYG
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUserProfile({ accountType: data.accountType, balance: data.balance });
        }
      } catch (_e) { /* ignore */ }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!isPayg) return;
    async function fetchPricing() {
      try {
        const res = await fetch('/api/pricing');
        if (res.ok) {
          const data = await res.json();
          setPricing(data.pricing || {});
        }
      } catch (_e) { /* ignore */ }
    }
    fetchPricing();
  }, [isPayg]);

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
      style: "",
      paygModel: "kling_std",
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

  // Upload zone hanya perlu di-disable saat benar-benar sedang submit file
  // (upload/verify/create task). Saat ada task lain yang sedang "polling",
  // user HARUS tetap bisa upload file untuk task baru selama slot tersedia.
  const isGenerating = isSubmitting;
  // Hitung jumlah task yang sedang diproses (polling) untuk UI slot counter.
  const tasksMap = useGenerateStore((s) => s.tasks);
  const activeCount = useMemo(
    () => Object.values(tasksMap).filter((t) => t.status === "polling").length,
    [tasksMap],
  );
  const slotsFull = activeCount >= MAX_CONCURRENT_TASKS;

  async function onSubmit(values: z.infer<typeof generateSchema>) {
    console.log("Submit Clicked", values);

    if (isPayg) {
      // PAYG: validate based on selected paygModel
      const needsVideo = selectedPaygModel === 'kling_std' || selectedPaygModel === 'kling_pro';
      if (needsVideo && (!videoFile || !imageFile)) {
        toast.error("Both a reference video AND a character image are required for Kling.");
        return;
      }
      if (!needsVideo && !imageFile) {
        toast.error("A source image is required.");
        return;
      }
      if (balanceInsufficient) {
        toast.error("Saldo tidak cukup untuk model ini.");
        return;
      }
      // Override engine for PAYG based on paygModel
      const engineMap: Record<string, "kling" | "pixverse" | "kling_2_1_pro"> = {
        kling_std: "kling",
        kling_pro: "kling",
        veo_720: "kling", // engine field doesn't matter for PAYG, server uses paygModel
        veo_1080: "kling",
        grok_720: "kling",
      };
      values.engine = engineMap[selectedPaygModel] || "kling";
      values.paygModel = selectedPaygModel;
      if (selectedPaygModel === 'kling_pro') values.model = 'pro';
      else if (selectedPaygModel === 'kling_std') values.model = 'std';
      if (selectedPaygModel === 'grok_720') values.duration = grokDuration;
    } else {
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
    }

    if (slotsFull) {
      toast.error(`Slot penuh: ${activeCount}/${MAX_CONCURRENT_TASKS} proses sedang berjalan. Tunggu salah satu selesai.`);
      return;
    }

    toast.info(`Memulai proses (${activeCount + 1}/${MAX_CONCURRENT_TASKS})...`);
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
                
                {/* PAYG Balance Info */}
                {isPayg && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-blue-300 font-medium">
                        Saldo: Rp {(userProfile?.balance ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {currentCost > 0 && (
                      <span className={`text-xs font-mono font-bold ${balanceInsufficient ? 'text-red-400' : 'text-green-400'}`}>
                        Biaya: Rp {currentCost.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-0.5">
                    <div className="w-1 h-3 bg-blue-500/80 rounded-full" />
                    <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-black">Model System</span>
                  </div>

                  {isPayg ? (
                    /* PAYG Engine Selector — model STD/PRO ada di Configuration card */
                    <Select
                      value={selectedPaygModel.startsWith('kling') ? 'kling' : selectedPaygModel.startsWith('veo') ? 'veo' : 'grok'}
                      onValueChange={(val) => {
                        if (!val) return;
                        if (val === 'kling') setSelectedPaygModel('kling_std');
                        else if (val === 'veo') setSelectedPaygModel('veo_720');
                        else setSelectedPaygModel('grok_720');
                      }}
                    >
                      <SelectTrigger className="w-full bg-white/5 border-border/40 h-11 text-xs focus:ring-1 focus:ring-blue-500/50 transition-all hover:bg-white/[0.08] shadow-inner">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[10px] text-white/40 font-medium uppercase tracking-tighter">PAYG</span>
                            <span className="text-xs font-bold text-foreground">
                              {selectedPaygModel.startsWith('kling') ? 'Motion Control' : selectedPaygModel.startsWith('veo') ? 'Veo 3.1 Fast' : 'Grok AI'}
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
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[9px] uppercase tracking-widest text-white/20 px-3 py-2">Google Veo</SelectLabel>
                          <SelectItem value="veo" className="text-xs py-2.5 cursor-pointer focus:bg-blue-500/10">
                            Veo 3.1 Fast
                          </SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-[9px] uppercase tracking-widest text-white/20 px-3 py-2">xAI</SelectLabel>
                          <SelectItem value="grok" className="text-xs py-2.5 cursor-pointer focus:bg-green-500/10">
                            Grok AI
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  ) : (
                    /* BYOK Engine Selector */
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
                  )}
                </div>
              </div>

              <div className={(isPayg ? (selectedPaygModel === 'kling_std' || selectedPaygModel === 'kling_pro') : form.watch("engine") === "kling") ? "grid grid-cols-2 gap-4" : "block"}>
                {(isPayg ? (selectedPaygModel === 'kling_std' || selectedPaygModel === 'kling_pro') : form.watch("engine") === "kling") && (
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
                      Text Prompt {(isPayg ? (selectedPaygModel === 'kling_std' || selectedPaygModel === 'kling_pro') : form.watch("engine") === "kling") ? "(Optional)" : <span className="text-red-500">*</span>}
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

                {/* Configuration Card — show for BYOK always, or PAYG with config options */}
                {(!isPayg || selectedPaygModel.startsWith('kling') || selectedPaygModel.startsWith('veo') || selectedPaygModel === 'grok_720') && (
                <Card className="bg-card/20 border-border/40 overflow-hidden backdrop-blur-xl shadow-2xl">
                  <CardHeader className="px-5 py-4 border-b border-border/40 bg-white/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-[11px] uppercase tracking-[0.2em] font-black flex items-center gap-2.5 text-white/90">
                      <div className={`w-1.5 h-1.5 rounded-full ${form.watch("engine") === "kling" ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"}`} />
                      Configuration
                    </CardTitle>
                    <Settings className="w-3.5 h-3.5 text-white/30" />
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-border/30">
                    {/* PAYG Kling: STD/PRO selector */}
                    {isPayg && selectedPaygModel.startsWith('kling') && (
                      <>
                        <div className="grid grid-cols-2 divide-x divide-border/30">
                          <div className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-blue-400/70" />
                                Model
                              </span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono border border-blue-500/20 w-fit">
                                {selectedPaygModel === 'kling_pro' ? 'PREMIUM' : 'STANDARD'}
                              </span>
                            </div>
                            <Select value={selectedPaygModel === 'kling_pro' ? 'pro' : 'std'} onValueChange={(val) => {
                              setSelectedPaygModel(val === 'pro' ? 'kling_pro' : 'kling_std');
                              form.setValue('paygModel', val === 'pro' ? 'kling_pro' : 'kling_std');
                            }}>
                              <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                                <SelectItem value="std" className="text-xs">STD {pricing.price_kling_std ? `(Rp ${pricing.price_kling_std.toLocaleString('id-ID')})` : ''}</SelectItem>
                                <SelectItem value="pro" className="text-xs">PRO {pricing.price_kling_pro ? `(Rp ${pricing.price_kling_pro.toLocaleString('id-ID')})` : ''}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormField control={form.control} name="character_orientation" render={({ field }) => (
                            <FormItem className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors h-full">
                              <div className="flex flex-col gap-1.5">
                                <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                                  <VideoIcon className="w-3 h-3 text-amber-400/70" />
                                  Constraint
                                </FormLabel>
                                <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20 w-fit">
                                  {field.value === "video" ? "30s MAX" : "10s MAX"}
                                </span>
                              </div>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs"><SelectValue /></SelectTrigger></FormControl>
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
                                <Input type="range" step="0.1" min="0" max="1" className="h-1.5 w-full bg-white/10 rounded-full appearance-none cursor-pointer accent-green-500" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                <div className="flex justify-between mt-2 px-0.5"><span className="text-[8px] text-white/20 font-bold">MIN</span><span className="text-[8px] text-white/20 font-bold">MAX</span></div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )} />
                      </>
                    )}
                    {/* PAYG Veo: Resolution selector */}
                    {isPayg && selectedPaygModel.startsWith('veo') && (
                      <div className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                          <ImageIcon className="w-3 h-3 text-blue-400/70" />
                          Resolution
                        </span>
                        <Select value={selectedPaygModel === 'veo_1080' ? '1080' : '720'} onValueChange={(val) => {
                          const m = val === '1080' ? 'veo_1080' : 'veo_720';
                          setSelectedPaygModel(m);
                          form.setValue('paygModel', m);
                        }}>
                          <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                            <SelectItem value="720" className="text-xs">720p {pricing.price_veo_720 ? `(Rp ${pricing.price_veo_720.toLocaleString('id-ID')})` : ''}</SelectItem>
                            <SelectItem value="1080" className="text-xs">1080p {pricing.price_veo_1080 ? `(Rp ${pricing.price_veo_1080.toLocaleString('id-ID')})` : ''}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* PAYG Grok: Duration selector */}
                    {isPayg && selectedPaygModel === 'grok_720' && (
                      <div className="p-4 space-y-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2">
                            <Clock className="w-3 h-3 text-green-400/70" />
                            Duration
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 font-mono border border-green-500/20">720p</span>
                        </div>
                        <Select value={String(grokDuration)} onValueChange={(val) => { if (val) setGrokDuration(parseInt(val)); }}>
                          <SelectTrigger className="bg-black/20 border-border/40 h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40">
                            <SelectItem value="6" className="text-xs">6 Seconds</SelectItem>
                            <SelectItem value="10" className="text-xs">10 Seconds</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* BYOK Configuration */}
                    {!isPayg && form.watch("engine") === "kling" ? (
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
                )}
              </div>

              <div className="pt-4 pb-4 md:static md:p-0 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Slot Proses</span>
                  <span className={`text-[10px] font-mono font-bold ${slotsFull ? "text-red-400" : activeCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {activeCount}/{MAX_CONCURRENT_TASKS}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${slotsFull ? "bg-red-500" : activeCount > 0 ? "bg-amber-500" : "bg-white/10"}`}
                    style={{ width: `${(activeCount / MAX_CONCURRENT_TASKS) * 100}%` }}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-blue-600 text-white hover:bg-blue-500 font-bold px-8 w-full gap-2 relative overflow-hidden group shadow-xl shadow-blue-500/10 h-12"
                  disabled={isSubmitting || slotsFull || !!balanceInsufficient}
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> UPLOADING...</>
                  ) : balanceInsufficient ? (
                    <><Wallet className="h-5 w-5" /> SALDO TIDAK CUKUP</>
                  ) : slotsFull ? (
                    <><Clock className="h-5 w-5" /> SLOT PENUH ({activeCount}/{MAX_CONCURRENT_TASKS})</>
                  ) : (
                    <><Sparkles className="h-5 w-5" /> START GENERATE{activeCount > 0 ? ` (+${activeCount} BERJALAN)` : ""}</>
                  )}
                </Button>
                {slotsFull && (
                  <p className="text-[10px] text-center text-muted-foreground mt-1 animate-pulse">
                    Menunggu salah satu proses selesai untuk memulai yang baru.
                  </p>
                )}
                {!slotsFull && activeCount > 0 && (
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    Kamu masih bisa memulai {MAX_CONCURRENT_TASKS - activeCount} proses lagi secara paralel.
                  </p>
                )}
              </div>
            </form>
          </Form>
        </aside>

        {/* MAIN AREA - Monitor & Results */}
        <main className="flex-1 min-w-0 space-y-8">
          <div className="space-y-8">
            {showMonitor && !isPayg && <ProcessMonitor steps={steps} logs={logs} isOpen={monitorOpen} onToggle={() => setMonitorOpen(!monitorOpen)} isRunning={isSubmitting} />}
            <ActiveTasksList />
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
