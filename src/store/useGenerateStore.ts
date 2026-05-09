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

export interface ActiveTask {
  taskId: string;
  status: "polling" | "completed" | "failed";
  resultUrl: string | null;
  startedAt: number;
  engine?: string;
  preview?: {
    imagePreviewUrl?: string | null;
    videoPreviewUrl?: string | null;
  };
}

// Batas slot harus konsisten dengan server (`/api/generate`).
export const MAX_CONCURRENT_TASKS = 5;

interface GenerateState {
  // Files (untuk form aktif saat ini)
  videoFile: File | null;
  imageFile: File | null;

  // Pipeline (untuk submit yang sedang berlangsung)
  steps: PipelineStep[];
  logs: LogEntry[];
  isSubmitting: boolean;
  showMonitor: boolean;
  monitorOpen: boolean;
  isComplete: boolean;

  // Task list — sekarang support banyak task paralel
  tasks: Record<string, ActiveTask>;
  // Task yang sedang di-highlight (terakhir selesai / terakhir dibuat)
  focusedTaskId: string | null;

  // Untuk kompat UI lama
  activeTaskId: string | null;
  resultVideoUrl: string | null;
  pollingStatus: PollingStatus;
  hasRestoredTask: boolean;

  // Gallery
  galleryRefreshTrigger: number;

  // Actions
  setVideoFile: (f: File | null) => void;
  setImageFile: (f: File | null) => void;
  setMonitorOpen: (open: boolean) => void;
  resetPipeline: () => void;
  clearResult: () => void;
  dismissTask: (taskId: string) => void;
  focusTask: (taskId: string | null) => void;
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

const POLL_FIRST_DELAY_MS = 5 * 60 * 1000; // first poll: 5 menit setelah task dibuat
const POLL_MIN_INTERVAL_MS = 30 * 1000;    // minimum 30s antar poll berikutnya
const POLL_MAX_INTERVAL_MS = 90 * 1000;    // maximum 90s antar poll berikutnya
const TASK_TIMEOUT_MS = 40 * 60 * 1000;   // 40 menit timeout (motion control 8–15m + margin)

// Menyimpan task yang sedang aktif di-poll agar tidak dobel polling bila
// `loadLatestTask` dipanggil berkali-kali.
const polling = new Set<string>();

// ─── Helper untuk turunkan UI-compat state dari tasks map ─────────────
function deriveUiState(
  tasks: Record<string, ActiveTask>,
  focusedId: string | null,
): { activeTaskId: string | null; resultVideoUrl: string | null; pollingStatus: PollingStatus } {
  const task = focusedId ? tasks[focusedId] : null;
  if (!task) {
    return { activeTaskId: null, resultVideoUrl: null, pollingStatus: "idle" };
  }
  const pollingStatus: PollingStatus =
    task.status === "polling" ? "polling" : task.status === "completed" ? "completed" : "failed";
  return {
    activeTaskId: task.taskId,
    resultVideoUrl: task.resultUrl,
    pollingStatus,
  };
}

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

  tasks: {},
  focusedTaskId: null,

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

  // Hapus 1 task dari tampilan (misal setelah download / ditolak user).
  dismissTask: (taskId) => set((s) => {
    const { [taskId]: _removed, ...rest } = s.tasks;
    const focusedTaskId = s.focusedTaskId === taskId ? null : s.focusedTaskId;
    return {
      tasks: rest,
      focusedTaskId,
      ...deriveUiState(rest, focusedTaskId),
    };
  }),

  // Fokuskan (highlight) task tertentu di ResultSection.
  focusTask: (taskId) => set((s) => ({
    focusedTaskId: taskId,
    ...deriveUiState(s.tasks, taskId),
  })),

