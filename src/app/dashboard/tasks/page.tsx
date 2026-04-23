"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Timer, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type TaskStatus = 'success' | 'processing' | 'queued' | 'failed';

export interface Task {
  id: string;
  userId: string;
  prompt: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  resultUrl: string | null;
  status: TaskStatus;
  createdAt: Date;
  expiresAt?: Date | null;
}

function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const distance = expiration - now;

      if (distance < 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`);
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-md w-fit">
      <Timer className="w-3 h-3" />
      {timeLeft}
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Polling logic for pending tasks
  useEffect(() => {
    const pendingTasks = tasks.filter(t => t.status === 'processing' || t.status === 'queued');
    if (pendingTasks.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const task of pendingTasks) {
        try {
          const res = await fetch(`/api/tasks/${task.id}/status`);
          if (res.ok) {
            const json = await res.json();
            const updatedTask = json.data;
            if (updatedTask.status !== task.status) {
              setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
              if (updatedTask.status === 'success') {
                toast.success(`Task ${updatedTask.id} completed!`);
              } else if (updatedTask.status === 'failed') {
                toast.error(`Task ${updatedTask.id} failed.`);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to poll task ${task.id}`);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [tasks]);

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Success</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 animate-pulse">Processing</Badge>;
      case 'queued':
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Queued</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Tasks</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your generated videos and current queue.</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/20 overflow-x-auto backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-card/40">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-[120px]">Task ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Auto Delete</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow className="border-border/50 hover:bg-white/5">
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No tasks found. Start generating to see them here.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id} className="border-border/50 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-sm">{task.id.slice(0, 8)}...</TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(task.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {task.status === 'success' && task.expiresAt ? (
                      <CountdownTimer expiresAt={task.expiresAt} />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {task.status === 'success' && task.resultUrl ? (
                      <a href={task.resultUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-2 border-border/50">
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </Button>
                      </a>
                    ) : task.status === 'success' && !task.resultUrl ? (
                      <span className="text-muted-foreground text-xs">Expired</span>
                    ) : task.status === 'processing' || task.status === 'queued' ? (
                      <div className="flex items-center justify-end text-xs text-muted-foreground gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Please wait
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
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
