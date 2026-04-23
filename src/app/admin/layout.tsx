"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMockStore } from "@/store/useMockStore";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  LogOut,
  ShieldAlert
} from "lucide-react";
import { motion } from "framer-motion";

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Create User", href: "/admin/create-user", icon: UserPlus },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useMockStore((state) => state.user);
  const logout = useMockStore((state) => state.logout);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push("/ammarbilal/login");
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card/20 backdrop-blur-xl flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border/50 gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <Link href="/admin" className="font-bold text-lg tracking-tight">
            Admin <span className="text-muted-foreground">Panel</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {adminLinks.map((link) => {
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
              <span className="text-muted-foreground">Admin: </span>
              <span className="font-medium text-foreground">{user.email}</span>
            </div>
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
