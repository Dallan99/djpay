import { describe, expect, it } from "vitest";
import {
  buildInvoiceObjectPath,
  parseInvoiceObjectPath,
  sanitizeFileName,
  validateInvoiceFile,
} from "../invoice-files";
import { isStaffRole, normalizeRole, isActiveStatus } from "../session";

const COMPANY_A = "11111111-1111-4111-8111-111111111111";
const COMPANY_B = "22222222-2222-4222-8222-222222222222";
const CONTRACTOR_A = "33333333-3333-4333-8333-333333333333";
const CONTRACTOR_B = "44444444-4444-4444-8444-444444444444";
const INVOICE_A = "55555555-5555-4555-8555-555555555555";

// Espelha as policies de storage.objects: caminho válido + linha existente em invoices
type InvoiceRow = { id: string; company_id: string; contractor_id: string };
type Actor =
  | { kind: "anon" }
  | { kind: "staff"; companyId: string }
  | { kind: "pj"; companyId: string; contractorId: string };

const rows: InvoiceRow[] = [
  { id: INVOICE_A, company_id: COMPANY_A, contractor_id: CONTRACTOR_A },
];

function canAccessObject(actor: Actor, path: string): boolean {
  if (actor.kind === "anon") return false;
  const parsed = parseInvoiceObjectPath(path);
  if (!parsed) return false;
  const row = rows.find(
    (item) =>
      item.id === parsed.invoiceId &&
      item.company_id === parsed.companyId &&
      item.contractor_id === parsed.contractorId,
  );
  if (!row) return false;
  if (actor.kind === "staff") return row.company_id === actor.companyId;
  return row.company_id === actor.companyId && row.contractor_id === actor.contractorId;
}

function canDeleteObject(actor: Actor, path: string): boolean {
  return actor.kind === "staff" && canAccessObject(actor, path);
}

const validPath = `${COMPANY_A}/${CONTRACTOR_A}/${INVOICE_A}/nota-fiscal.pdf`;

describe("caminho do objeto", () => {
  it("monta caminho determinístico com nome sanitizado", () => {
    expect(
      buildInvoiceObjectPath({
        companyId: COMPANY_A,
        contractorId: CONTRACTOR_A,
        invoiceId: INVOICE_A,
        fileName: "../Nota Fiscal Nº 12/2026 (final).pdf",
      }),
    ).toBe(`${COMPANY_A}/${CONTRACTOR_A}/${INVOICE_A}/Nota-Fiscal-N-12-2026-final-.pdf`);
  });

  it("recusa identificadores inválidos", () => {
    expect(() =>
      buildInvoiceObjectPath({
        companyId: "nao-uuid",
        contractorId: CONTRACTOR_A,
        invoiceId: INVOICE_A,
        fileName: "a.pdf",
      }),
    ).toThrow();
  });

  it("sanitiza nomes e impede travessia de diretório", () => {
    expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("")).toBe("nota-fiscal");
  });

  it("recusa caminhos malformados", () => {
    expect(parseInvoiceObjectPath(`${COMPANY_A}/${CONTRACTOR_A}/nota.pdf`)).toBeNull();
    expect(parseInvoiceObjectPath(`${COMPANY_A}/${CONTRACTOR_A}/nao-uuid/nota.pdf`)).toBeNull();
    expect(parseInvoiceObjectPath(`${COMPANY_A}/${CONTRACTOR_A}/${INVOICE_A}/a/b.pdf`)).toBeNull();
  });
});

