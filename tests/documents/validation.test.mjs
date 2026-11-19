import assert from "node:assert/strict";
import test from "node:test";
import {
  validateFile,
  extensionOfFileName,
  documentKindForExtension,
  mimeTypesForExtension,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "../../lib/documents.ts";

function createFile({ name = "document.pdf", type = "application/pdf", size = 1024 } = {}) {
  return new File(["x".repeat(Math.max(0, size))], name, { type });
}

function problemOf(result) {
  return result ? { code: result.code, message: result.message } : null;
}

test("allowed extensions cover the supported document and image formats", () => {
  assert.ok(
    ALLOWED_EXTENSIONS.includes("pdf") &&
      ALLOWED_EXTENSIONS.includes("doc") &&
      ALLOWED_EXTENSIONS.includes("docx") &&
      ALLOWED_EXTENSIONS.includes("xls") &&
      ALLOWED_EXTENSIONS.includes("xlsx") &&
      ALLOWED_EXTENSIONS.includes("csv") &&
      ALLOWED_EXTENSIONS.includes("txt") &&
      ALLOWED_EXTENSIONS.includes("jpg") &&
      ALLOWED_EXTENSIONS.includes("jpeg") &&
      ALLOWED_EXTENSIONS.includes("png") &&
      ALLOWED_EXTENSIONS.includes("gif") &&
      ALLOWED_EXTENSIONS.includes("webp") &&
      ALLOWED_EXTENSIONS.includes("svg"),
  );
});

test("maximum file size is 50 MB", () => {
  assert.equal(MAX_FILE_SIZE, 50 * 1024 * 1024);
});

test("non-file input is rejected", () => {
  assert.deepEqual(problemOf(validateFile(undefined)), {
    code: "required",
    message: "Select a file to upload.",
  });
  assert.deepEqual(problemOf(validateFile("not-a-file")), {
    code: "required",
    message: "Select a file to upload.",
  });
  assert.deepEqual(problemOf(validateFile(null)), {
    code: "required",
    message: "Select a file to upload.",
  });
});

test("empty files are rejected", () => {
  assert.deepEqual(problemOf(validateFile(createFile({ size: 0 }))), {
    code: "empty",
    message: "The selected file is empty.",
  });
});

test("files exceeding the size limit are rejected", () => {
  const result = validateFile(createFile({ size: MAX_FILE_SIZE + 1 }));
  assert.deepEqual(problemOf(result), {
    code: "too-large",
    message: "File is too large. Maximum size is 50.0 MB.",
  });
  assert.ok(result.message.includes("Maximum size is 50"));
});

test("files at the size limit are accepted", () => {
  assert.equal(
    problemOf(validateFile(createFile({ size: MAX_FILE_SIZE }))),
    null,
  );
});

test("files without a recognizable extension are rejected", () => {
  assert.deepEqual(problemOf(validateFile(createFile({ name: "README" }))), {
    code: "no-extension",
    message: "The file has no recognizable file type.",
  });
});

test("unsupported file types are rejected with the allowed list", () => {
  const result = validateFile(createFile({ name: "payload.exe" }));
  assert.equal(result.code, "type");
  assert.ok(result.message.includes(".exe"));
  assert.ok(result.message.includes(ALLOWED_EXTENSIONS.join(", ")));
});

test("supported document formats pass validation", () => {
  for (const [name, type] of [
    ["report.pdf", "application/pdf"],
    ["spec.doc", "application/msword"],
    ["spec.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["sheet.xls", "application/vnd.ms-excel"],
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["extract.csv", "text/csv"],
    ["notes.txt", "text/plain"],
  ]) {
    assert.equal(
      problemOf(validateFile(createFile({ name, type }))),
      null,
      `${name} (${type}) should be valid`,
    );
  }
});

test("supported image formats pass validation", () => {
  for (const [name, type] of [
    ["photo.jpg", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.gif", "image/gif"],
    ["photo.webp", "image/webp"],
    ["diagram.svg", "image/svg+xml"],
  ]) {
    assert.equal(
      problemOf(validateFile(createFile({ name, type }))),
      null,
      `${name} (${type}) should be valid`,
    );
  }
});

test("mime type mismatch is rejected", () => {
  const result = validateFile(createFile({ name: "report.pdf", type: "image/png" }));
  assert.equal(result.code, "mime");
  assert.ok(result.message.includes("image/png"));
  assert.ok(result.message.includes(".pdf"));
});

test("octet-stream is tolerated for known extensions", () => {
  assert.equal(
    problemOf(validateFile(createFile({ name: "report.pdf", type: "application/octet-stream" }))),
    null,
  );
  assert.equal(
    problemOf(validateFile(createFile({ name: "sheet.xlsx", type: "" }))),
    null,
  );
});

test("extensionOfFileName parses extensions and rejects dotfiles", () => {
  assert.equal(extensionOfFileName("Report.PDF"), "pdf");
  assert.equal(extensionOfFileName("spec.docx"), "docx");
  assert.equal(extensionOfFileName("archive"), null);
  assert.equal(extensionOfFileName(".env"), null);
  assert.equal(extensionOfFileName("file."), null);
});

test("documentKindForExtension maps extensions to kinds", () => {
  assert.equal(documentKindForExtension("pdf"), "pdf");
  assert.equal(documentKindForExtension("docx"), "word");
  assert.equal(documentKindForExtension("xlsx"), "spreadsheet");
  assert.equal(documentKindForExtension("csv"), "spreadsheet");
  assert.equal(documentKindForExtension("txt"), "text");
  assert.equal(documentKindForExtension("png"), "image");
  assert.equal(documentKindForExtension("xyz"), "other");
});

test("mimeTypesForExtension returns the expected MIME types", () => {
  assert.deepEqual(mimeTypesForExtension("pdf"), ["application/pdf"]);
  assert.deepEqual(mimeTypesForExtension("xlsx"), [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  assert.deepEqual(mimeTypesForExtension("nope"), []);
});
