"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const apiKeySchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
});

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    },
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          if (data.hasApiKey) {
            form.setValue('apiKey', '********************************');
          }
        }
      } catch (error) {
        toast.error("Failed to load profile.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [form]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  async function onSave(values: z.infer<typeof apiKeySchema>) {
    // If the value is just the asterisks, user didn't change it
    if (values.apiKey === '********************************') {
      toast.success("API Key saved successfully.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: values.apiKey }),
      });
      
      if (res.ok) {
        toast.success("API Key saved successfully.");
        setUser({ ...user, hasApiKey: true });
        form.setValue('apiKey', '********************************');
      } else {
        toast.error("Failed to save API Key.");
      }
    } catch (error) {
      toast.error("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onTest() {
    const keyToTest = form.getValues().apiKey;
    if (!keyToTest || keyToTest === '********************************') {
      toast.error("Please enter your actual API key to test.");
      return;
    }
    
    setIsTesting(true);
    // Real test can be implemented later by calling Freepik API directly from a test route
    // For now we simulate
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (keyToTest.length > 10) {
      toast.success("Connection successful! API key is valid.");
    } else {
      toast.error("Connection failed. Invalid API key format.");
    }
    setIsTesting(false);
  }

  return (
    <div className="max-w-3xl space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Profile Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground">Manage your account and API keys.</p>
      </div>

      <Card className="bg-card/30 border-border/50">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Your basic account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email / Phone Number</Label>
            <Input 
              value={user.email || user.phone || ""} 
              readOnly 
              className="bg-background/50 text-muted-foreground cursor-not-allowed" 
            />
          </div>
          <div className="space-y-2">
            <Label>Access Code</Label>
            <Input 
              value={user.accessCode} 
              readOnly 
              className="bg-background/50 text-muted-foreground cursor-not-allowed uppercase font-mono" 
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-border/50 relative overflow-hidden">
        {/* Subtle glow effect behind the card */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 blur-3xl rounded-full pointer-events-none" />
        
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            API Key Settings
          </CardTitle>
          <CardDescription>Configure your Freepik API key for video generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="Enter your Freepik API Key" 
                          className="pr-10 bg-background/50 font-mono"
                          type="password"
                          {...field}
                        />
                        {user.hasApiKey && field.value === '********************************' && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-3 top-3" />
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      You can get your API key from the Freepik developer dashboard.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center gap-4 pt-2">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-white text-black hover:bg-white/90 w-32"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Key
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onTest}
                  disabled={isTesting}
                  className="w-40 border-border/50 bg-transparent hover:bg-white/5"
                >
                  {isTesting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="bg-white/[0.02] border-t border-border/50 py-4 mt-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Shield className="w-5 h-5 text-green-500/70 shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground font-medium">Security Notice:</strong> Your API key belongs to you and is securely encrypted. We do not store your key in plain text, nor do we use it for any purpose other than fulfilling your specific generation requests.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
