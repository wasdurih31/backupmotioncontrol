"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  LogOut,
  ShieldAlert,
  Loader2,
  Activity,
  Menu,
  X,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const adminLinks = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Create User", href: "/admin/create-user", icon: UserPlus },
  { name: "Live Activity", href: "/admin/activity", icon: Activity },
  { name: "Tutorials", href: "/admin/tutorials", icon: BookOpen },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Store last visited admin page (excluding base /admin) for refresh navigation
  useEffect(() => {
    if (pathname && pathname !== '/admin') {
      sessionStorage.setItem('lastAdminPath', pathname);
    }
  }, [pathname]);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'admin') {
            setIsAdmin(true);
            // After confirming admin, redirect to last visited page if on base /admin
            if (pathname === '/admin') {
              const last = sessionStorage.getItem('lastAdminPath');
              if (last) {
                router.replace(last);
                return; // skip further rendering until navigation
              }
            }
          } else {
            router.push("/ammarbilal/login");
          }
        } else {
          router.push("/ammarbilal/login");
        }
      } catch {
        router.push("/ammarbilal/login");
      } finally {
        setIsLoading(false);
      }
    }
    checkAdmin();
  }, [router, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push("/");
    } catch (e) {
      console.error(e);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-border/50 gap-2">
        <ShieldAlert className="w-5 h-5 text-red-500" />
        <Link href="/admin" className="font-bold text-lg tracking-tight text-foreground">
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
                    ? "bg-primary/10 text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border/50 bg-card/20 backdrop-blur-xl flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border/50 z-[51] flex flex-col lg:hidden"
            >
              <SidebarContent />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm hidden sm:block">
              <span className="text-muted-foreground">Admin: </span>
              <span className="font-medium text-foreground">ammarbilal</span>
            </div>
            <div className="sm:hidden font-bold text-sm">
               Admin Panel
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Action buttons could go here */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
