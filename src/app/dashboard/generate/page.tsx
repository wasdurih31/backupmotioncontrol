"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { UploadCloud, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMockStore } from "@/store/useMockStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const generateSchema = z.object({
  prompt: z.string().max(2500, "Prompt cannot exceed 2500 characters").optional(),
  character_orientation: z.enum(["video", "image"]),
  cfg_scale: z.number().min(0).max(1),
});

export default function GenerateVideoPage() {
  const router = useRouter();
  const addTask = useMockStore((state) => state.addTask);
  const user = useMockStore((state) => state.user);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fake states for drag & drop UI
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof generateSchema>>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      prompt: "",
      character_orientation: "video",
      cfg_scale: 0.5,
    },
  });

  async function onSubmit(values: z.infer<typeof generateSchema>) {
    if (!user?.apiKey) {
      toast.error("API Key is missing. Please configure it in Profile Settings.");
      router.push("/dashboard/profile");
      return;
    }

    if (!videoFile || !imageFile) {
      toast.error("Both a reference video AND a character image are required.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    addTask({
      prompt: values.prompt || `Motion transfer from ${videoFile.name} to ${imageFile.name}`,
      characterOrientation: values.character_orientation,
      cfgScale: values.cfg_scale,
    });

    toast.success("Task added to queue successfully!");
    router.push("/dashboard/tasks");
  }

  const FileUploadZone = ({ type, file, setFile, accepts }: any) => (
    <div 
      className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 hover:border-white/20 transition-all bg-card/20"
      onClick={() => {
        // Dummy file selection for UI mock
        const el = document.createElement('input');
        el.type = 'file';
        el.accept = accepts;
        el.onchange = (e: any) => {
          if (e.target.files?.[0]) setFile(e.target.files[0]);
        };
        el.click();
      }}
    >
      {file ? (
        <>
          <CheckCircle className="h-10 w-10 text-green-500 mb-4" />
          <p className="font-medium text-foreground">{file.name}</p>
          <p className="text-sm text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </>
      ) : (
        <>
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="font-medium text-foreground">Click or drag {type} to upload <span className="text-red-500 ml-1">*</span></p>
          <p className="text-sm text-muted-foreground mt-1">Accepts: {accepts}</p>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Generate Motion Control Video</h1>
        <p className="text-muted-foreground">Model: Kling v2.6 Motion Control std</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <VideoIcon className="w-4 h-4" /> Reference Video (Motion) <span className="text-red-500">*</span>
              </label>
              <FileUploadZone 
                type="video" 
                file={videoFile} 
                setFile={setVideoFile} 
                accepts=".mp4,.mov,.webm,.m4v" 
              />
              <p className="text-xs text-muted-foreground">Required. Provides the motion pattern (3-30 seconds).</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Character Image <span className="text-red-500">*</span>
              </label>
              <FileUploadZone 
                type="image" 
                file={imageFile} 
                setFile={setImageFile} 
                accepts=".png,.jpg,.jpeg,.webp" 
              />
              <p className="text-xs text-muted-foreground">Required. The subject that will perform the motion.</p>
            </div>
          </div>

          <Card className="bg-card/30 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Generation Parameters</CardTitle>
              <CardDescription>Configure how your video will be generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you want to see in the video..." 
                        className="resize-none h-24 bg-background/50" 
                        maxLength={2500}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Optional text prompt to guide the motion transfer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="character_orientation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character Orientation</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select orientation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">Video (Max 30s)</SelectItem>
                          <SelectItem value="image">Image (Max 10s)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the model interprets spatial information.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cfg_scale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CFG Scale</FormLabel>
                      <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            max="1" 
                            className="bg-background/50" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                      </FormControl>
                      <FormDescription>
                        0 to 1. Controls how closely the model follows the prompt.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg" 
              className="bg-white text-black hover:bg-white/90 font-medium px-8"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Queuing Task...
                </>
              ) : (
                "Generate Video"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Inline CheckCircle since I forgot to import it from lucide-react above
function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
