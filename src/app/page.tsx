"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Key, Zap, Lock, Clock, Video } from "lucide-react";

const features = [
  { icon: Key, title: "BYOK System", description: "Use your own Freepik API Key. No markup." },
  { icon: Zap, title: "Fast Generation", description: "Optimized connection to Freepik endpoints." },
  { icon: Lock, title: "Private Workflow", description: "Your API keys and generated videos are secure." },
  { icon: Clock, title: "Temporary Storage", description: "Outputs auto-expire to ensure privacy." },
  { icon: Video, title: "Motion Control Model", description: "Kling v2.6 Motion Control standard." },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-1 w-full max-w-5xl px-6 flex flex-col items-center justify-center text-center z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm text-muted-foreground mb-4">
            <span className="flex h-2 w-2 rounded-full bg-white mr-2"></span>
            Kling v2.6 Integration
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground">
            UniverseAI <span className="text-muted-foreground">MC</span>
          </h1>
          <p className="text-2xl md:text-3xl font-medium text-foreground mt-2">
            Motion Control Video Generator
          </p>
          <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            Generate cinematic AI motion videos using your own Freepik API key.
            A premium, private, and fast workflow for professionals.
          </p>
          
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base bg-white text-black hover:bg-white/90 rounded-full">
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full border-border hover:bg-white/5">
              Learn More
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Use your own API key. No hidden markup.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-32 w-full"
        >
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="w-full py-6 text-center text-sm text-muted-foreground border-t border-border/50 mt-auto z-10">
        UniverseAI MC &copy; 2026
      </footer>
    </div>
  );
}
