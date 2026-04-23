"use client";

import { useState } from "react";
import { Search, MoreHorizontal, Edit, Eye, UserX } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data
const dummyUsers = [
  { id: "USR-0001", email: "admin@universeai.com", accessCode: "KEY-1234", totalGenerate: 125, lastLogin: "2026-04-23 18:20", createdDate: "2026-01-10" },
  { id: "USR-0002", email: "user@example.com", accessCode: "KEY-1234", totalGenerate: 42, lastLogin: "2026-04-23 15:45", createdDate: "2026-02-15" },
  { id: "USR-0003", email: "john@creative.com", accessCode: "KEY-A82K", totalGenerate: 8, lastLogin: "2026-04-22 09:12", createdDate: "2026-03-01" },
  { id: "USR-0004", email: "sarah@studio.io", accessCode: "KEY-XP9Q", totalGenerate: 156, lastLogin: "2026-04-23 10:30", createdDate: "2026-01-20" },
  { id: "USR-0005", email: "mike@agency.co", accessCode: "KEY-M4TZ", totalGenerate: 0, lastLogin: "Never", createdDate: "2026-04-20" },
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = dummyUsers.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.accessCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Users Management</h1>
          <p className="text-muted-foreground">Manage users, access codes, and permissions.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, email, or access code..." 
            className="pl-10 bg-card/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/20 overflow-hidden backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-card/40">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>User ID</TableHead>
              <TableHead>Email / No HP</TableHead>
              <TableHead>Access Code</TableHead>
              <TableHead className="text-right">Generations</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow className="border-border/50 hover:bg-white/5">
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No users found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-border/50 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono text-sm">{user.id}</TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell className="font-mono text-sm uppercase">{user.accessCode}</TableCell>
                  <TableCell className="text-right font-medium">{user.totalGenerate}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.lastLogin}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{user.createdDate}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-border/50">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem className="text-red-500 cursor-pointer focus:text-red-500">
                          <UserX className="w-4 h-4 mr-2" /> Deactivate Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
