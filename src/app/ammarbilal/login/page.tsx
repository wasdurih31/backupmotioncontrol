"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useMockStore } from "@/store/useMockStore";

const adminLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const adminLogin = useMockStore((state) => state.adminLogin);

  const form = useForm<z.infer<typeof adminLoginSchema>>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof adminLoginSchema>) {
    setIsLoading(true);
    
    try {
      const success = await adminLogin(values.username, values.password);
      
      if (success) {
        toast.success("Admin login successful!");
        router.push("/admin");
      } else {
        toast.error("Invalid username or password.");
      }
    } catch (error) {
      toast.error("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 relative">
      {/* Dark Red glow for admin */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-900/10 blur-[120px] rounded-full pointer-events-none" />

      <Link href="/" className="absolute top-8 left-8 text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors z-10">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-red-500/10 p-3 rounded-full mb-4 border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Portal</h1>
          <p className="text-muted-foreground">Restricted access area.</p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" className="h-12 bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" className="h-12 bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-base bg-white text-black hover:bg-white/90" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
