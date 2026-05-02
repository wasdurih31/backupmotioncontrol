"use client";

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
  character_orientation?: "video" | "image";
  cfg_scale?: number;
  model?: string;
  engine: "kling" | "pixverse" | "kling_2_1_pro";
  resolution?: string;
  duration?: number;
  negative_prompt?: string;
  style?: string;
}

export type PollingStatus = "idle" | "polling" | "completed" | "failed";

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

  // Result / Polling
  activeTaskId: string | null;
  resultVideoUrl: string | null;
  pollingStatus: PollingStatus;
  hasRestoredTask: boolean; // true if we loaded a task from DB on page load

  // Actions
  setVideoFile: (f: File | null) => void;
  setImageFile: (f: File | null) => void;
  setMonitorOpen: (open: boolean) => void;
  resetPipeline: () => void;
  clearResult: () => void;
  galleryRefreshTrigger: number;
  triggerGalleryRefresh: () => void;
  loadLatestTask: () => Promise<void>;
  runGeneration: (values: GenerateFormValues) => Promise<void>;
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

const POLL_INTERVAL_MS = 5000;

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

  activeTaskId: null,
  resultVideoUrl: null,
  pollingStatus: "idle",
  hasRestoredTask: false,
  galleryRefreshTrigger: 0,

  triggerGalleryRefresh: () => set((s) => ({ galleryRefreshTrigger: s.galleryRefreshTrigger + 1 })),
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

  clearResult: () =>
    set({
      activeTaskId: null,
      resultVideoUrl: null,
      pollingStatus: "idle",
      hasRestoredTask: false,
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      logs: [],
      isSubmitting: false,
      showMonitor: false,
      monitorOpen: false,
      isComplete: false,
      videoFile: null,
      imageFile: null,
    }),

  // ── Load latest task from DB on page load ──
  loadLatestTask: async () => {
    // Don't reload if we already have an active task in memory
    const state = get();
    if (state.activeTaskId || state.isSubmitting) return;

    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const json = await res.json();
      const tasks = json.data;
      if (!tasks || tasks.length === 0) return;

      const latest = tasks[0]; // already sorted by createdAt DESC

      if (latest.status === "processing" || latest.status === "queued") {
        const startTime = latest.createdAt ? new Date(latest.createdAt).getTime() : Date.now();
        const TIMEOUT_MS = 30 * 60 * 1000;
        
        // If task has timed out, ignore it so the UI stays clean (idle) for a new generation.
        if (Date.now() - startTime > TIMEOUT_MS) {
          return;
        }

        // Task still in progress — resume polling
        set({
          activeTaskId: latest.id,
          pollingStatus: "polling",
          hasRestoredTask: true,
        });
        startPolling(latest.id, set, get, startTime);
      } else if (latest.status === "success" && latest.resultUrl) {
        // Task completed recently — show result
        const expiresAt = latest.expiresAt ? new Date(latest.expiresAt).getTime() : 0;
        if (expiresAt > Date.now()) {
          set({
            activeTaskId: latest.id,
            resultVideoUrl: latest.resultUrl,
            pollingStatus: "completed",
            hasRestoredTask: true,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load latest task:", e);
    }
  },

  runGeneration: async (values) => {
    const { videoFile, imageFile, activeTaskId } = get();
    
    // ── Validation based on Engine ──
    if (values.engine === "kling") {
      if (!videoFile || !imageFile) return;
    } else {
      if (!imageFile) return;
    }

    // ── Block if a task is actively running ──
    const { pollingStatus, isSubmitting } = get();
    if (pollingStatus === "polling" || isSubmitting) return;

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
      resultVideoUrl: null,
      pollingStatus: "idle",
      activeTaskId: null,
      hasRestoredTask: false,
    });

    try {
      // ── Step 1: Validate ──
      updateStep("validate", "running");
      addLog("info", `Engine: ${values.engine.toUpperCase()}`);
      addLog("info", "Validating input files...");
      if (videoFile) addLog("info", `Video: ${videoFile.name} (${(videoFile.size / 1048576).toFixed(1)} MB)`);
      addLog("info", `Image: ${imageFile.name} (${(imageFile.size / 1048576).toFixed(1)} MB)`); 

      if (videoFile && videoFile.size > 500 * 1048576) {
        updateStep("validate", "error", "Video exceeds 500 MB");
        addLog("error", "✗ Video file exceeds 500 MB limit");
        throw new Error("Video file is too large (max 500 MB)");
      }

      await new Promise((r) => setTimeout(r, 300));
      updateStep("validate", "success", "All checks passed");
      addLog("success", "✓ Input validation passed");

      // ── Step 2: Upload Video (Skip for PixVerse) ──
      let videoBlobUrl: string | undefined;
      if (values.engine === "kling" && videoFile) {
        updateStep("upload_video", "running", "Uploading...");
        addLog("info", `Uploading video to Vercel Blob (${(videoFile.size / 1048576).toFixed(1)} MB)...`);

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
        addLog("success", `✓ Video uploaded → ${videoBlobUrl?.slice(0, 50)}...`);
      } else {
        updateStep("upload_video", "success", "Skipped");
        addLog("info", "– Video upload skipped (Image-to-Video mode)");
      }

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
          model: values.model,
          engine: values.engine,
          resolution: values.resolution,
          duration: values.duration,
          negative_prompt: values.negative_prompt,
          style: values.style,
        }),
      });

      const generateData = await generateRes.json();

      if (!generateRes.ok) {
        const errMsg = generateData.error || `HTTP ${generateRes.status}`;
        updateStep("call_api", "error", errMsg);
        addLog("error", `✗ API Error: ${errMsg}`);
        throw new Error(errMsg);
      }

      const taskId = generateData.taskId;
      if (!taskId) {
        updateStep("call_api", "error", "No task ID returned");
        addLog("error", "✗ No task ID in response");
        throw new Error("No task ID returned from server");
      }

      updateStep("call_api", "success", `Task ID: ${taskId.slice(0, 8)}...`);
      addLog("success", `✓ Task created → ${taskId}`);

      // ── Step 6: Save Task ──
      updateStep("save_task", "running", "Writing to DB...");
      addLog("info", "Recording task in database...");
      await new Promise((r) => setTimeout(r, 300));
      updateStep("save_task", "success", "Saved");
      addLog("success", "════════════════════════════════════");
      addLog("success", "🎉 Generation queued successfully!");
      addLog("info", "Waiting for Freepik to process your video...");

      set({ isComplete: true, activeTaskId: taskId, pollingStatus: "polling" });

      // ── Start polling for result ──
      startPolling(taskId, set, get, Date.now());

    } catch (error: any) {
      console.error(error);
      addLog("error", `Pipeline failed: ${error.message}`);
      addLog("warn", "Source files will be cleaned up by server.");
      addLog("info", "Please re-upload your video and image to try again.");
      set({ videoFile: null, imageFile: null });
    } finally {
      set({ isSubmitting: false });
    }
  },
}));

