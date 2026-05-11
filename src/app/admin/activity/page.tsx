"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2, ExternalLink, Clock, User, MessageSquare, CheckCircle2, XCircle,
  Video, Search, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Activity {
  id: string;
  status: string;
  prompt: string | null;
  resultUrl: string | null;
  createdAt: string;
  accessCode: string;
  userIdentifier: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 50;

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<number | null>(null);

  // Debounce input pencarian supaya tidak spam API setiap ketikan.
  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(1); // reset ke halaman 1 saat search berubah
    }, 400);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchActivities = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (searchTerm) params.set("q", searchTerm);

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      } else {
        toast.error("Failed to fetch activities");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch saat page / searchTerm berubah.
  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  // Auto-refresh setiap 30 detik (silent — tidak flicker).
  useEffect(() => {
    const interval = setInterval(() => fetchActivities({ silent: true }), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      day: "2-digit", month: "short",
    });
  };

  // Bangun daftar nomor halaman yang ditampilkan (dengan ellipsis bila perlu).
  const pageNumbers = (() => {
    const { totalPages } = pagination;
    const current = page;
    const pages: Array<number | "…"> = [];
    const push = (p: number | "…") => pages.push(p);

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) push(i);
    } else {
      push(1);
      if (current > 4) push("…");
      const start = Math.max(2, current - 2);
      const end = Math.min(totalPages - 1, current + 2);
      for (let i = start; i <= end; i++) push(i);
      if (current < totalPages - 3) push("…");
      push(totalPages);
    }
    return pages;
  })();

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Activity</h1>
          <p className="text-muted-foreground">Real-time monitoring of user generation requests.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchActivities()}
          disabled={loading}
          className="gap-2 border-border/50 bg-card/30 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Now
        </Button>
      </div>

      {/* Search box */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari email, nomor, atau access code..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-9 bg-card/30 border-border/50"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading && activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Memuat aktivitas...</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border/50 bg-card/10 overflow-x-auto backdrop-blur-xl shadow-2xl">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-48">Timestamp</TableHead>
                  <TableHead>User / Access Code</TableHead>
                  <TableHead className="max-w-[300px]">Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length === 0 ? (
                  <TableRow className="border-border/50">
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                      {searchTerm
                        ? `Tidak ada aktivitas untuk "${searchTerm}".`
                        : "Belum ada aktivitas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((act) => (
                    <TableRow key={act.id} className="border-border/50 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTime(act.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-sm">
                            <User className="w-3 h-3 text-blue-400" />
                            {act.userIdentifier}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded w-fit uppercase">
                            {act.accessCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="flex gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <p
                            className="text-xs text-muted-foreground line-clamp-2 italic"
                            title={act.prompt || ""}
                          >
                            {act.prompt || <span className="opacity-50">—</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {act.status === "success" ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" /> SUCCESS
                            </span>
                          ) : act.status === "failed" ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              <XCircle className="w-3 h-3" /> FAILED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> {act.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {act.resultUrl ? (
                          <a
                            href={act.resultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/5 px-3 py-1.5 rounded-lg border border-blue-400/20"
                          >
                            <Video className="w-3.5 h-3.5" />
                            View Video
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No result yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
            <p className="text-xs text-muted-foreground">
              {pagination.total === 0
                ? "0 aktivitas"
                : `Menampilkan ${rangeStart}–${rangeEnd} dari ${pagination.total.toLocaleString("id-ID")} aktivitas`}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="h-8 w-8 p-0 border-border/50 bg-card/30"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {pageNumbers.map((p, idx) =>
                p === "…" ? (
                  <span key={`ellipsis-${idx}`} className="text-xs text-muted-foreground px-1.5">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={`h-8 w-8 p-0 text-xs font-mono ${
                      p === page
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-border/50 bg-card/30"
                    }`}
                  >
                    {p}
                  </Button>
                ),
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="h-8 w-8 p-0 border-border/50 bg-card/30"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
