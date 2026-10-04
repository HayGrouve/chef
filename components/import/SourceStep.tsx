"use client";

// Smart Import: pick a source (link, text or photo).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  ClipboardPaste,
  ExternalLink,
  ImageIcon,
  Link2,
  Sparkles,
  TextQuote,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, hasFinePointer } from "@/lib/utils";
import { EXAMPLE_CAPTION, hostname, looksLikeUrl, suggestsPastingText, type SourceKind } from "./lib";

export type SourceError = { kind: SourceKind; message: string };

type Props = {
  tab: SourceKind;
  onTabChange: (tab: SourceKind) => void;
  url: string;
  onUrlChange: (url: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  photo: { file: File; previewUrl: string } | null;
  onPhotoChange: (file: File | null) => void;
  /** Link the user couldn't import and is now pasting as text. */
  textContextUrl: string | null;
  onTextContextUrlChange: (url: string | null) => void;
  error: SourceError | null;
  /** Seconds until each AI import can run again. */
  cooldown: Record<SourceKind, number>;
  onImport: (kind: SourceKind) => void;
};

export function SourceStep(props: Props) {
  const { tab, onTabChange } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-xs md:p-6">
        <Tabs value={tab} onValueChange={(v) => onTabChange(v as SourceKind)}>
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="link" className="gap-1.5">
              <Link2 className="h-4 w-4" /> Link
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-1.5">
              <TextQuote className="h-4 w-4" /> Text
            </TabsTrigger>
            <TabsTrigger value="photo" className="gap-1.5">
              <Camera className="h-4 w-4" /> Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4">
            <LinkSource {...props} />
          </TabsContent>
          <TabsContent value="text" className="mt-4">
            <TextSource {...props} />
          </TabsContent>
          <TabsContent value="photo" className="mt-4">
            <PhotoSource {...props} />
          </TabsContent>
        </Tabs>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Nothing to import?{" "}
        <Link href="/create" className="font-medium text-foreground underline-offset-4 hover:underline">
          Type it manually
        </Link>
      </p>
    </div>
  );
}

// --- Link --------------------------------------------------------------------

/** Focus on mount, but only with a mouse: on phones it would pop the keyboard over the page. */
function useDesktopAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (hasFinePointer()) ref.current?.focus();
  }, []);
  return ref;
}

function LinkSource({ url, onUrlChange, onTextChange, onTabChange, onTextContextUrlChange, error, onImport }: Props) {
  const inputRef = useDesktopAutoFocus<HTMLInputElement>();
  const [empty, setEmpty] = useState(false);

  const pasteFromClipboard = async () => {
    try {
      const clip = (await navigator.clipboard.readText()).trim();
      if (!clip) return;
      if (looksLikeUrl(clip)) {
        onUrlChange(clip);
      } else if (clip.length > 40) {
        // Not a link, but it could be the recipe itself
        onTextChange(clip);
        onTabChange("text");
        toast("That looked like recipe text, so it’s in the Text tab.");
      } else {
        onUrlChange(clip);
      }
    } catch {
      // Clipboard permission denied or unsupported: the input still works
    }
  };

  const linkError = error?.kind === "link" ? error : null;
  const canPasteText = linkError && suggestsPastingText(linkError.message) && url.trim();

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) return onImport("link");
        setEmpty(true);
        inputRef.current?.focus();
      }}
    >
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          type="url"
          inputMode="url"
          name="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setEmpty(false);
            onUrlChange(e.target.value);
          }}
          placeholder="https://…"
          aria-label="Recipe link"
          aria-invalid={empty || undefined}
          aria-describedby={empty ? "link-empty" : undefined}
          className="h-10"
        />
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={pasteFromClipboard}
          aria-label="Paste link"
        >
          <ClipboardPaste className="h-4 w-4" />
          <span className="hidden sm:inline">Paste</span>
        </Button>
      </div>
      {empty && (
        <p id="link-empty" className="text-sm text-destructive">
          Paste a link to a recipe first.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Works with most recipe sites. Instagram and TikTok links work when the caption has the recipe.
      </p>

      {linkError && (
        <ErrorCallout message={linkError.message}>
          {canPasteText && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onTextContextUrlChange(url.trim());
                onTabChange("text");
              }}
            >
              <TextQuote className="h-4 w-4" /> Paste the text instead
            </Button>
          )}
        </ErrorCallout>
      )}

      <Button type="submit" className="w-full">
        Import <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

