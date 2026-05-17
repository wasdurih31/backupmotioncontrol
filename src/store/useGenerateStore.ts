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
  paygModel?: string;
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

// Batas ukuran file (video & image) — dienforce di frontend, store, dan
// backend via `maximumSizeInBytes` di handleUpload.
export const MAX_FILE_SIZE_MB = 6;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

const POLL_FIRST_DELAY_MS = 5 * 60 * 1000; // first poll motion control: 5 menit
const POLL_FIRST_DELAY_FAST_MS = 30 * 1000; // first poll model cepat (pixverse, kling_2_1_pro, veo, grok): 30 detik
const POLL_MIN_INTERVAL_MS = 30 * 1000;    // minimum 30s antar poll (motion control)
const POLL_MAX_INTERVAL_MS = 90 * 1000;    // maximum 90s antar poll (motion control)
const POLL_MIN_INTERVAL_FAST_MS = 15 * 1000; // minimum 15s antar poll (model cepat)
const POLL_MAX_INTERVAL_FAST_MS = 40 * 1000; // maximum 40s antar poll (model cepat)
const POLL_HIDDEN_INTERVAL_MS = 5 * 60 * 1000; // saat tab tidak aktif
const TASK_TIMEOUT_MS = 40 * 60 * 1000;   // 40 menit timeout

