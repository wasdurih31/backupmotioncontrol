"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, RefreshCw, Save, UserPlus } from "lucide-react";
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
  accessCode: z.string().regex(/^KEY-[A-Z0-9]{4}$/, "Access Code must match KEY-XXXX format"),
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
    },
  });

  const generateAccessCode = async () => {
    setIsGenerating(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'KEY-';
    for (let i = 0; i < 4; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    form.setValue('accessCode', result, { shouldValidate: true });
    setIsGenerating(false);
  };

  async function onSubmit(values: z.infer<typeof createUserSchema>) {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast.success(`User ${values.identifier} created successfully!`);
    router.push("/admin/users");
  }

  return (
    <div className="max-w-2xl space-y-8 mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create New User</h1>
        <p className="text-muted-foreground">Provision access for a new user in the system.</p>
      </div>

      <Card className="bg-card/30 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            User Details
          </CardTitle>
          <CardDescription>Enter the user contact info and assign an access code.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email or Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="user@example.com or +628123456789" 
                        className="bg-background/50 h-11"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t border-border/50 pt-6 mt-6">
                <div className="flex items-end gap-4">
                  <FormField
                    control={form.control}
                    name="accessCode"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Access Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="KEY-XXXX" 
                            className="bg-background/50 uppercase font-mono h-11"
                            maxLength={8}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Must be exactly 4 uppercase alphanumeric characters after the "KEY-" prefix.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generateAccessCode}
                    disabled={isGenerating}
                    className="h-11 border-border/50 hover:bg-white/5 mb-8"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Generate Code
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => router.push("/admin/users")}
                  className="mr-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-white text-black hover:bg-white/90 px-8"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save User
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