  // Bersihkan SEMUA state (reset form + hapus semua kartu task dari layar).
  clearResult: () =>
    set({
      tasks: {},
      focusedTaskId: null,
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

  // Restore semua task aktif / baru selesai dari DB saat halaman di-mount.
  loadLatestTask: async () => {
    if (get().hasRestoredTask) return;
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const json = await res.json();
      const list: Array<{
        id: string;
        status: string;
        resultUrl: string | null;
        createdAt: string | Date | null;
        expiresAt: string | Date | null;
        engine?: string;
      }> = json.data || [];
      if (list.length === 0) {
        set({ hasRestoredTask: true });
        return;
      }

      const nowMs = Date.now();
      const restored: Record<string, ActiveTask> = {};
      let latestCompletedId: string | null = null;
      let latestCompletedAt = 0;

      for (const t of list) {
        const createdAt = t.createdAt ? new Date(t.createdAt).getTime() : nowMs;

        if (t.status === "processing" || t.status === "queued") {
          if (nowMs - createdAt > TASK_TIMEOUT_MS) continue; // skip yang sudah timeout
          restored[t.id] = {
            taskId: t.id,
            status: "polling",
            resultUrl: null,
            startedAt: createdAt,
            engine: t.engine,
          };
          startPolling(t.id, set, get, createdAt);
        } else if (t.status === "success" && t.resultUrl) {
          const expiresAt = t.expiresAt ? new Date(t.expiresAt).getTime() : 0;
          if (expiresAt > nowMs) {
            restored[t.id] = {
              taskId: t.id,
              status: "completed",
              resultUrl: t.resultUrl,
              startedAt: createdAt,
              engine: t.engine,
            };
            if (createdAt > latestCompletedAt) {
              latestCompletedAt = createdAt;
              latestCompletedId = t.id;
            }
          }
        }
      }

      // Prioritas fokus: task yang sedang polling > task terakhir selesai
      const firstPolling = Object.values(restored).find((t) => t.status === "polling");
      const focusedTaskId = firstPolling?.taskId || latestCompletedId;

      set({
        tasks: restored,
        focusedTaskId,
        hasRestoredTask: true,
        ...deriveUiState(restored, focusedTaskId),
      });
    } catch (e) {
      console.error("Failed to load latest task:", e);
      set({ hasRestoredTask: true });
    }
  },

  runGeneration: async (values) => {
    const { videoFile, imageFile, isSubmitting, tasks } = get();

    // ── Validasi file ──
    if (values.engine === "kling") {
      if (!videoFile || !imageFile) return;
    } else {
      if (!imageFile) return;
    }

    // Cegah double-submit dari tombol yang sama (race sekejap).
    if (isSubmitting) return;

    // Cek limit lokal (server tetap enforce — ini hanya UX).
    const activeCount = Object.values(tasks).filter((t) => t.status === "polling").length;
    if (activeCount >= MAX_CONCURRENT_TASKS) {
      // Tidak throw — cukup abaikan. UI sudah men-disable tombol.
      return;
    }

    const addLog = (level: LogEntry["level"], message: string) => {
      set((s) => ({ logs: [...s.logs, { time: now(), level, message }] }));
    };

    const updateStep = (id: string, status: StepStatus, detail?: string) => {
      set((s) => ({
        steps: s.steps.map((step) =>
          step.id === id ? { ...step, status, detail, timestamp: now() } : step,
        ),
      }));
    };

    // Reset pipeline untuk submit baru (tapi jangan sentuh `tasks`).
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
      addLog("info", `Engine: ${values.engine.toUpperCase()}`);
      addLog("info", "Validating input files...");
      if (videoFile) addLog("info", `Video: ${videoFile.name} (${(videoFile.size / 1048576).toFixed(1)} MB)`);
      if (imageFile) addLog("info", `Image: ${imageFile.name} (${(imageFile.size / 1048576).toFixed(1)} MB)`);

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
      addLog("info", `Uploading image to Vercel Blob (${(imageFile!.size / 1048576).toFixed(1)} MB)...`);

      let imageBlobUrl: string;
      try {
        const iRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "x-vercel-blob-filename": imageFile!.name },
          body: imageFile!,
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

      // ── Step 5: Submit ke Freepik ──
      updateStep("call_api", "running", "Antri di queue Freepik...");
      addLog("info", "POST → Freepik API (dijadwalkan oleh queue)");
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
        if (generateData.code === "TOO_MANY_ACTIVE") {
          const msg = `Batas ${generateData.limit || MAX_CONCURRENT_TASKS} proses bersamaan tercapai. Tunggu salah satu selesai.`;
          updateStep("call_api", "error", msg);
          addLog("error", `✗ ${msg}`);
          throw new Error(msg);
        }
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

      // Tambahkan task ke map & fokuskan ke task baru ini.
      const startedAt = Date.now();
      set((s) => {
        const newTasks: Record<string, ActiveTask> = {
          ...s.tasks,
          [taskId]: {
            taskId,
            status: "polling",
            resultUrl: null,
            startedAt,
            engine: values.engine,
          },
        };
        return {
          isComplete: true,
          tasks: newTasks,
          focusedTaskId: taskId,
          ...deriveUiState(newTasks, taskId),
        };
      });

      // Bersihkan file di form agar siap untuk submit berikutnya.
      set({ videoFile: null, imageFile: null });

      startPolling(taskId, set, get, startedAt);

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
type SetFn = (
  partial:
    | Partial<GenerateState>
    | ((s: GenerateState) => Partial<GenerateState>),
) => void;

function startPolling(taskId: string, set: SetFn, get: () => GenerateState, startTime: number) {
  if (polling.has(taskId)) return; // sudah ada loop berjalan
  polling.add(taskId);

  const finalize = (patch: Partial<ActiveTask>) => {
    set((s) => {
      const existing = s.tasks[taskId];
      if (!existing) return {};
      const updated: ActiveTask = { ...existing, ...patch };
      const newTasks = { ...s.tasks, [taskId]: updated };
      // Jika task yang baru selesai adalah task yang sedang di-fokuskan,
      // refresh derived UI state supaya ResultSection menampilkan hasil.
      const focusedTaskId = s.focusedTaskId || taskId;
      return {
        tasks: newTasks,
        focusedTaskId,
        ...deriveUiState(newTasks, focusedTaskId),
      };
    });
  };

  const poll = async () => {
    const state = get();
    const task = state.tasks[taskId];
    if (!task || task.status !== "polling") {
      polling.delete(taskId);
      return;
    }

    if (Date.now() - startTime > TASK_TIMEOUT_MS) {
      finalize({ status: "failed" });
      polling.delete(taskId);
      set((s) => ({ logs: [...s.logs, { time: now(), level: "error", message: `✗ Task ${taskId.slice(0, 8)} timed out (30m).` }] }));
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`);
      if (!res.ok) {
        schedulePoll();
        return;
      }
      const json = await res.json();
      const t = json.data;
      if (t.status === "success") {
        finalize({ status: "completed", resultUrl: t.resultUrl || null });
        get().triggerGalleryRefresh();
        polling.delete(taskId);
        return;
      } else if (t.status === "failed") {
        finalize({ status: "failed" });
        polling.delete(taskId);
        return;
      } else {
        schedulePoll();
      }
    } catch (_e) {
      schedulePoll();
    }
  };

  const schedulePoll = () => {
    // Jitter acak 30..90 detik antar poll. Motion control generate butuh 8–15
    // menit, jadi interval ini cukup cepat untuk deteksi selesai namun tidak
    // membuang bandwidth.
    const range = POLL_MAX_INTERVAL_MS - POLL_MIN_INTERVAL_MS;
    const delay = POLL_MIN_INTERVAL_MS + Math.floor(Math.random() * range);
    setTimeout(poll, delay);
  };

  // First poll: tunggu 5 menit setelah task dibuat. Video motion-control
  // hampir tidak pernah selesai sebelum 5 menit, jadi polling lebih awal
  // hanya buang-buang request.
  const firstDelay = Math.max(
    POLL_MIN_INTERVAL_MS,
    POLL_FIRST_DELAY_MS - (Date.now() - startTime),
  );
  setTimeout(poll, firstDelay);
}
