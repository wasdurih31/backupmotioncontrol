"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Play, ExternalLink, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function TutorialPage() {
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTutorials() {
      try {
        const res = await fetch("/api/tutorials");
        const data = await res.json();
        if (data.data) {
          setTutorials(data.data);
        }
      } catch (e) {
        console.error("Failed to fetch tutorials", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTutorials();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Tutorials & Guides
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Learn how to get the most out of UniverseAI Motion Control. Watch our guides, read the documentation, and discover tips and tricks.
        </p>
      </div>

      {tutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card/20 rounded-2xl border border-border/50 backdrop-blur-sm">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground font-medium">No tutorials available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((tutorial, index) => (
            <Link key={tutorial.id} href={`/dashboard/tutorial/${tutorial.slug || tutorial.id}`} className="block group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex flex-col bg-card/30 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-primary/5 h-full"
              >
              {/* MEDIA SECTION */}
              <div className="relative aspect-video bg-black/50 overflow-hidden flex-shrink-0">
                {tutorial.mediaUrl ? (
                  tutorial.mediaType === 'video' ? (
                    <video 
                      src={tutorial.mediaUrl} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={tutorial.mediaUrl} 
                      alt={tutorial.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-transparent">
                    <BookOpen className="w-12 h-12 text-white/20" />
                  </div>
                )}
                
                {tutorial.mediaType === 'video' && !tutorial.mediaUrl && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                     <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-primary/50 transition-colors">
                        <Play className="w-5 h-5 text-white ml-1" />
                     </div>
                   </div>
                )}
              </div>

              {/* CONTENT SECTION */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {tutorial.title}
                  </h3>
                </div>
                
                {tutorial.content && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                    {tutorial.content}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(tutorial.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  
                  {tutorial.link && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(tutorial.link, '_blank', 'noopener,noreferrer');
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-3 py-1.5 rounded-full z-10 relative cursor-pointer"
                    >
                      Open Link <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