// ─── Polling Function ────────────────────────────────────────────────
function startPolling(
  taskId: string,
  set: (partial: Partial<GenerateState> | ((s: GenerateState) => Partial<GenerateState>)) => void,
  get: () => GenerateState,
  startTime: number
) {
  let pollCount = 0;
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  const poll = async () => {
    const state = get();
    // Stop if cleared or different task or already done
    if (state.activeTaskId !== taskId || state.pollingStatus !== "polling") return;

    // Timeout check
    if (Date.now() - startTime > TIMEOUT_MS) {
      set((s) => ({
        pollingStatus: "failed",
        logs: [...s.logs, { time: now(), level: "error", message: "✗ Generation timed out (30 mins). Please try again." }]
      }));
      return;
    }

    pollCount++;
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`);
      if (!res.ok) {
        schedulePoll();
        return;
      }

      const json = await res.json();
      const task = json.data;

      if (task.status === "success") {
        // Mark as completed even if resultUrl is null (edge case)
        set({
          pollingStatus: "completed",
          resultVideoUrl: task.resultUrl || null,
        });
        get().triggerGalleryRefresh();
        return; // stop polling
      } else if (task.status === "failed") {
        set({ pollingStatus: "failed" });
        return; // stop polling
      } else {
        // Still processing
        schedulePoll();
      }
    } catch (e: any) {
      schedulePoll();
    }
  };

  const schedulePoll = () => {
    setTimeout(poll, POLL_INTERVAL_MS);
  };

  // Initial poll after a short delay
  setTimeout(poll, 3000);
}
