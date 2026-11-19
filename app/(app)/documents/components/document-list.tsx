"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileIcon } from "@/app/components/icons";
import { EmptyState } from "@/app/components/empty-state";
import { deleteDocumentAction, getDocumentDownloadUrl } from "@/app/actions/documents";
import {
  documentKindForExtension,
  extensionOfFileName,
  formatFileSize,
} from "@/lib/documents";

interface DocumentRow {
  id: string;
  original_filename: string;
  mime_type: string | null;
  byte_size: number | null;
  document_type: string | null;
  classification: string;
  created_at: string;
  storage_path: string | null;
  uploaded_by: string | null;
  user_profiles: { display_name: string | null } | null;
}

interface DocumentListProps {
  documents: DocumentRow[];
  canManage: boolean;
  storageConfigured: boolean;
}

interface Alert {
  kind: "success" | "error";
  message: string;
}

function classificationBadgeClass(classification: string): string {
  switch (classification) {
    case "internal":
      return "bg-blue-100 text-blue-800";
    case "restricted":
      return "bg-red-100 text-red-800";
    case "confidential":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function uploaderName(document: DocumentRow): string {
  return document.user_profiles?.display_name || document.uploaded_by || "Unknown";
}

export function DocumentList({
  documents,
  canManage,
  storageConfigured,
}: DocumentListProps) {
  const router = useRouter();
  const [alert, setAlert] = useState<Alert | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileIcon}
        title="No documents uploaded yet"
        description={
          storageConfigured
            ? "Uploaded documents appear here with their file type, size and uploader."
            : "Document storage is not configured yet, so uploads are unavailable."
        }
        actionLabel="Upload a Document"
        actionHref="/documents/new"
        actionIcon={FileIcon}
      />
    );
  }

  async function handleDownload(document: DocumentRow): Promise<void> {
    setAlert(null);
    const result = await getDocumentDownloadUrl(document.id);
    if (!result.ok || !result.url) {
      setAlert({
        kind: "error",
        message: result.error || "Unable to create a download link. Please try again.",
      });
      return;
    }
    window.open(result.url, "_blank");
  }

  async function handleDelete(document: DocumentRow): Promise<void> {
    if (!window.confirm(`Delete “${document.original_filename}"?`)) return;
    setDeleting((previous) => new Set([...previous, document.id]));
    setAlert(null);

    try {
      const result = await deleteDocumentAction(document.id);
      if (result.ok) {
        setAlert({
          kind: "success",
          message: `“${document.original_filename}” was deleted.`,
        });
        await router.refresh();
      } else {
        setAlert({
          kind: "error",
          message: result.error || "Failed to delete the document.",
        });
      }
    } finally {
      setDeleting((previous) => {
        const next = new Set(previous);
        next.delete(document.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      {alert && (
        <div
          role={alert.kind === "success" ? "status" : "alert"}
          className={`rounded-lg p-3 text-sm ${
            alert.kind === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {alert.message}
        </div>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-white shadow-sm">
        {documents.map((document) => {
          const kind = documentKindForExtension(
            extensionOfFileName(document.original_filename) ?? "",
          );
          const isDeleting = deleting.has(document.id);
          return (
            <li key={document.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-workspace text-navy-700">
                <FileIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal" title={document.original_filename}>
                  {document.original_filename}
                </p>
                <p className="mt-0.5 text-xs text-muted truncate" title={`${kind} • ${formatFileSize(document.byte_size ?? 0)}`}>
                  {kind.charAt(0).toUpperCase() + kind.slice(1)} • {formatFileSize(document.byte_size ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Uploaded by {uploaderName(document)} • {formatDate(document.created_at)}
                </p>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${classificationBadgeClass(document.classification)}`}
                >
                  {document.classification}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={!storageConfigured}
                  onClick={() => handleDownload(document)}
                  className={`text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    storageConfigured
                      ? "text-navy-700 hover:text-navy-900 hover:underline"
                      : "text-muted"
                  }`}
                >
                  Download
                </button>
                {canManage && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(document)}
                    className="text-xs font-medium text-red-600 transition-colors hover:underline disabled:cursor-wait disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
