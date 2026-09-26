"use client";

// PROTOTYPE — Smart Import: source → working → review flow.
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { RecipeDraft } from "@/convex/prototype/importRecipe";
import { compressImage } from "@/lib/image-utils";
import { SourceStep, type SourceError } from "./SourceStep";
import { WorkingState, type WorkingStage } from "./WorkingState";
import { ReviewStep } from "./ReviewStep";
import {
  AI_COOLDOWN_MS,
  clearSession,
  errorMessage,
  loadSession,
  rateLimitSeconds,
  saveSession,
  toEditor,
  type Editor,
  type SourceKind,
} from "./lib";

type Phase =
  | { name: "source" }
  | { name: "working"; kind: SourceKind; stage: WorkingStage }
  | { name: "review"; editor: Editor };

const NO_COOLDOWN: Record<SourceKind, number> = { link: 0, text: 0, photo: 0 };

export function SmartImport({ initialUrl, initialText }: { initialUrl?: string; initialText?: string }) {
  const fromUrl = useAction(api.prototype.importRecipe.fromUrl);
  const fromText = useAction(api.prototype.importRecipe.fromText);
  const fromPhoto = useAction(api.prototype.importRecipe.fromPhoto);
  const generateUploadUrl = useMutation(api.recipes.generateUploadUrl);

  const [phase, setPhase] = useState<Phase>({ name: "source" });
  const [tab, setTab] = useState<SourceKind>(initialText && !initialUrl ? "text" : "link");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [text, setText] = useState(initialText ?? "");
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [textContextUrl, setTextContextUrl] = useState<string | null>(null);
  const [error, setError] = useState<SourceError | null>(null);

  // AI imports share a 30s per-user cooldown per kind on the backend
  const [cooldownUntil, setCooldownUntil] = useState(NO_COOLDOWN);
  const [now, setNow] = useState(0);
  const cooldown = Object.fromEntries(
    (Object.keys(cooldownUntil) as SourceKind[]).map((k) => [
      k,
      Math.max(0, Math.ceil((cooldownUntil[k] - now) / 1000)),
    ])
  ) as Record<SourceKind, number>;
  const coolingDown = cooldown.link + cooldown.text + cooldown.photo > 0;

  useEffect(() => {
    if (!coolingDown) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [coolingDown]);

  const startCooldown = (kind: SourceKind, ms: number) => {
    const t = Date.now();
    setNow(t);
    setCooldownUntil((c) => ({ ...c, [kind]: t + ms }));
  };

  // Restore inputs and draft after a reload (see saveSession)
  const saved = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // One-time sync from sessionStorage, which the server render can't see
    const restored = loadSession();
    setHydrated(true);
    if (!restored) return;
    if (!initialUrl && !initialText) {
      setTab(restored.tab);
      setUrl(restored.url);
      setText(restored.text);
      setTextContextUrl(restored.textContextUrl);
    }
    if (restored.editor) setPhase({ name: "review", editor: restored.editor });
  }, [initialUrl, initialText]);

  useEffect(() => {
    // Wait for the restore above, or the empty initial state would overwrite it
    if (!hydrated || saved.current) return;
    saveSession({
      tab,
      url,
      text,
      textContextUrl,
      editor: phase.name === "review" ? phase.editor : null,
    });
  }, [hydrated, phase, tab, url, text, textContextUrl]);

  // Actions can't be aborted; a newer run (or a cancel) just ignores the old result
  const runId = useRef(0);

  const runImport = async (kind: SourceKind) => {
    const id = ++runId.current;
    const stale = () => runId.current !== id;
    setError(null);
    setPhase({ name: "working", kind, stage: kind === "photo" ? "uploading" : "reading" });

    try {
      let draft: RecipeDraft;
      let sourcePhoto: { storageId: Id<"_storage">; previewUrl: string } | undefined;

      if (kind === "link") {
        draft = await fromUrl({ url: url.trim() });
      } else if (kind === "text") {
        draft = await fromText({ text });
      } else {
        if (!photo) return;
        // Keep enough resolution for small print on a cookbook page
        const file = await compressImage(photo.file, 1600, 0.85).catch(() => photo.file);
        const postUrl = await generateUploadUrl();
        const response = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) throw new Error("Upload failed");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        if (stale()) return;
        setPhase({ name: "working", kind, stage: "reading" });
        draft = await fromPhoto({ storageId });
        sourcePhoto = { storageId, previewUrl: photo.previewUrl };
      }

      if (stale()) return;
      if (draft.method !== "structured-data") startCooldown(kind, AI_COOLDOWN_MS);
      setPhase({
        name: "review",
        editor: toEditor({
          kind,
          draft,
          sourcePhoto,
          contextUrl: kind === "text" ? (textContextUrl ?? undefined) : undefined,
        }),
      });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (stale()) return;
      let message = errorMessage(err);
      const wait = rateLimitSeconds(message);
      if (wait !== null) {
        startCooldown(kind, wait * 1000);
        message =
          kind === "link"
            ? `This page needs AI to read it, and AI can read one recipe every 30 seconds. Try again in ${wait}s.`
            : "";
      }
      setError(message ? { kind, message } : null);
      setPhase({ name: "source" });
    }
  };

  const cancel = () => {
    runId.current++;
    setPhase({ name: "source" });
  };

  const startOver = () => {
    if (phase.name !== "review") return;
    const discarded = phase.editor;
    setPhase({ name: "source" });
    window.scrollTo({ top: 0 });
    toast("Draft discarded", {
      action: { label: "Undo", onClick: () => setPhase({ name: "review", editor: discarded }) },
    });
  };

  const changePhoto = (file: File | null) => {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
    setPhoto(file ? { file, previewUrl: URL.createObjectURL(file) } : null);
    setError((e) => (e?.kind === "photo" ? null : e));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {phase.name === "review" ? "Check the recipe" : "Import a recipe"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {phase.name === "review"
            ? "Fix anything that looks off, then save it to your cookbook."
            : "Paste a link, some text or a photo. You'll review everything before it's saved."}
        </p>
      </header>

      {phase.name === "source" && (
        <SourceStep
          tab={tab}
          onTabChange={setTab}
          url={url}
          onUrlChange={(v) => {
            setUrl(v);
            if (error?.kind === "link") setError(null);
          }}
          text={text}
          onTextChange={setText}
          photo={photo}
          onPhotoChange={changePhoto}
          textContextUrl={textContextUrl}
          onTextContextUrlChange={setTextContextUrl}
          error={error}
          cooldown={cooldown}
          onImport={runImport}
        />
      )}

      {phase.name === "working" && (
        <WorkingState
          key={`${phase.kind}-${phase.stage}`}
          kind={phase.kind}
          stage={phase.stage}
          onCancel={cancel}
        />
      )}

      {phase.name === "review" && (
        <ReviewStep
          editor={phase.editor}
          onChange={(editor) => setPhase({ name: "review", editor })}
          onStartOver={startOver}
          onSaved={() => {
            saved.current = true;
            clearSession();
          }}
        />
      )}
    </div>
  );
}
