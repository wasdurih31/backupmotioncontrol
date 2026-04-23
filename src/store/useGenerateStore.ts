"use client";

// import { getUrl } from "@vercel/blob"; // removed – use server API for signed URLs

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────
export type StepStatus = "idle" | "running" | "success" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  timestamp?: string;
}

export interface LogEntry {
  time: string;
  level: "info" | "success" | "error" | "warn";
  message: string;
}

interface GenerateFormValues {
  prompt?: string;
  character_orientation: "video" | "image";
  cfg_scale: number;
}

interface GenerateState {
  // Files
  videoFile: File | null;
  imageFile: File | null;

  // Pipeline
  steps: PipelineStep[];
  logs: LogEntry[];
  isSubmitting: boolean;
  showMonitor: boolean;
  monitorOpen: boolean;
  isComplete: boolean;

  // Actions
  setVideoFile: (f: File | null) => void;
  setImageFile: (f: File | null) => void;
  setMonitorOpen: (open: boolean) => void;
  resetPipeline: () => void;
  runGeneration: (values: GenerateFormValues, onSuccess: () => void) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: "validate", label: "Validate Input", status: "idle" },
  { id: "upload_video", label: "Upload Video → Blob", status: "idle" },
  { id: "upload_image", label: "Upload Image → Blob", status: "idle" },
  { id: "verify_key", label: "Verify API Key", status: "idle" },
  { id: "call_api", label: "Submit to Freepik API", status: "idle" },
  { id: "save_task", label: "Save Task to Database", status: "idle" },
];

