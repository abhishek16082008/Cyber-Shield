/* ==========================================================================
   AnalysePage — upload a .eml for analysis.
   - Drag-and-drop zone + file picker.
   - Validates extension (.eml only) and size, shows filename + size.
   - Fixed instruction panel (4 visual steps) on the left.
   - Placeholder area for a future tutorial video/image.
   - "Start Secure Analysis" -> Investigation.
   ========================================================================== */

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileCheck2,
  X,
  ShieldAlert,
  PlayCircle,
  Mail,
  ScanLine,
  ListChecks,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UPLOAD } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import { useScan } from "@/context/ScanContext";

// The four fixed instruction steps shown alongside the uploader.
const INSTRUCTIONS = [
  { icon: Mail, title: "Export the .eml", desc: "In your mail client, save the suspicious email as a .eml file." },
  { icon: UploadCloud, title: "Upload it here", desc: "Drag it into the zone or browse. Only .eml is accepted." },
  { icon: ScanLine, title: "Run secure analysis", desc: "We parse text only — no links opened, no attachments run." },
  { icon: FileText, title: "Read the report", desc: "Get a scored forensic breakdown you can export as PDF." },
];

export function AnalysePage() {
  const navigate = useNavigate();
  const { setPendingFile } = useScan();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  /** Validate and accept a chosen file. */
  function accept(f: File) {
    setError("");
    const lower = f.name.toLowerCase();
    const okExt = UPLOAD.allowedExtensions.some((ext) => lower.endsWith(ext));
    if (!okExt) {
      setError("Only .eml files are supported. Please export the email as .eml.");
      setFile(null);
      return;
    }
    if (f.size > UPLOAD.maxBytes) {
      setError(`File is too large. Maximum size is ${formatBytes(UPLOAD.maxBytes)}.`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) accept(f);
  }

  function start() {
    if (!file) return;
    setPendingFile(file);
    navigate("/investigation");
  }

  return (
    <div>
      <div className="eyebrow">analyse</div>
      <h1 className="mt-2 text-3xl font-bold">Analyse an Email</h1>
      <p className="mt-1 text-muted-foreground">
        Upload a suspicious <span className="mono text-secure">.eml</span> file to
        generate a forensic threat report.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ---------------- Left: fixed instruction panel ---------------- */}
        <aside className="lg:sticky lg:top-[calc(var(--topbar-height)+2rem)] lg:self-start">
          <div className="panel p-5">
            <div className="eyebrow mb-3">steps</div>
            <ol className="space-y-4">
              {INSTRUCTIONS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-secure/30 bg-secure/10 text-secure">
                    <s.icon className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">
                      <span className="mr-1 font-mono text-xs text-muted-foreground">
                        {i + 1}.
                      </span>
                      {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Tutorial placeholder (future video/image) */}
          <div className="panel mt-4 p-3">
            <div className="eyebrow mb-2">tutorial</div>
            <div className="flex aspect-video items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-muted-foreground">
              <div className="flex flex-col items-center gap-2 text-center">
                <PlayCircle className="size-8" />
                <span className="text-xs">Tutorial video coming soon</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------------- Right: uploader ---------------- */}
        <section>
          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload a .eml file"
            className={`panel reticle relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 border-dashed p-8 text-center transition-colors ${
              dragging ? "border-secure bg-secure/5" : "hover:bg-secondary/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".eml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) accept(f);
              }}
            />
            <div className="flex size-14 items-center justify-center rounded-full border border-secure/30 bg-secure/10 text-secure">
              <UploadCloud className="size-7" />
            </div>
            <div>
              <p className="font-semibold">
                Drag & drop your <span className="mono text-secure">.eml</span> file
              </p>
              <p className="text-sm text-muted-foreground">
                or <span className="text-secure underline">browse</span> to select
              </p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              .eml only · max {formatBytes(UPLOAD.maxBytes)}
            </p>
          </div>

          {/* Validation error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-threat/30 bg-threat/10 px-4 py-3 text-sm text-threat" role="alert">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selected file card */}
          {file && (
            <div className="panel mt-4 flex items-center gap-3 p-4">
              <FileCheck2 className="size-8 text-secure" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{file.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {formatBytes(file.size)} · ready for analysis
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setError("");
                }}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Remove file"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Safety note + action */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <ListChecks className="size-4 text-secure" />
              Analysis is read-only. No links are opened; no attachments run.
            </p>
            <Button size="lg" disabled={!file} onClick={start}>
              <ScanLine className="size-5" /> Start Secure Analysis
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
