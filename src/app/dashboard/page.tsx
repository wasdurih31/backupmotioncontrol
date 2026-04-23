"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Video, CheckCircle2, Clock, XCircle, Activity, Loader2 } from "lucide-react";

// Dummy data for 7 days activity - can be replaced with real analytics later
const activityData = [
  { name: "Mon", total: 4 },
  { name: "Tue", total: 7 },
  { name: "Wed", total: 3 },
  { name: "Thu", total: 8 },
  { name: "Fri", total: 12 },
  { name: "Sat", total: 5 },
  { name: "Sun", total: 3 },
];

export default function DashboardHome() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, profileRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/user/profile')
        ]);
        
        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData.data || []);
        }
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const generateCount = profile?.totalGenerate || 0;
  const successTasks = tasks.filter(t => t.status === 'success').length;
  const pendingTasks = tasks.filter(t => t.status === 'queued' || t.status === 'processing').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen -mt-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Overview</h1>
        <p className="text-sm md:text-base text-muted-foreground">Monitor your video generation activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Generated</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold">{generateCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total history</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500/70" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{successTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed generations</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-amber-500/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in queue</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed Tasks</CardTitle>
            <XCircle className="h-4 w-4 text-red-500/70" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{failedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-7">
        <Card className="col-span-4 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Activity Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#fff', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mt-4">
              {tasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-4 ${
                    task.status === 'success' ? 'bg-green-500' :
                    task.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                    task.status === 'queued' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <p className="text-sm font-medium leading-none truncate">
                      {task.prompt || "No prompt provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.id.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground ml-auto whitespace-nowrap">
                    {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No recent generations.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
