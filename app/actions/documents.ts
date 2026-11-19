"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccess } from "@/lib/auth/workspace-access";
import {
  DOCUMENT_BUCKET,
  documentKindForExtension,
  documentStoragePath,
  extensionOfFileName,
  validateFile,
} from "@/lib/documents";

export interface DocumentActionResult {
  ok: boolean;
  error?: string;
  documentId?: string;
}

export interface DocumentDownloadResult {
  ok: boolean;
  error?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
}

export interface DocumentStorageCheckResult {
  ok: boolean;
  error?: string;
}

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
const MAX_DESCRIPTION_LENGTH = 1000;

async function requireWorkspaceAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const access = await getWorkspaceAccess(supabase);
  if (access.status !== "allowed") {
    throw new Error(
      access.status === "unauthenticated"
        ? "You must be signed in to access documents."
        : "You do not have access to this workspace.",
    );
  }
  return access;
}

export async function uploadDocumentAction(
  _prevState: DocumentActionResult | null,
  formData: FormData,
): Promise<DocumentActionResult> {
  const file = formData.get("file") as File | null;
  const description = (formData.get("description") as string | null) ?? "";

  const validation = validateFile(file);
  if (validation) {
    return { ok: false, error: validation.message };
  }
  if (!file) {
    return { ok: false, error: "Select a file to upload." };
  }

  const descriptionText = description.trim().slice(0, MAX_DESCRIPTION_LENGTH);

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access: Awaited<ReturnType<typeof requireWorkspaceAccess>> | undefined;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }
  if (!access || !access.workspaceId || !access.userId) {
    return { ok: false, error: "No workspace or user is associated with your session." };
  }

  const documentId = crypto.randomUUID();
  const storagePath = documentStoragePath(access.workspaceId, documentId, file.name);

  // Compute a SHA-256 checksum for the stored record (optional metadata).
  let checksum: string | null = null;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    checksum = createHash("sha256").update(buffer).digest("hex");
  } catch {
    // Checksums are optional; an upload must not fail because of hashing.
  }

  const { error: uploadError } = await supabase
    .storage.from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      error: `Storage upload failed: ${uploadError.message}`,
    };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    workspace_id: access.workspaceId,
    original_filename: file.name,
    mime_type: file.type || null,
    byte_size: file.size,
    checksum_sha256: checksum,
    document_type: documentKindForExtension(extensionOfFileName(file.name) ?? ""),
    classification: "confidential",
    description: descriptionText || null,
    storage_path: storagePath,
  });

  if (insertError) {
    // The file was uploaded but the record could not be saved; remove the
    // orphaned object so storage does not retain unreferenced files.
    await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]).catch(() => {
      /* best-effort cleanup */
    });

    if (insertError.code === "42501") {
      return {
        ok: false,
        error: "You are not permitted to create documents in this workspace.",
      };
    }
    if (insertError.code === "23505") {
      return { ok: false, error: "A document with this identifier already exists. Try again." };
    }
    return { ok: false, error: "Failed to save the document record. The uploaded file was removed." };
  }

  revalidatePath("/documents");
  redirect("/documents?uploaded=1");
  return { ok: true, documentId };
}

export async function deleteDocumentAction(documentId: string): Promise<DocumentActionResult> {
  if (!documentId || typeof documentId !== "string") {
    return { ok: false, error: "Invalid document." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("storage_path, workspace_id")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { ok: false, error: "Document not found or you do not have access to it." };
  }

  if (document.workspace_id !== access.workspaceId) {
    return { ok: false, error: "Document not found." };
  }

  if (access.role !== "owner" && access.role !== "admin" && access.role !== "manager") {
    return { ok: false, error: "Only owners, admins and managers can delete documents." };
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", documentId);

  if (deleteError) {
    if (deleteError.code === "42501") {
      return { ok: false, error: "You are not permitted to delete this document." };
    }
    return { ok: false, error: "Failed to delete the document record." };
  }

  // Remove the stored object as best-effort; the record is gone regardless.
  if (document.storage_path) {
    await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storage_path]).catch(() => {
      /* best-effort cleanup */
    });
  }

  revalidatePath("/documents");
  return { ok: true };
}

export async function getDocumentDownloadUrl(
  documentId: string,
): Promise<DocumentDownloadResult> {
  if (!documentId || typeof documentId !== "string") {
    return { ok: false, error: "Invalid document." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  let access;
  try {
    supabase = await createClient();
    access = await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("storage_path, original_filename, mime_type, workspace_id")
    .eq("id", documentId)
    .single();

  if (fetchError || !document) {
    return { ok: false, error: "Document not found or you do not have access to it." };
  }

  if (document.workspace_id !== access.workspaceId) {
    return { ok: false, error: "Document not found." };
  }

  const { data, error: urlError } = await supabase
    .storage.from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, SIGNED_URL_EXPIRY_SECONDS, {
      download: document.original_filename,
    });

  if (urlError || !data?.signedUrl) {
    return { ok: false, error: "Unable to create a download link. Please try again." };
  }

  return {
    ok: true,
    url: data.signedUrl,
    fileName: document.original_filename,
    mimeType: document.mime_type ?? undefined,
  };
}

export async function checkDocumentStorage(): Promise<DocumentStorageCheckResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
    await requireWorkspaceAccess(supabase);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Access denied.",
    };
  }

  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).list("", {
    limit: 1,
  });

  if (error) {
    return {
      ok: false,
      error: `The document storage bucket "${DOCUMENT_BUCKET}" is not configured. Ask a platform administrator to create the private bucket in Supabase Storage.`,
    };
  }

  return { ok: true };
}