describe("autorização de arquivos de NF", () => {
  it("staff da empresa A acessa A e é negado em B", () => {
    expect(canAccessObject({ kind: "staff", companyId: COMPANY_A }, validPath)).toBe(true);
    expect(canAccessObject({ kind: "staff", companyId: COMPANY_B }, validPath)).toBe(false);
  });

  it("PJ acessa apenas o próprio contractor", () => {
    expect(
      canAccessObject({ kind: "pj", companyId: COMPANY_A, contractorId: CONTRACTOR_A }, validPath),
    ).toBe(true);
    expect(
      canAccessObject({ kind: "pj", companyId: COMPANY_A, contractorId: CONTRACTOR_B }, validPath),
    ).toBe(false);
  });

  it("anônimo é negado", () => {
    expect(canAccessObject({ kind: "anon" }, validPath)).toBe(false);
  });

  it("caminho válido mas sem linha correspondente é negado", () => {
    const orphan = `${COMPANY_A}/${CONTRACTOR_A}/${COMPANY_B}/nota.pdf`;
    expect(canAccessObject({ kind: "staff", companyId: COMPANY_A }, orphan)).toBe(false);
  });

  it("PJ não apaga arquivo; staff da empresa apaga", () => {
    expect(
      canDeleteObject({ kind: "pj", companyId: COMPANY_A, contractorId: CONTRACTOR_A }, validPath),
    ).toBe(false);
    expect(canDeleteObject({ kind: "staff", companyId: COMPANY_A }, validPath)).toBe(true);
    expect(canDeleteObject({ kind: "staff", companyId: COMPANY_B }, validPath)).toBe(false);
  });

  it("signed URL só depois de SELECT autorizado", () => {
    const signIfAllowed = (actor: Actor, path: string) =>
      canAccessObject(actor, path) ? `signed:${path}` : null;
    expect(signIfAllowed({ kind: "staff", companyId: COMPANY_A }, validPath)).toContain("signed:");
    expect(signIfAllowed({ kind: "anon" }, validPath)).toBeNull();
  });
});

describe("validação de arquivo", () => {
  it("aceita PDF/XML/imagens e recusa outros", () => {
    expect(validateInvoiceFile({ name: "nf.pdf", size: 1000, type: "application/pdf" })).toBeNull();
    expect(validateInvoiceFile({ name: "nf.xml", size: 1000, type: "text/xml" })).toBeNull();
    expect(validateInvoiceFile({ name: "nf.png", size: 1000, type: "image/png" })).toBeNull();
    expect(validateInvoiceFile({ name: "nf.exe", size: 1000, type: "application/x-msdownload" })).not.toBeNull();
  });

  it("recusa arquivo acima de 15 MB", () => {
    expect(
      validateInvoiceFile({ name: "nf.pdf", size: 20 * 1024 * 1024, type: "application/pdf" }),
    ).not.toBeNull();
  });
});

describe("vocabulário de papéis e status", () => {
  it("normaliza valores legados", () => {
    expect(normalizeRole("administrador")).toBe("administrator");
    expect(normalizeRole("financeiro_rh")).toBe("finance_hr");
    expect(normalizeRole("profissional_pj")).toBe("professional_pj");
    expect(normalizeRole("outro")).toBe("unknown");
    expect(isActiveStatus("ativo")).toBe(true);
    expect(isActiveStatus("active")).toBe(true);
    expect(isActiveStatus("inativo")).toBe(false);
  });

  it("apenas admin/financeiro são staff", () => {
    expect(isStaffRole("administrator")).toBe(true);
    expect(isStaffRole("finance_hr")).toBe(true);
    expect(isStaffRole("professional_pj")).toBe(false);
  });
});

describe("imutabilidade da nota após envio (espelha o trigger)", () => {
  type Row = { status: string; url_arquivo: string | null; contractor_id: string };
  const pjUpdateAllowed = (
    oldRow: Row,
    newRow: Row,
    actor: { contractorId: string },
  ): boolean =>
    oldRow.contractor_id === actor.contractorId &&
    oldRow.status === "pending" &&
    oldRow.url_arquivo === null &&
    newRow.url_arquivo !== null &&
    newRow.status === oldRow.status &&
    newRow.contractor_id === oldRow.contractor_id;

  const base: Row = { status: "pending", url_arquivo: null, contractor_id: CONTRACTOR_A };

  it("PJ pode anexar arquivo uma única vez", () => {
    expect(pjUpdateAllowed(base, { ...base, url_arquivo: validPath }, { contractorId: CONTRACTOR_A })).toBe(true);
    expect(
      pjUpdateAllowed({ ...base, url_arquivo: validPath }, { ...base, url_arquivo: "outro" }, { contractorId: CONTRACTOR_A }),
    ).toBe(false);
  });

  it("PJ não altera status nem nota de outro profissional", () => {
    expect(
      pjUpdateAllowed(base, { ...base, url_arquivo: validPath, status: "approved" }, { contractorId: CONTRACTOR_A }),
    ).toBe(false);
    expect(pjUpdateAllowed(base, { ...base, url_arquivo: validPath }, { contractorId: CONTRACTOR_B })).toBe(false);
  });
});
