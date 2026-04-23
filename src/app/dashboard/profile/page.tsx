"use client";

import { useState } from "react";
import { useMockStore } from "@/store/useMockStore";
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
  const user = useMockStore((state) => state.user);
  const setApiKey = useMockStore((state) => state.setApiKey);
  
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof apiKeySchema>>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: user?.apiKey || "",
    },
  });

  if (!user) return null;

  // Masking logic for the default view
  const displayKey = user.apiKey 
    ? `sk-${'*'.repeat(user.apiKey.length - 7)}${user.apiKey.slice(-4)}`
    : "";

  async function onSave(values: z.infer<typeof apiKeySchema>) {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setApiKey(values.apiKey);
    toast.success("API Key saved successfully.");
    setIsSaving(false);
  }

  async function onTest() {
    const keyToTest = form.getValues().apiKey;
    if (!keyToTest) {
      toast.error("Please enter an API key to test.");
      return;
    }
    
    setIsTesting(true);
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Dummy validation
    if (keyToTest.length > 10) {
      toast.success("Connection successful! API key is valid.");
    } else {
      toast.error("Connection failed. Invalid API key format.");
    }
    setIsTesting(false);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and API keys.</p>
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
              value={user.email} 
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
                          placeholder={user.apiKey ? displayKey : "Enter your Freepik API Key"} 
                          className="pr-10 bg-background/50 font-mono"
                          type="password"
                          {...field}
                        />
                        {user.apiKey && field.value === user.apiKey && (
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
