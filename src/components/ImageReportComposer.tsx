import { useRef, useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { analyzeAnimalImage } from "@/lib/animal-aid.server";

type Props = { description: string; onDescriptionChange: (value: string) => void; email: string; onEmailChange: (value: string) => void };

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageReportComposer({ description, onDescriptionChange, email, onEmailChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>();

  const analyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(undefined);
    try {
      const imageBase64 = await fileToBase64(file);
      const result = await analyzeAnimalImage({ data: { imageBase64, mimeType: file.type } });
      onDescriptionChange(result.description);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Image analysis could not be completed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Share the situation</h2>
          <p className="mt-1 text-sm text-muted-foreground">A photo can help create a concise handoff for a nearby person or care center.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-primary hover:bg-accent" aria-label="Add a photo">
          <Camera className="size-4" />
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => setFile(event.target.files?.[0])} />
      {file && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-xs"><span className="truncate">{file.name}</span><button type="button" onClick={analyze} disabled={isAnalyzing} className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-primary disabled:opacity-50"><Sparkles className="size-3.5" /> {isAnalyzing ? "Analyzing" : "Analyze photo"}</button></div>}
      <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="animal-description">Description</label>
      <textarea id="animal-description" value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="What happened, and what can you see?" className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="reply-email">Your email for replies</label>
      <input id="reply-email" type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="you@example.com" className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {error && <p className="mt-2 text-xs text-full">{error}</p>}
    </section>
  );
}
