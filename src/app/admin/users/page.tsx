"use client";

import { useState, useEffect } from "react";
import { Search, MoreHorizontal, Edit, Eye, EyeOff, UserX, Loader2, UserCheck, Trash2, Calendar, ShieldCheck, ShieldAlert, X, Save, ArrowUpDown, ArrowUp, ArrowDown, Activity, CheckCircle2, XCircle, Key } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  email: string | null;
  phone: string | null;
  accessCode: string;
  apiKey: string | null;
  role: string;
  totalGenerate: number;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
}

type SortField = "expiry" | "generations" | "none";
type SortOrder = "asc" | "desc";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting State
  const [sortBy, setSortBy] = useState<SortField>("none");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Activity Modal State
  const [viewingActivity, setViewingActivity] = useState<User | null>(null);
  const [activityStats, setActivityStats] = useState<{ success: number; failed: number } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const [showFullAccessCodeModal, setShowFullAccessCodeModal] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  const toggleCodeVisibility = (id: string) => {
    const newVisibleCodes = new Set(visibleCodes);
    if (newVisibleCodes.has(id)) {
      newVisibleCodes.delete(id);
    } else {
      newVisibleCodes.add(id);
    }
    setVisibleCodes(newVisibleCodes);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      toast.error("An error occurred while fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditStart(user.subscriptionStart ? user.subscriptionStart.split('T')[0] : "");
    setEditEnd(user.subscriptionEnd ? user.subscriptionEnd.split('T')[0] : "");
  };

  const handleUpdateSubscription = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editingUser.id, 
          subscriptionStart: editStart || null, 
          subscriptionEnd: editEnd || null 
        }),
      });
      if (res.ok) {
        toast.success("Subscription updated successfully");
        setEditingUser(null);
        fetchUsers();
      } else {
        toast.error("Failed to update subscription");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (res.ok) {
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      }
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("User deleted permanently");
        fetchUsers();
      }
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const openActivityModal = async (user: User) => {
    setViewingActivity(user);
    setIsLoadingStats(true);
    setActivityStats(null);
    setShowFullApiKey(false);
    setShowFullAccessCodeModal(false);
    
    try {
      const res = await fetch(`/api/admin/users/stats?id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setActivityStats(data.stats);
        // Refresh the user data in the modal from the stats API response
        if (data.user) {
          setViewingActivity(data.user);
        }
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getExpiryStatus = (end: string | null) => {
    if (!end) return { label: "Unlimited", color: "text-green-400", days: 999999 };
    const expiry = new Date(end);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));

    if (expiry < now) return { label: "EXPIRED", color: "text-red-500 font-bold", days };
    if (days <= 7) return { label: `${days}d left`, color: "text-amber-500", days };
    return { label: `${days}d left`, color: "text-blue-400", days };
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "none") return 0;
    
    if (sortBy === "generations") {
      return sortOrder === "desc" ? b.totalGenerate - a.totalGenerate : a.totalGenerate - b.totalGenerate;
    }
    
    if (sortBy === "expiry") {
      const statusA = getExpiryStatus(a.subscriptionEnd);
      const statusB = getExpiryStatus(b.subscriptionEnd);
      return sortOrder === "desc" ? statusB.days - statusA.days : statusA.days - statusB.days;
    }
    
    return 0;
  });

  const filteredUsers = sortedUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (user.email?.toLowerCase().includes(searchLower) || 
            user.phone?.toLowerCase().includes(searchLower) || 
            user.id.toLowerCase().includes(searchLower) || 
            user.accessCode.toLowerCase().includes(searchLower));
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Synchronizing database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Users Management</h1>
          <p className="text-muted-foreground">Manage subscriptions, bans, and access controls.</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading} className="gap-2 border-border/50 bg-card/30">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card/20 border border-border/50 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3 mb-2 text-green-400">
            <UserCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Active Users</span>
          </div>
          <p className="text-3xl font-bold">{users.filter(u => u.isActive && (getExpiryStatus(u.subscriptionEnd).label !== "EXPIRED")).length}</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Authorized to generate videos</p>
        </div>

        <div className="bg-card/20 border border-border/50 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3 mb-2 text-amber-500">
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Expired Accounts</span>
          </div>
          <p className="text-3xl font-bold">{users.filter(u => u.isActive && getExpiryStatus(u.subscriptionEnd).label === "EXPIRED").length}</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Subscription period ended</p>
        </div>

        <div className="bg-card/20 border border-border/50 p-5 rounded-2xl backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-3 mb-2 text-red-500">
            <UserX className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Banned Users</span>
          </div>
          <p className="text-3xl font-bold">{users.filter(u => !u.isActive).length}</p>
          <p className="text-[10px] text-muted-foreground mt-1 italic">Access manually restricted</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            placeholder="Search users..." 
            className="w-full pl-10 h-11 rounded-xl border border-border/50 bg-card/20 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/10 overflow-x-auto backdrop-blur-xl shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-32">User ID</TableHead>
              <TableHead>Account Info</TableHead>
              <TableHead>Access Code</TableHead>
              <TableHead className="cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort("expiry")}>
                <div className="flex items-center gap-1">
                  Masa Aktif
                  {sortBy === "expiry" ? (sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />) : <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => handleSort("generations")}>
                <div className="flex items-center justify-end gap-1">
                  Usage
                  {sortBy === "generations" ? (sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />) : <ArrowUpDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow className="border-border/50">
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                  {searchQuery ? "No matching users found." : "Database is empty."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const status = getExpiryStatus(user.subscriptionEnd);
                return (
                  <TableRow key={user.id} className={`border-border/50 hover:bg-white/5 transition-colors ${!user.isActive ? 'bg-red-500/5' : ''}`}>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{user.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user.email || user.phone}</span>
                          {!user.isActive && <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">BANNED</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">Registered: {user.createdAt.split('T')[0]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase bg-white/5 border border-white/10 px-2 py-1 rounded-lg shadow-inner min-w-[100px] text-center">
                          {visibleCodes.has(user.id) ? user.accessCode : "********"}
                        </span>
                        <button 
                          onClick={() => toggleCodeVisibility(user.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-blue-400"
                          title={visibleCodes.has(user.id) ? "Hide Code" : "Show Code"}
                        >
                          {visibleCodes.has(user.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                        {user.subscriptionEnd && <span className="text-[10px] text-muted-foreground italic">Until: {user.subscriptionEnd.split('T')[0]}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-blue-400">{user.totalGenerate}</span>
                        <span className="text-[9px] text-muted-foreground uppercase">Generations</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white outline-none">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-border/50 w-56 p-1.5 shadow-2xl">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground px-2 py-1.5">User Control</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openActivityModal(user)} className="cursor-pointer gap-2 rounded-lg py-2">
                              <Activity className="w-4 h-4 text-blue-400" /> View Activity
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(user)} className="cursor-pointer gap-2 rounded-lg py-2">
                              <Calendar className="w-4 h-4 text-amber-400" /> Modify Expiry
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/50 mx-1" />
                            <DropdownMenuItem 
                              onClick={() => toggleStatus(user.id, user.isActive)}
                              className={`cursor-pointer gap-2 rounded-lg py-2 ${user.isActive ? 'text-orange-400 focus:text-orange-400 focus:bg-orange-400/10' : 'text-green-400 focus:text-green-400 focus:bg-green-400/10'}`}
                            >
                              {user.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                              {user.isActive ? "Ban / Deactivate" : "Unban Account"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteUser(user.id)}
                              className="text-red-500 cursor-pointer gap-2 rounded-lg py-2 focus:text-red-500 focus:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Permanently
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingActivity} onOpenChange={(open) => !open && setViewingActivity(null)}>
        <DialogContent className="bg-[#0b0b0d] border-white/5 w-[95vw] !max-w-[800px] sm:max-w-[800px] rounded-[40px] shadow-[0_0_100px_-20px_rgba(0,0,0,0.9)] p-0 overflow-hidden outline-none ring-0">
          <div className="relative max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
            <div className="relative p-6 md:p-12 space-y-12">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-[#1a1a20] rounded-[22px] border border-white/5 flex items-center justify-center shadow-2xl shrink-0">
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight text-white font-serif">User Activity</DialogTitle>
                    <DialogDescription className="text-blue-500/60 text-xs md:text-sm font-semibold tracking-wide">
                      Performance for <span className="text-blue-400">@{viewingActivity?.email?.split('@')[0] || viewingActivity?.phone}</span>
                    </DialogDescription>
                  </div>
                </div>
                <button onClick={() => setViewingActivity(null)} className="w-12 h-12 shrink-0 bg-white/5 hover:bg-white/10 rounded-2xl transition-all duration-300 flex items-center justify-center text-white/20 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                <div className="space-y-8 md:space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-1"><Key className="w-4 h-4 text-blue-500/40" /><Label className="text-[11px] uppercase font-black text-white/20 tracking-[0.4em]">Access Credentials</Label></div>
                    <div className="bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-[32px] space-y-8 md:space-y-10 backdrop-blur-xl">
                      <div className="space-y-4 md:space-y-5">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Access Code</span><div className="flex items-center gap-3"><button onClick={() => setShowFullAccessCodeModal(!showFullAccessCodeModal)} className="text-white/10 hover:text-blue-400 transition-colors">{showFullAccessCodeModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button><button onClick={() => viewingActivity && copyToClipboard(viewingActivity.accessCode, "Code")} className="text-white/10 hover:text-blue-400 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button></div></div>
                        <div className="bg-black/60 border border-white/5 px-4 md:px-6 py-4 md:py-5 rounded-2xl flex items-center justify-center"><span className="font-mono text-base md:text-lg tracking-[0.5em] text-white/90">{showFullAccessCodeModal ? viewingActivity?.accessCode : "••••••"}</span></div>
                      </div>
                      <div className="space-y-4 md:space-y-5">
                        <div className="flex items-center justify-between"><span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Freepik API Key</span><div className="flex items-center gap-3"><button onClick={() => setShowFullApiKey(!showFullApiKey)} className="text-white/10 hover:text-blue-400 transition-colors">{showFullApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button><button onClick={() => viewingActivity?.apiKey && copyToClipboard(viewingActivity.apiKey, "Key")} className="text-white/10 hover:text-blue-400 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button></div></div>
                        <div className="bg-black/60 border border-white/5 px-4 md:px-6 py-4 md:py-5 rounded-2xl min-h-[70px] flex items-center justify-center text-center"><span className="font-mono text-[10px] md:text-[11px] text-white/40 break-all leading-relaxed">{viewingActivity?.apiKey ? (showFullApiKey ? viewingActivity.apiKey : viewingActivity.apiKey.substring(0, 10) + "••••••••") : "No API Key Provided"}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 p-6 md:p-8 rounded-[32px] flex items-center gap-4 md:gap-6">
                    <div className="relative"><div className={`w-4 h-4 md:w-5 md:h-5 rounded-full ${viewingActivity?.isActive ? 'bg-green-500 shadow-[0_0_25px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]'}`} />{viewingActivity?.isActive && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />}</div>
                    <div className="flex-1"><p className="text-xl md:text-2xl font-bold text-white tracking-tight">Active Member</p><p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em] mt-1">Status</p></div>
                    <div className="text-right"><p className="text-sm md:text-base font-mono text-white/60">{viewingActivity?.subscriptionEnd ? new Date(viewingActivity.subscriptionEnd).toLocaleDateString() : "Lifetime"}</p><p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em] mt-1">Valid Thru</p></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1"><Activity className="w-4 h-4 text-blue-500/40" /><Label className="text-[11px] uppercase font-black text-white/20 tracking-[0.4em]">Generation Insights</Label></div>
                  <div className="grid grid-cols-2 gap-4 md:gap-5">
                    <div className="bg-white/[0.03] border border-white/5 p-6 md:p-10 rounded-[28px] md:rounded-[36px] flex flex-col items-center justify-center space-y-2 md:space-y-3 group hover:bg-white/[0.05] transition-all"><p className="text-5xl md:text-6xl font-bold text-white tracking-tighter">{(activityStats?.success || 0) + (activityStats?.failed || 0)}</p><div className="text-center"><p className="text-[10px] md:text-[11px] uppercase font-bold text-white/20 tracking-[0.2em]">Total</p><p className="text-[10px] md:text-[11px] uppercase font-bold text-white/20 tracking-[0.2em] -mt-1">Tasks</p></div></div>
                    <div className="bg-green-500/[0.03] border border-green-500/10 p-6 md:p-10 rounded-[28px] md:rounded-[36px] flex flex-col items-center justify-center space-y-2 md:space-y-3 group hover:bg-green-500/[0.05] transition-all"><p className="text-5xl md:text-6xl font-bold text-green-400 tracking-tighter">{activityStats?.success || 0}</p><p className="text-[10px] md:text-[11px] uppercase font-bold text-green-400/20 tracking-[0.2em]">Success</p></div>
                    <div className="bg-white/[0.03] border border-white/5 p-6 md:p-10 rounded-[32px] md:rounded-[48px] col-span-2 space-y-6 md:space-y-10 shadow-2xl">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1"><p className="text-5xl md:text-6xl font-bold text-red-500 tracking-tighter">{activityStats?.failed || 0}</p><div className="space-y-0"><p className="text-[10px] md:text-[11px] uppercase font-bold text-red-500/20 tracking-[0.2em]">Failed /</p><p className="text-[10px] md:text-[11px] uppercase font-bold text-red-500/20 tracking-[0.2em] -mt-1">Blocked</p></div></div>
                        <div className="text-right space-y-1"><p className="text-5xl md:text-6xl font-bold text-blue-400 tracking-tighter">{activityStats && (activityStats.success + activityStats.failed) > 0 ? Math.round((activityStats.success / (activityStats.success + activityStats.failed)) * 100) : 0}%</p><p className="text-[10px] md:text-[11px] uppercase font-bold text-blue-400/20 tracking-[0.2em]">Efficiency</p></div>
                      </div>
                      <div className="h-2 md:h-3 bg-black/60 rounded-full overflow-hidden p-1 border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${activityStats && (activityStats.success + activityStats.failed) > 0 ? (activityStats.success / (activityStats.success + activityStats.failed)) * 100 : 0}%` }} transition={{ duration: 1.5, ease: "circOut" }} className="h-full bg-gradient-to-r from-blue-600 to-blue-300 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.7)]" /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 md:pt-6"><Button onClick={() => setViewingActivity(null)} className="w-full h-14 md:h-16 bg-white/[0.04] hover:bg-white/10 border border-white/5 text-white/60 rounded-[20px] md:rounded-[28px] transition-all duration-500 font-black tracking-[0.5em] text-[10px] md:text-xs uppercase shadow-2xl">DISMISS</Button></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-2xl border-border/50 max-w-md rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Modify Subscription
            </DialogTitle>
            <DialogDescription>
              Set the active period for <span className="font-bold text-foreground">{editingUser?.email || editingUser?.phone}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-xs uppercase text-muted-foreground">Subscription Start</Label>
              <Input 
                id="start-date" 
                type="date" 
                value={editStart} 
                onChange={(e) => setEditStart(e.target.value)}
                className="bg-card/30 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-xs uppercase text-muted-foreground">Subscription Expiry (End)</Label>
              <Input 
                id="end-date" 
                type="date" 
                value={editEnd} 
                onChange={(e) => setEditEnd(e.target.value)}
                className="bg-card/30 h-11"
              />
              <p className="text-[10px] text-muted-foreground italic">Leave empty for unlimited access.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleUpdateSubscription} disabled={isUpdating} className="bg-white text-black hover:bg-white/90 gap-2">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
