export const INVOICE_BUCKET = "invoices";

export const INVOICE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const INVOICE_MAX_FILE_BYTES = 15 * 1024 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Sanitizes a user provided filename into a safe, path-traversal free name. */
export function sanitizeFileName(rawName: string): string {
  const trimmed = (rawName ?? "").split(/[\\/]/).pop() ?? "";
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/[-.]+$/, "")
    .slice(0, 120);
  return normalized || "nota-fiscal";
}

/** Deterministic object path: company_id/contractor_id/invoice_id/safe-name */
export function buildInvoiceObjectPath(input: {
  companyId: string;
  contractorId: string;
  invoiceId: string;
  fileName: string;
}): string {
  if (!isUuid(input.companyId) || !isUuid(input.contractorId) || !isUuid(input.invoiceId)) {
    throw new Error("Identificadores inválidos para o caminho do arquivo.");
  }
  return `${input.companyId}/${input.contractorId}/${input.invoiceId}/${sanitizeFileName(input.fileName)}`;
}

export type ParsedInvoicePath = {
  companyId: string;
  contractorId: string;
  invoiceId: string;
  fileName: string;
};

/** Mirrors the storage policy validation: 3 uuid folders + a file name. */
export function parseInvoiceObjectPath(path: string): ParsedInvoicePath | null {
  const segments = (path ?? "").split("/");
  if (segments.length !== 4) return null;
  const [companyId, contractorId, invoiceId, fileName] = segments as [string, string, string, string];
  if (!isUuid(companyId) || !isUuid(contractorId) || !isUuid(invoiceId)) return null;
  if (!fileName || fileName === "." || fileName === ".." || fileName !== sanitizeFileName(fileName)) return null;
  return { companyId, contractorId, invoiceId, fileName };
}

export function validateInvoiceFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size > INVOICE_MAX_FILE_BYTES) return "O arquivo excede o limite de 15 MB.";
  const type = (file.type || "").toLowerCase();
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const allowedByType = (INVOICE_ALLOWED_MIME_TYPES as readonly string[]).includes(type);
  const allowedByExtension = ["pdf", "xml", "png", "jpg", "jpeg", "webp"].includes(extension);
  if (!allowedByType && !allowedByExtension) {
    return "Formato não permitido. Envie PDF, XML, PNG, JPG ou WEBP.";
  }
  return null;
}
