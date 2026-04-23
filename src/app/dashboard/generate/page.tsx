"use client";

import { useRef, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  UploadCloud, Image as ImageIcon, Video as VideoIcon, Loader2,
  CheckCircle2, X, Terminal, ChevronUp, ChevronDown,
  Circle, XCircle, Sparkles, Download, Play, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerateStore, type PipelineStep, type LogEntry } from "@/store/useGenerateStore";

// ─── Process Monitor Component ───────────────────────────────────────
function ProcessMonitor({
  steps,
  logs,
  isOpen,
  onToggle,
  isRunning,
}: {
  steps: PipelineStep[];
  logs: LogEntry[];
  isOpen: boolean;
  onToggle: () => void;
  isRunning: boolean;
}) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const completedSteps = steps.filter((s) => s.status === "success").length;
  const hasError = steps.some((s) => s.status === "error");
  const totalSteps = steps.length;

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
      {/* Header / Toggle bar */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            {isRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {isRunning
              ? "Processing..."
              : hasError
              ? "Process Failed"
              : completedSteps === totalSteps && completedSteps > 0
              ? "Process Complete"
              : "Process Pipeline"}
          </span>
          {(isRunning || completedSteps > 0) && (
            <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
              {completedSteps}/{totalSteps}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Progress bar */}
      {(isRunning || completedSteps > 0) && (
        <div className="h-0.5 bg-white/5">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              hasError ? "bg-red-500" : "bg-green-500"
            }`}
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-border/30">
          {/* Steps pipeline visualization */}
          <div className="px-4 py-3 space-y-1">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3 py-1.5">
                <div className="shrink-0 w-5 flex justify-center">
                  {step.status === "running" ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : step.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : step.status === "error" ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-white/15" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-xs font-medium ${
                      step.status === "running"
                        ? "text-blue-300"
                        : step.status === "success"
                        ? "text-green-300/80"
                        : step.status === "error"
                        ? "text-red-300"
                        : "text-white/30"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.detail && (
                    <span
                      className={`text-[10px] ml-2 ${
                        step.status === "error"
                          ? "text-red-400/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      — {step.detail}
                    </span>
                  )}
                </div>
                {step.timestamp && (
                  <span className="text-[10px] text-white/20 font-mono shrink-0">
                    {step.timestamp}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Terminal Log */}
          {logs.length > 0 && (
            <div className="border-t border-border/20 bg-black/30">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-border/10">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500/50" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <span className="w-2 h-2 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[10px] text-white/30 font-mono">output</span>
              </div>
              <div className="max-h-40 overflow-y-auto px-3 py-2 space-y-0.5 font-mono">
                {logs.map((log, i) => (
                  <div key={i} className="text-[11px] leading-relaxed flex gap-2">
                    <span className="text-white/20 shrink-0">{log.time}</span>
                    <span
                      className={
                        log.level === "success"
                          ? "text-green-400"
                          : log.level === "error"
                          ? "text-red-400"
                          : log.level === "warn"
                          ? "text-amber-400"
                          : "text-white/50"
                      }
                    >
                      {log.message}
                    </span>
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

// ─── Result Section Component ─────────────────────────────────────────
function ResultSection() {
  const pollingStatus = useGenerateStore((s) => s.pollingStatus);
  const resultVideoUrl = useGenerateStore((s) => s.resultVideoUrl);
  const activeTaskId = useGenerateStore((s) => s.activeTaskId);
  const clearResult = useGenerateStore((s) => s.clearResult);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (pollingStatus === "idle" && !activeTaskId) return null;

  return (
    <div className="space-y-4">
      <div className="h-px bg-border/30" />

      {/* Polling / Loading state */}
      {pollingStatus === "polling" && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 backdrop-blur-sm p-6 md:p-8">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            {/* Animated spinner */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-blue-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-5 h-5 text-blue-400 ml-0.5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Generating your video...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This usually takes 1–3 minutes. Please wait.
              </p>
            </div>
            {/* Pulsing dots */}
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}

      {/* Completed / Video result */}
      {pollingStatus === "completed" && resultVideoUrl && (
        <div className="rounded-xl border border-green-500/20 bg-card/30 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-300">
              Video Generated Successfully!
            </span>
          </div>

          {/* Video Player */}
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={resultVideoUrl}
              className="w-full max-h-[70vh] object-contain cursor-pointer"
              controls
              autoPlay
              loop
              playsInline
              muted
              onClick={() => {
                // Toggle fullscreen on click
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen().catch(() => {});
                  }
                }
              }}
            />
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex flex-col sm:flex-row gap-3 border-t border-border/30">
            <a
              href={resultVideoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                type="button"
                size="lg"
                className="w-full bg-white text-black hover:bg-white/90 font-medium gap-2"
              >
                <Download className="w-4 h-4" />
                Download Video
              </Button>
            </a>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="flex-1 border-border/50 bg-transparent hover:bg-white/5 gap-2"
              onClick={clearResult}
            >
              <RefreshCw className="w-4 h-4" />
              Generate New
            </Button>
          </div>

          <div className="px-4 pb-3">
            <p className="text-[10px] text-muted-foreground text-center">
              Tip: Click the video to go fullscreen. Download before auto-deletion.
            </p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {pollingStatus === "failed" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm p-6 md:p-8">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <XCircle className="w-12 h-12 text-red-400" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Video generation failed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Something went wrong on the Freepik side. Please try again.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-border/50 bg-transparent hover:bg-white/5 gap-2"
              onClick={clearResult}
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
const generateSchema = z.object({
  prompt: z.string().max(2500, "Prompt cannot exceed 2500 characters").optional(),
  character_orientation: z.enum(["video", "image"]),
  cfg_scale: z.number().min(0).max(1),
});

export default function GenerateVideoPage() {
  // All state from global store (survives navigation!)
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

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  // Preview URLs (derived from store files)
  const videoPreviewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      prompt: "",
      character_orientation: "video",
      cfg_scale: 0.5,
    },
  });

  // Auto-scroll to result section when generation starts or completes
  useEffect(() => {
    if (pollingStatus === "polling" || pollingStatus === "completed") {
      // Small delay so the DOM renders first
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [pollingStatus]);

  // Also scroll when submitting starts
  useEffect(() => {
    if (isSubmitting) {
      setTimeout(() => {
        resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [isSubmitting]);

  const hasActiveTask = !!activeTaskId;
  const isGenerating = isSubmitting || pollingStatus === "polling";

  async function onSubmit(values: z.infer<typeof generateSchema>) {
    if (!videoFile || !imageFile) {
      toast.error("Both a reference video AND a character image are required.");
      return;
    }

    if (hasActiveTask) {
      toast.error("Please wait for the current generation to finish before starting a new one.");
      return;
    }

    runGeneration(values);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          Generate Motion Control Video
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Model: Kling v2.6 Motion Control std
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {/* Video Upload */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium leading-none flex items-center gap-1.5">
                <VideoIcon className="w-3.5 h-3.5" /> <span className="hidden md:inline">Reference</span> Video
                <span className="text-red-500">*</span>
              </label>

              <input
                ref={videoInputRef}
                type="file"
                accept=".mp4,.mov,.webm,.m4v"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
                }}
              />

              {videoFile && videoPreviewUrl ? (
                <div className="relative rounded-lg md:rounded-xl overflow-hidden border border-border/50 bg-black group">
                  <video
                    src={videoPreviewUrl}
                    className="w-full aspect-[4/3] object-cover"
                    controls
                    muted
                    playsInline
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-400 shrink-0" />
                      <span className="text-[10px] md:text-xs text-white/80 truncate">
                        {videoFile.name}
                      </span>
                    </div>
                    {!isGenerating && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoFile(null);
                        }}
                        className="p-0.5 md:p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed border-border/50 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all bg-card/20 aspect-[4/3] ${
                    isGenerating ? "opacity-50 pointer-events-none" : ""
                  }`}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <UploadCloud className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
                  <p className="font-medium text-xs md:text-sm text-foreground">
                    Upload video <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    MP4, MOV, WEBM
                  </p>
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium leading-none flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> <span className="hidden md:inline">Character</span> Image
                <span className="text-red-500">*</span>
              </label>

              <input
                ref={imageInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                }}
              />

              {imageFile && imagePreviewUrl ? (
                <div className="relative rounded-lg md:rounded-xl overflow-hidden border border-border/50 bg-black/50 group">
                  <img
                    src={imagePreviewUrl}
                    alt="Character preview"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 md:p-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-400 shrink-0" />
                      <span className="text-[10px] md:text-xs text-white/80 truncate">
                        {imageFile.name}
                      </span>
                    </div>
                    {!isGenerating && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageFile(null);
                        }}
                        className="p-0.5 md:p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed border-border/50 rounded-lg md:rounded-xl p-4 md:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all bg-card/20 aspect-[4/3] ${
                    isGenerating ? "opacity-50 pointer-events-none" : ""
                  }`}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <UploadCloud className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-2" />
                  <p className="font-medium text-xs md:text-sm text-foreground">
                    Upload image <span className="text-red-500">*</span>
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    PNG, JPG, WEBP
                  </p>
                </div>
              )}
            </div>
          </div>

          <Card className="bg-card/30 border-border/50">
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">
                Generation Parameters
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Configure how your video will be generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-4 md:px-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what you want to see in the video..."
                        className="resize-none h-24 bg-background/50"
                        maxLength={2500}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Optional text prompt to guide the motion transfer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="character_orientation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character Orientation</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select orientation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">Video (Max 30s)</SelectItem>
                          <SelectItem value="image">Image (Max 10s)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        How the model interprets spatial information.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cfg_scale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFG Scale</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          className="bg-background/50"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        0 to 1. Controls how closely the model follows the prompt.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ═══ Submit Button ═══ */}
          <div className="flex flex-col items-stretch gap-3">
            <Button
              type="submit"
              size="lg"
              className="bg-white text-black hover:bg-white/90 font-medium px-8 w-full gap-2 relative overflow-hidden group"
              disabled={isGenerating || hasActiveTask}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : hasActiveTask ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for result...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>

            {hasActiveTask && !isSubmitting && (
              <p className="text-xs text-center text-muted-foreground">
                You can only run 1 generation at a time. Please wait for it to finish.
              </p>
            )}
          </div>
        </form>
      </Form>

      {/* ═══ Process Monitor (below generate button, minimized by default) ═══ */}
      {showMonitor && (
        <ProcessMonitor
          steps={steps}
          logs={logs}
          isOpen={monitorOpen}
          onToggle={() => setMonitorOpen(!monitorOpen)}
          isRunning={isSubmitting}
        />
      )}

      {/* ═══ Result Section (below everything) ═══ */}
      <div ref={resultSectionRef}>
        <ResultSection />
      </div>
    </div>
  );
}
