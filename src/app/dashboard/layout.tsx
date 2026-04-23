"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMockStore } from "@/store/useMockStore";
import { 
  LayoutDashboard, 
  Video, 
  ListTodo, 
  Settings, 
  LogOut,
  Key as KeyIcon,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";

const sidebarLinks = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Generate Video", href: "/dashboard/generate", icon: Video },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Profile Settings", href: "/dashboard/profile", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useMockStore((state) => state.user);
  const logout = useMockStore((state) => state.logout);
  const generateCount = useMockStore((state) => state.generateCount);

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/20 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/dashboard" className="font-bold text-lg tracking-tight">
            UniverseAI <span className="text-muted-foreground">MC</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {sidebarLinks.map((link) => {
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

        <div className="p-4 border-t border-border/50">
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-sm flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">User: </span>
              <span className="font-medium text-foreground">{user.email}</span>
            </div>
            <div className="h-4 w-px bg-border"></div>
            <div className="text-sm">
              <span className="text-muted-foreground">Role: </span>
              <span className="font-medium text-foreground capitalize">{user.role}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm bg-card border border-border rounded-full px-4 py-1.5 shadow-sm">
              <Video className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{generateCount}</span>
              <span className="text-muted-foreground">Generations</span>
            </div>
            
            <Link href="/dashboard/profile">
              <div className={`flex items-center gap-2 text-sm border rounded-full px-4 py-1.5 shadow-sm cursor-pointer transition-colors ${user.apiKey ? 'bg-white/5 border-green-500/30 text-green-400 hover:bg-green-500/10' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'}`}>
                {user.apiKey ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                <span className="font-medium">
                  {user.apiKey ? 'API Key Active' : 'API Key Missing'}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
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
    </div>
  );
}