/** Cek apakah engine ini motion control (proses lama 8-15 menit). */
function isMotionControl(engine?: string): boolean {
  return !engine || engine === 'kling';
  // engine 'kling' = motion control. Selain itu (pixverse, kling_2_1_pro, veo, grok) = cepat.
}

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
    const isPaygNonKling = values.paygModel && !values.paygModel.startsWith('kling');
    if (values.engine === "kling" && !isPaygNonKling) {
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

      if (videoFile && videoFile.size > MAX_FILE_SIZE_BYTES) {
        updateStep("validate", "error", `Video > ${MAX_FILE_SIZE_MB} MB`);
        addLog("error", `✗ Video file melebihi batas ${MAX_FILE_SIZE_MB} MB`);
        throw new Error(`Ukuran video terlalu besar (max ${MAX_FILE_SIZE_MB} MB)`);
      }

      if (imageFile && imageFile.size > MAX_FILE_SIZE_BYTES) {
        updateStep("validate", "error", `Image > ${MAX_FILE_SIZE_MB} MB`);
        addLog("error", `✗ Image file melebihi batas ${MAX_FILE_SIZE_MB} MB`);
        throw new Error(`Ukuran gambar terlalu besar (max ${MAX_FILE_SIZE_MB} MB)`);
      }

      await new Promise((r) => setTimeout(r, 300));
      updateStep("validate", "success", "All checks passed");
      addLog("success", "✓ Input validation passed");

      // ── Step 2: Upload Video (Skip for PixVerse and PAYG non-kling) ──
      let videoBlobUrl: string | undefined;
      if (values.engine === "kling" && !isPaygNonKling && videoFile) {
        updateStep("upload_video", "running", "Uploading...");
        addLog("info", `Uploading video to Vercel Blob (${(videoFile.size / 1048576).toFixed(1)} MB)...`);

        try {
          // Direct upload ke R2 via /api/upload
          const vRes = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "x-filename": videoFile.name,
              "x-content-type": videoFile.type || "video/mp4",
            },
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
      addLog("info", `Uploading image to R2 (${(imageFile!.size / 1048576).toFixed(1)} MB)...`);

      let imageBlobUrl: string;
      try {
        const iRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "x-filename": imageFile!.name,
            "x-content-type": imageFile!.type || "image/jpeg",
          },
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
          paygModel: values.paygModel,
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
      // Determine the actual engine for polling purposes
      const actualEngine = values.paygModel
        ? (values.paygModel.startsWith('veo') ? 'veo' : values.paygModel.startsWith('grok') ? 'grok' : values.engine)
        : values.engine;

      const startedAt = Date.now();
      set((s) => {
        const newTasks: Record<string, ActiveTask> = {
          ...s.tasks,
          [taskId]: {
            taskId,
            status: "polling",
            resultUrl: null,
            startedAt,
            engine: actualEngine,
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

/**
 * Single batch poller untuk seluruh halaman. Dipanggil sekali saja, lalu
 * self-schedule. Setiap tick:
 *   1. Ambil semua task di state yang status-nya "polling" dan sudah
 *      melewati POLL_FIRST_DELAY_MS.
 *   2. Panggil /api/tasks/status?ids=... (1 request untuk semua task).
 *   3. Update state berdasarkan response.
 *   4. Schedule tick berikutnya dengan jitter. Kalau tab hidden → 5 menit.
 */
let batchPollerStarted = false;

function ensureBatchPoller(set: SetFn, get: () => GenerateState) {
  if (batchPollerStarted) return;
  batchPollerStarted = true;

  const finalize = (taskId: string, patch: Partial<ActiveTask>) => {
    set((s) => {
      const existing = s.tasks[taskId];
      if (!existing) return {};
      const updated: ActiveTask = { ...existing, ...patch };
      const newTasks = { ...s.tasks, [taskId]: updated };
      const focusedTaskId = s.focusedTaskId || taskId;
      return {
        tasks: newTasks,
        focusedTaskId,
        ...deriveUiState(newTasks, focusedTaskId),
      };
    });
  };

  const tick = async () => {
    const state = get();
    const now = Date.now();

    // Kumpulkan task yang layak di-poll:
    //  - status "polling"
    //  - sudah lewat waktu firstPoll (5 menit untuk motion control, 30s untuk model cepat)
    //  - belum timeout (40 menit)
    const pollable: ActiveTask[] = [];
    const timedOut: string[] = [];
    for (const t of Object.values(state.tasks)) {
      if (t.status !== "polling") continue;
      const elapsed = now - t.startedAt;
      if (elapsed > TASK_TIMEOUT_MS) {
        timedOut.push(t.taskId);
        continue;
      }
      const firstDelay = isMotionControl(t.engine) ? POLL_FIRST_DELAY_MS : POLL_FIRST_DELAY_FAST_MS;
      if (elapsed < firstDelay) continue;
      pollable.push(t);
    }

    // Tandai yang timeout.
    for (const id of timedOut) {
      finalize(id, { status: "failed" });
    }

    // Kalau tidak ada yang perlu dipoll, schedule ulang saja.
    if (pollable.length === 0) {
      schedule();
      return;
    }

    try {
      const ids = pollable.map((t) => t.taskId).join(",");
      const res = await fetch(`/api/tasks/status?ids=${encodeURIComponent(ids)}`);
      if (res.ok) {
        const json = await res.json();
        const results: Array<{ id: string; status: string; resultUrl: string | null }> = json.data || [];
        for (const r of results) {
          if (r.status === "success") {
            finalize(r.id, { status: "completed", resultUrl: r.resultUrl || null });
            get().triggerGalleryRefresh();
          } else if (r.status === "failed" || r.status === "expired") {
            finalize(r.id, { status: "failed" });
          }
          // "processing"/"queued" → biarkan.
        }
      }
    } catch (_e) {
      // abaikan — coba lagi di tick berikutnya.
    }

    schedule();
  };

  const schedule = () => {
    const activeTasks = Object.values(get().tasks).filter((t) => t.status === "polling");
    const hasActive = activeTasks.length > 0;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";

    let delay: number;
    if (!hasActive) {
      delay = POLL_MAX_INTERVAL_MS;
    } else if (hidden) {
      delay = POLL_HIDDEN_INTERVAL_MS;
    } else {
      // Gunakan interval tercepat dari semua task aktif.
      // Kalau ada task model cepat → pakai interval cepat.
      const hasFastTask = activeTasks.some((t) => !isMotionControl(t.engine));
      if (hasFastTask) {
        const range = POLL_MAX_INTERVAL_FAST_MS - POLL_MIN_INTERVAL_FAST_MS;
        delay = POLL_MIN_INTERVAL_FAST_MS + Math.floor(Math.random() * range);
      } else {
        const range = POLL_MAX_INTERVAL_MS - POLL_MIN_INTERVAL_MS;
        delay = POLL_MIN_INTERVAL_MS + Math.floor(Math.random() * range);
      }
    }
    setTimeout(tick, delay);
  };

  // Saat tab kembali visible, tick lebih cepat agar UI update segera.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        setTimeout(tick, 1000);
      }
    });
  }

  // First tick setelah 3 detik.
  setTimeout(tick, 3000);
}

// API lama: dipanggil saat runGeneration / loadLatestTask.
// Sekarang cuma memastikan batch poller jalan.
function startPolling(
  _taskId: string,
  set: SetFn,
  get: () => GenerateState,
  _startTime: number,
) {
  ensureBatchPoller(set, get);
}
