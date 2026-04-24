"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ExternalLink, Calendar, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TutorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [tutorial, setTutorial] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTutorial() {
      try {
        const res = await fetch(`/api/tutorials/${slug}`);
        const data = await res.json();
        
        if (res.ok && data.data) {
          setTutorial(data.data);
        } else {
          setError("Tutorial not found");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load tutorial");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (slug) fetchTutorial();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card/20 rounded-2xl border border-border/50 backdrop-blur-sm max-w-3xl mx-auto mt-12">
        <BookOpen className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Tutorial Not Found</h2>
        <p className="text-muted-foreground mb-6 text-center">{error || "The tutorial you are looking for does not exist."}</p>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 bg-primary/10 text-primary px-6 py-2 rounded-lg hover:bg-primary/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tutorials
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            {tutorial.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(tutorial.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>

        <div className="bg-card/30 backdrop-blur-md rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
          {/* MEDIA HERO */}
          {tutorial.mediaUrl && (
            <div className="w-full bg-black">
              {tutorial.mediaType === 'video' ? (
                <video 
                  src={tutorial.mediaUrl} 
                  className="w-full max-h-[60vh] object-contain bg-black"
                  controls
                  playsInline
                />
              ) : (
                <img 
                  src={tutorial.mediaUrl} 
                  alt={tutorial.title}
                  className="w-full max-h-[60vh] object-cover"
                />
              )}
            </div>
          )}

          {/* CONTENT */}
          <div className="p-6 md:p-10 space-y-8">
            {tutorial.content && (
              <div className="prose prose-invert prose-blue max-w-none">
                {tutorial.content.split('\n').map((paragraph: string, idx: number) => {
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  const parts = paragraph.split(urlRegex);
                  return (
                    <p key={idx} className="text-white/80 leading-relaxed whitespace-pre-wrap">
                      {parts.map((part, i) => 
                        part.match(urlRegex) ? (
                          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-medium">
                            {part}
                          </a>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                })}
              </div>
            )}

            {tutorial.link && (
              <div className="pt-8 mt-8 border-t border-border/30">
                <a 
                  href={tutorial.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity px-6 py-3 rounded-xl font-medium w-full sm:w-auto shadow-lg shadow-primary/20"
                >
                  <ExternalLink className="w-5 h-5" />
                  Buka Tautan Terkait
                </a>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
