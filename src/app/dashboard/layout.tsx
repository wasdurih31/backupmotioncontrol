"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Video, 
  ListTodo, 
  Settings, 
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { useGenerateStore } from "@/store/useGenerateStore";

const navLinks = [
  { name: "Home", shortName: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Generate Video", shortName: "Generate", href: "/dashboard/generate", icon: Sparkles },
  { name: "Tasks", shortName: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Profile Settings", shortName: "Profile", href: "/dashboard/profile", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const isGenerating = useGenerateStore((s) => s.isSubmitting);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error("Failed to fetch user");
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (e) {
      console.error(e);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ========== DESKTOP SIDEBAR (hidden on mobile) ========== */}
      <aside className="hidden md:flex w-64 border-r border-border/50 bg-card/20 backdrop-blur-xl flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            UniverseAI <span className="text-muted-foreground">MC</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.name} href={link.href} className="block">
                <div
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <link.icon className="h-5 w-5 mr-3" />
                  <span className="font-medium text-sm">{link.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Generating indicator in sidebar */}
        {isGenerating && pathname !== '/dashboard/generate' && (
          <div className="px-4 pb-2">
            <Link href="/dashboard/generate">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/15 transition-colors">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium">Generating...</p>
                  <p className="text-[10px] text-blue-300/60">Tap to view progress</p>
                </div>
              </div>
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT AREA ========== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* --- DESKTOP TOPBAR (hidden on mobile) --- */}
        <header className="hidden md:flex h-16 border-b border-border/50 bg-background/50 backdrop-blur-sm items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">User: </span>
              <span className="font-medium text-foreground">{user.email || user.phone}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm bg-card border border-border rounded-full px-4 py-1.5 shadow-sm">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{user.totalGenerate || 0}</span>
              <span className="text-muted-foreground">Generations</span>
            </div>
            
            <Link href="/dashboard/profile">
              <div className={`flex items-center gap-2 text-sm border rounded-full px-4 py-1.5 shadow-sm cursor-pointer transition-colors ${user.hasApiKey ? 'bg-white/5 border-green-500/30 text-green-400 hover:bg-green-500/10' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}>
                {user.hasApiKey ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span className="font-medium">
                  {user.hasApiKey ? 'API Key Active' : 'API Key Missing'}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* --- MOBILE TOPBAR --- */}
        <header className="flex md:hidden h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl items-center justify-between px-4 z-10 shrink-0">
          <Link href="/dashboard" className="font-bold text-base tracking-tight">
            UniverseAI <span className="text-muted-foreground">MC</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/profile">
              <div className={`flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 ${user.hasApiKey ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                {user.hasApiKey ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span className="font-medium">{user.hasApiKey ? 'Active' : 'Missing'}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* --- PAGE CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-20 md:pb-8">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ========== MOBILE BOTTOM NAV (hidden on desktop) ========== */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        {/* Glassmorphism background */}
        <div className="bg-background/80 backdrop-blur-xl border-t border-border/50">
          <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const isGenerateLink = link.href === '/dashboard/generate';
              return (
                <Link key={link.name} href={link.href} className="flex-1">
                  <div className="flex flex-col items-center gap-0.5 py-1 relative">
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-white/10' : ''}`}>
                      {isGenerateLink && isGenerating ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      ) : (
                        <link.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${
                      isGenerateLink && isGenerating ? 'text-blue-400' : isActive ? 'text-white' : 'text-muted-foreground'
                    }`}>
                      {isGenerateLink && isGenerating ? 'Running' : link.shortName}
                    </span>
                    {/* Pulsing dot for generating */}
                    {isGenerateLink && isGenerating && !isActive && (
                      <span className="absolute top-0 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
