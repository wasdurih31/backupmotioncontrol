"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, Clock, User, MessageSquare, CheckCircle2, XCircle, Play, Video } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Activity {
  id: string;
  status: string;
  prompt: string;
  resultUrl: string | null;
  createdAt: string;
  accessCode: string;
  userIdentifier: string;
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      } else {
        toast.error("Failed to fetch activities");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Streaming live activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Live Activity</h1>
          <p className="text-muted-foreground">Real-time monitoring of user generation requests.</p>
        </div>
        <Button variant="outline" onClick={fetchActivities} disabled={loading} className="gap-2 border-border/50 bg-card/30">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Now
        </Button>
      </div>

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
                  No activity found yet.
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
                      <p className="text-xs text-muted-foreground line-clamp-2 italic" title={act.prompt}>
                        {act.prompt}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {act.status === 'success' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> SUCCESS
                        </span>
                      ) : act.status === 'failed' ? (
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
  )
}
