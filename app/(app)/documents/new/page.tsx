"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FileIcon } from "@/app/components/icons";
import { uploadDocumentAction, type DocumentActionResult } from "@/app/actions/documents";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  validateFile,
  formatFileSize,
} from "@/lib/documents";

const initialState: DocumentActionResult = { ok: false };

export default function DocumentsNewPage() {
  const [state, formAction, isPending] = useActionState(uploadDocumentAction, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [selectError, setSelectError] = useState<string | null>(null);

  // Successful uploads redirect to the documents library; no local reset needed.

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSelectError(null);

    if (!file) return;

    const problem = validateFile(file);
    if (problem) {
      setSelectError(problem.message);
      event.target.value = "";
      return;
    }
  }

  function isFileValid(): boolean {
    if (!selectedFile) return false;
    return validateFile(selectedFile) === null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-navy-300">
          <FileIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">Upload a Document</h1>
          <p className="text-sm text-muted">
            Upload a commercial record or supporting document. Files are stored privately for your workspace.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-5" noValidate>
        {selectError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {selectError}
          </p>
        )}

        <div className="space-y-2">
          <label htmlFor="document-file" className="block text-sm font-medium text-charcoal">
            Document file
          </label>
          <div className="relative">
            <input
              id="document-file"
              name="file"
              type="file"
              accept={ALLOWED_EXTENSIONS.map((ext: string) => `.${ext}`).join(",")}
              required
              onChange={handleFileChange}
              className="sr-only"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => document.getElementById("document-file")?.click()}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                isPending
                  ? "border-border bg-workspace text-muted cursor-wait"
                  : "border-dashed border-navy-700/30 bg-navy-50/30 text-navy-700 hover:bg-navy-50 hover:border-navy-700"
              }`}
            >
              {isPending ? "Uploading…" : selectedFile ? `Change file: ${selectedFile.name}` : "Select document…"}
            </button>
            {selectedFile && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            Allowed: {ALLOWED_EXTENSIONS.join(", ")}. Maximum size: {formatFileSize(MAX_FILE_SIZE)}.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="document-description" className="block text-sm font-medium text-charcoal">
            Description
          </label>
          <textarea
            id="document-description"
            name="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Signed term sheet for the Northern copper opportunity"
            className="w-full rounded-lg border border-border bg-workspace px-3 py-2.5 text-sm text-charcoal focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-800/20"
            maxLength={1000}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !isFileValid()}
            className="shrink-0 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-70 hover:bg-navy-800"
          >
            {isPending ? "Uploading…" : "Upload document"}
          </button>
          <Link
            href="/documents"
            className="shrink-0 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-workspace"
          >
            Cancel
          </Link>
        </div>

        {state?.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
