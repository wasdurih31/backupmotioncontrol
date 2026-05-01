"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, RefreshCw, Save, UserPlus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const createUserSchema = z.object({
  identifier: z.string().min(3, "Email/No HP is required"),
  accessCode: z.string().min(3, "Access Code minimal 3 karakter"),
  subscriptionStart: z.string().optional(),
  subscriptionEnd: z.string().optional(),
});

export default function CreateUserPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      identifier: "",
      accessCode: "",
      subscriptionStart: new Date().toISOString().split('T')[0],
      subscriptionEnd: "",
    },
  });

  const generateAccessCode = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'KEY-';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    form.setValue('accessCode', result, { shouldValidate: true });
    setIsGenerating(false);
  };

  async function onSubmit(values: z.infer<typeof createUserSchema>) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        toast.success(`User ${values.identifier} created successfully!`);
        router.push("/admin/users");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create user");
      }
    } catch (error) {
      toast.error("An error occurred while creating user");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8 mx-auto pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create New User</h1>
        <p className="text-muted-foreground">Provision access and set subscription periods.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-blue-400" />
                User Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="user@example.com or +628..." className="bg-background/50 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end gap-3">
                <FormField
                  control={form.control}
                  name="accessCode"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Access Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Custom Code or Generate..." className="bg-background/50 uppercase font-mono h-11" maxLength={20} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" onClick={generateAccessCode} disabled={isGenerating} className="h-11 border-border/50 bg-white/5 hover:bg-white/10">
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-amber-400" />
                Subscription Period
              </CardTitle>
              <CardDescription>Leave end date empty for unlimited access.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="subscriptionStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background/50 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subscriptionEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date (End)</FormLabel>
                    <FormControl>
                      <Input type="date" className="bg-background/50 h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/users")}>Cancel</Button>
            <Button type="submit" disabled={isSaving} className="bg-white text-black hover:bg-white/90 px-10 h-11 font-bold">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              CREATE USER
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