// --- Text --------------------------------------------------------------------

function TextSource({ text, onTextChange, textContextUrl, onTextContextUrlChange, error, cooldown, onImport }: Props) {
  const wait = cooldown.text;
  const textError = error?.kind === "text" ? error : null;
  const textareaRef = useDesktopAutoFocus<HTMLTextAreaElement>();
  const [empty, setEmpty] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (wait) return;
        if (text.trim()) return onImport("text");
        setEmpty(true);
        textareaRef.current?.focus();
      }}
    >
      {textContextUrl && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <p className="min-w-0 flex-1">
            Open{" "}
            <a
              href={textContextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
            >
              {hostname(textContextUrl)} <ExternalLink className="h-3 w-3" />
            </a>
            , copy the ingredients and method, and paste them below.
          </p>
          <button
            type="button"
            aria-label="Dismiss this tip"
            className="-m-1 rounded-full p-1 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => onTextContextUrlChange(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        name="text"
        value={text}
        onChange={(e) => {
          setEmpty(false);
          onTextChange(e.target.value);
        }}
        placeholder="Paste a recipe from a message, note or caption…"
        aria-label="Recipe text"
        aria-invalid={empty || undefined}
        aria-describedby={empty ? "text-empty" : undefined}
        className="min-h-44 max-h-[50vh]"
      />
      {empty && (
        <p id="text-empty" className="text-sm text-destructive">
          Paste the recipe text first, or try the example.
        </p>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>AI sorts it into ingredients and steps.</span>
        {!text.trim() && (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => {
              // The example isn't from the blocked link, so don't credit it
              onTextContextUrlChange(null);
              onTextChange(EXAMPLE_CAPTION);
            }}
          >
            Try an example
          </button>
        )}
      </div>

      {textError && <ErrorCallout message={textError.message} />}

      <ImportButton wait={wait} label="Read recipe" />
    </form>
  );
}

// --- Photo -------------------------------------------------------------------

function PhotoSource({ photo, onPhotoChange, error, cooldown, onImport }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const wait = cooldown.photo;
  const photoError = error?.kind === "photo" ? error : null;

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("That isn’t an image. Choose a photo instead.");
      return;
    }
    onPhotoChange(file);
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (photo && !wait) onImport("photo");
      }}
    >
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {photo ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={photo.previewUrl} alt="Selected recipe photo" className="mx-auto h-80 w-full object-contain" />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => libraryRef.current?.click()}>
              Change
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              aria-label="Remove photo"
              onClick={() => onPhotoChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => libraryRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors hover:bg-accent/50",
            dragging && "border-primary bg-primary/5"
          )}
        >
          <ImageIcon className="h-9 w-9 text-muted-foreground" />
          <span className="font-medium">Choose a photo</span>
          <span className="text-xs text-muted-foreground">
            A cookbook page, a handwritten card or a screenshot
            <span className="hidden md:inline"> · or drop it here</span>
          </span>
        </button>
      )}

      {!photo && (
        <Button type="button" variant="outline" className="w-full md:hidden" onClick={() => cameraRef.current?.click()}>
          <Camera className="h-4 w-4" /> Take a photo
        </Button>
      )}

      {photoError && <ErrorCallout message={photoError.message} />}

      {photo && <ImportButton wait={wait} label="Read recipe" />}
    </form>
  );
}

// --- Shared ------------------------------------------------------------------

function ImportButton({ wait, label }: { wait: number; label: string }) {
  return (
    <div className="space-y-1.5">
      {/* Only the rate limit disables it; empty input is explained on submit. */}
      <Button type="submit" className="w-full" disabled={wait > 0}>
        {wait > 0 ? (
          <>
            <Timer className="h-4 w-4" /> Ready again in {wait}s
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" /> {label}
          </>
        )}
      </Button>
      {wait > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          AI reading is limited to one recipe every 30 seconds.
        </p>
      )}
    </div>
  );
}

function ErrorCallout({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1 space-y-2">
        <p>{message}</p>
        {children}
      </div>
    </div>
  );
}
