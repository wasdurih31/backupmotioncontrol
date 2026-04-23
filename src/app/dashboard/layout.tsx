"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Video, 
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
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* --- DESKTOP TOP NAVIGATION --- */}
      <header className="hidden md:flex h-16 border-b border-border/50 bg-card/20 backdrop-blur-xl items-center justify-between px-8 z-50 shrink-0">
        <div className="flex items-center gap-12">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight shrink-0">
            UniverseAI <span className="text-muted-foreground">MC</span>
          </Link>
          
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link key={link.name} href={link.href} className="block">
                  <div
                    className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    <span className="font-medium text-sm">{link.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-border/50 pr-6 mr-6">
            <div className="flex items-center gap-2 text-sm bg-card/50 border border-border/50 rounded-full px-4 py-1.5 shadow-sm">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{user.totalGenerate || 0}</span>
              <span className="text-muted-foreground ml-1 hidden lg:inline">Generations</span>
            </div>
            
            <Link href="/dashboard/profile">
              <div className={`flex items-center gap-2 text-sm border rounded-full px-4 py-1.5 shadow-sm cursor-pointer transition-colors ${user.hasApiKey ? 'bg-green-500/5 border-green-500/30 text-green-400 hover:bg-green-500/10' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}>
                {user.hasApiKey ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span className="font-medium hidden lg:inline">
                  {user.hasApiKey ? 'API Key Active' : 'API Key Missing'}
                </span>
                <span className="font-medium lg:hidden">
                  {user.hasApiKey ? 'Active' : 'Missing'}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm hidden lg:block">
              <span className="text-muted-foreground">User: </span>
              <span className="font-medium text-foreground">{user.email || user.phone}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
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

      {/* --- PAGE CONTENT AREA --- */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pb-32 md:pb-12">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* ========== MOBILE BOTTOM NAV (hidden on desktop) ========== */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-50">
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
