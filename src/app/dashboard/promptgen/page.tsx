"use client";

import Link from "next/link";
import { Sparkles, Film, ShoppingBag, Lock, Clapperboard, Tv, Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const activeMenus = [
  {
    title: "Storyboard UGC",
    description: "Generate storyboard prompt untuk affiliate content. Multi-scene, duration-aware, character consistent.",
    href: "/dashboard/promptgen/storyboardugc",
    icon: Film,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  {
    title: "UGC Affiliate",
    description: "Generate 4 variasi prompt gambar + video prompt untuk single-shot affiliate content.",
    href: "/dashboard/promptgen/ugcaffiliate",
    icon: ShoppingBag,
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/20",
  },
];

const lockedMenus = [
  { title: "Storyboard Film", icon: Clapperboard },
  { title: "Storyboard Animation", icon: Sparkles },
  { title: "Storyboard Ads TV", icon: Tv },
  { title: "Cinematic Multi Shot", icon: Camera },
];

export default function PromptGenPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-blue-400" />
          Prompt Generator Suite
        </h1>
        <p className="text-muted-foreground">
          Generate prompt AI untuk affiliate content, storyboard, dan UGC — tanpa perlu paham prompt engineering.
        </p>
      </div>

      {/* Active Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeMenus.map((menu) => (
          <Link key={menu.title} href={menu.href}>
            <Card className={`h-full border ${menu.bgColor} hover:bg-white/5 transition-all cursor-pointer group`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <menu.icon className={`w-6 h-6 ${menu.color}`} />
                  {menu.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{menu.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Locked / Coming Soon */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Coming Soon</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {lockedMenus.map((menu) => (
            <div
              key={menu.title}
              className="rounded-xl border border-border/30 bg-card/10 p-4 flex flex-col items-center gap-2 opacity-40 cursor-not-allowed"
            >
              <div className="relative">
                <menu.icon className="w-6 h-6 text-muted-foreground" />
                <Lock className="w-3 h-3 text-muted-foreground absolute -bottom-1 -right-1" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground text-center">{menu.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