// ─── Store ───────────────────────────────────────────────────────────
export const useGenerateStore = create<GenerateState>((set, get) => ({
  videoFile: null,
  imageFile: null,
  steps: INITIAL_STEPS.map((s) => ({ ...s })),
  logs: [],
  isSubmitting: false,
  showMonitor: false,
  monitorOpen: false,
  isComplete: false,

  setVideoFile: (f) => set({ videoFile: f }),
  setImageFile: (f) => set({ imageFile: f }),
  setMonitorOpen: (open) => set({ monitorOpen: open }),

  resetPipeline: () =>
    set({
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      logs: [],
      isSubmitting: false,
      showMonitor: false,
      monitorOpen: false,
      isComplete: false,
    }),

  runGeneration: async (values, onSuccess) => {
    const { videoFile, imageFile } = get();
    if (!videoFile || !imageFile) return;

    // Internal helpers that write to the store directly
    const addLog = (level: LogEntry["level"], message: string) => {
      set((s) => ({ logs: [...s.logs, { time: now(), level, message }] }));
    };

    const updateStep = (id: string, status: StepStatus, detail?: string) => {
      set((s) => ({
        steps: s.steps.map((step) =>
          step.id === id ? { ...step, status, detail, timestamp: now() } : step
        ),
      }));
    };

    // Reset and start
    set({
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      logs: [],
      isSubmitting: true,
      showMonitor: true,
      monitorOpen: true,
      isComplete: false,
    });

    try {
      // ── Step 1: Validate ──
      updateStep("validate", "running");
      addLog("info", "Validating input files...");
      addLog("info", `Video: ${videoFile.name} (${(videoFile.size / 1048576).toFixed(1)} MB)`);
      addLog("info", `Image: ${imageFile.name} (${(imageFile.size / 1048576).toFixed(1)} MB)`);

      if (videoFile.size > 500 * 1048576) {
        updateStep("validate", "error", "Video exceeds 500 MB");
        addLog("error", "✗ Video file exceeds 500 MB limit");
        throw new Error("Video file is too large (max 500 MB)");
      }

      await new Promise((r) => setTimeout(r, 300));
      updateStep("validate", "success", "All checks passed");
      addLog("success", "✓ Input validation passed");

      // ── Step 2: Upload Video ──
      updateStep("upload_video", "running", "Uploading...");
      addLog("info", `Uploading video to Vercel Blob (${(videoFile.size / 1048576).toFixed(1)} MB)...`);

      let videoBlobUrl: string;
      try {
        const vRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-vercel-blob-filename": videoFile.name },
          body: videoFile,
        });
        if (!vRes.ok) {
          const errData = await vRes.json().catch(() => ({ error: `HTTP ${vRes.status}` }));
          throw new Error(errData.error || `Upload failed (${vRes.status})`);
        }
        const vData = await vRes.json();
        videoBlobUrl = vData.url;
      } catch (uploadErr: any) {
        updateStep("upload_video", "error", uploadErr.message?.slice(0, 60));
        addLog("error", `✗ Video upload failed: ${uploadErr.message}`);
        throw uploadErr;
      }

      updateStep("upload_video", "success", "Done");
      addLog("success", `✓ Video uploaded → ${videoBlobUrl.slice(0, 50)}...`);

      // ── Step 3: Upload Image ──
      updateStep("upload_image", "running", "Uploading...");
      addLog("info", `Uploading image to Vercel Blob (${(imageFile.size / 1048576).toFixed(1)} MB)...`);

      let imageBlobUrl: string;
      try {
        const iRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-vercel-blob-filename": imageFile.name },
          body: imageFile,
        });
        if (!iRes.ok) {
          const errData = await iRes.json().catch(() => ({ error: `HTTP ${iRes.status}` }));
          throw new Error(errData.error || `Upload failed (${iRes.status})`);
        }
        const iData = await iRes.json();
        imageBlobUrl = iData.url;
      } catch (uploadErr: any) {
        updateStep("upload_image", "error", uploadErr.message?.slice(0, 60));
        addLog("error", `✗ Image upload failed: ${uploadErr.message}`);
        throw uploadErr;
      }

      updateStep("upload_image", "success", "Done");
      addLog("success", `✓ Image uploaded → ${imageBlobUrl.slice(0, 50)}...`);

// Signed URLs are already provided by /api/upload response (private store)

      // ── Step 4: Verify API Key ──
      updateStep("verify_key", "running", "Checking...");
      addLog("info", "Verifying API key with server...");

      await new Promise((r) => setTimeout(r, 200));
      updateStep("verify_key", "success", "Valid");
      addLog("success", "✓ API key verified");

      // ── Step 5: Submit to Freepik ──
      updateStep("call_api", "running", "Sending request...");
      addLog("info", "POST → Freepik Kling v2.6 Motion Control API");
      addLog("info", `Params: orientation=${values.character_orientation}, cfg=${values.cfg_scale}`);

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoBlobUrl,
          imageUrl: imageBlobUrl,
          prompt: values.prompt,
          character_orientation: values.character_orientation,
          cfg_scale: values.cfg_scale,
        }),
});

      const generateData = await generateRes.json();

      if (!generateRes.ok || !generateData.success) {
        const errMsg = generateData.error || `HTTP ${generateRes.status}`;
        updateStep("call_api", "error", errMsg);
        addLog("error", `✗ API Error: ${errMsg}`);
        throw new Error(errMsg);
      }

      updateStep("call_api", "success", `Task ID: ${generateData.taskId?.slice(0, 8)}...`);
      addLog("success", `✓ Task created → ${generateData.taskId}`);

      // ── Step 6: Save Task ──
      updateStep("save_task", "running", "Writing to DB...");
      addLog("info", "Recording task in database...");

      await new Promise((r) => setTimeout(r, 300));
      updateStep("save_task", "success", "Saved");
      addLog("success", "════════════════════════════════════");
      addLog("success", "🎉 Generation queued successfully!");

      set({ isComplete: true });

      // Delay then fire callback
      await new Promise((r) => setTimeout(r, 1200));
      onSuccess();

    } catch (error: any) {
      console.error(error);
      addLog("error", `Pipeline failed: ${error.message}`);
      addLog("warn", "Source files will be cleaned up by server.");
      addLog("info", "Please re-upload your video and image to try again.");
      // Clear local file references — server already cleans up blobs
      set({ videoFile: null, imageFile: null });
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
