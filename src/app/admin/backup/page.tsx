"use client";

import { useState, useRef } from "react";
import { Download, UploadCloud, Database, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Create an invisible anchor to download the file directly from the API endpoint
      const response = await fetch("/api/admin/backup/export");
      if (!response.ok) throw new Error("Failed to export data");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Get filename from header or fallback
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `users_backup_${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) filename = match[1];
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Database exported successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to export database");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file format. Please upload a JSON file.");
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading("Reading file...");

    try {
      const text = await file.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid JSON structure in file.");
      }

      toast.loading("Importing to database...", { id: toastId });
      
      const res = await fetch("/api/admin/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonData),
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || "Failed to import data");
      }

      toast.success(result.message || "Database imported successfully!", { id: toastId });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error.message || "An error occurred during import.", { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Database Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">
          Export user data to migrate to a new provider, or import an existing backup.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <Card className="bg-card/30 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              Export Users
            </CardTitle>
            <CardDescription>
              Download all user data as a JSON file. User IDs are excluded to allow fresh ID generation upon restore.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200/80">
                Data included: <span className="font-medium text-white">Email, Phone, Access Code, Role, Active Status, Subscription Dates</span>.
              </div>
            </div>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Exporting..." : "Download Backup (JSON)"}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="bg-card/30 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-500" />
              Restore / Import Users
            </CardTitle>
            <CardDescription>
              Upload a previously exported JSON file to migrate users into this database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200/80">
                New unique IDs will be automatically generated. Users with an existing Email or Access Code in the current database will be <span className="font-bold text-white">skipped</span>.
              </div>
            </div>
            
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImport}
            />
            
            <Button 
              variant="outline"
              onClick={() => fileInputRef.current?.click()} 
              disabled={isImporting}
              className="w-full border-green-500/30 hover:bg-green-500/10 text-green-400 gap-2"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isImporting ? "Importing..." : "Upload Backup File"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
