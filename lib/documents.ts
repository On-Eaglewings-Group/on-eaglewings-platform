/**
 * Document upload constants, validation and path helpers for On-Eaglewings.
 *
 * Supported file types and the 50 MB size limit match the platform's
 * Supabase Storage configuration. Validation runs both in the browser
 * (fast feedback) and in the server upload action (enforcement), so a file
 * is always validated before it is written to storage.
 */

export const DOCUMENT_BUCKET = "workspace-documents";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export type DocumentKind = "pdf" | "word" | "spreadsheet" | "text" | "image" | "other";

interface DocumentTypeDefinition {
  kind: DocumentKind;
  mimeTypes: string[];
}

const DOCUMENT_TYPES_BY_EXTENSION: Record<string, DocumentTypeDefinition> = {
  pdf: { kind: "pdf", mimeTypes: ["application/pdf"] },
  doc: { kind: "word", mimeTypes: ["application/msword"] },
  docx: {
    kind: "word",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  xls: { kind: "spreadsheet", mimeTypes: ["application/vnd.ms-excel"] },
  xlsx: {
    kind: "spreadsheet",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  csv: { kind: "spreadsheet", mimeTypes: ["text/csv"] },
  txt: { kind: "text", mimeTypes: ["text/plain"] },
  jpg: { kind: "image", mimeTypes: ["image/jpeg"] },
  jpeg: { kind: "image", mimeTypes: ["image/jpeg"] },
  png: { kind: "image", mimeTypes: ["image/png"] },
  gif: { kind: "image", mimeTypes: ["image/gif"] },
  webp: { kind: "image", mimeTypes: ["image/webp"] },
  svg: { kind: "image", mimeTypes: ["image/svg+xml"] },
};

export const ALLOWED_EXTENSIONS = Object.keys(DOCUMENT_TYPES_BY_EXTENSION).sort();

export function extensionOfFileName(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) return null;
  return fileName.slice(dot + 1).toLowerCase();
}

export function documentKindForExtension(extension: string): DocumentKind {
  const definition = DOCUMENT_TYPES_BY_EXTENSION[extension.toLowerCase()];
  return definition ? definition.kind : "other";
}

export function mimeTypesForExtension(extension: string): string[] {
  const definition = DOCUMENT_TYPES_BY_EXTENSION[extension.toLowerCase()];
  return definition ? definition.mimeTypes : [];
}

export interface DocumentValidationProblem {
  code:
    | "required"
    | "empty"
    | "too-large"
    | "no-extension"
    | "type"
    | "mime";
  message: string;
}

export function validateFile(file: unknown): DocumentValidationProblem | null {
  if (!(file instanceof File)) {
    return { code: "required", message: "Select a file to upload." };
  }

  if (file.size === 0) {
    return { code: "empty", message: "The selected file is empty." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      code: "too-large",
      message: `File is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`,
    };
  }

  const extension = extensionOfFileName(file.name);
  if (!extension) {
    return { code: "no-extension", message: "The file has no recognizable file type." };
  }

  const definition = DOCUMENT_TYPES_BY_EXTENSION[extension];
  if (!definition) {
    return {
      code: "type",
      message: `Unsupported file type ".${extension}". Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  const mimeType = file.type.trim();
  if (
    mimeType !== "" &&
    mimeType !== "application/octet-stream" &&
    !definition.mimeTypes.includes(mimeType)
  ) {
    return {
      code: "mime",
      message: `The file's content type (${mimeType}) does not match its extension (.${extension}).`,
    };
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+/, "").slice(0, 120);
}

export function documentStoragePath(
  workspaceId: string,
  documentId: string,
  fileName: string,
): string {
  return `workspaces/${encodeURIComponent(workspaceId)}/documents/${documentId}/${safeFileName(fileName)}`;
}
