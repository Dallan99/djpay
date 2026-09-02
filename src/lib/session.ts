import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrator" | "finance_hr" | "professional_pj" | "unknown";

export type SessionContext = {
  userId: string;
  companyId: string;
  role: AppRole;
  contractorId: string | null;
  nome: string;
  email: string;
};

const ROLE_ALIASES: Record<string, AppRole> = {
  administrator: "administrator",
  administrador: "administrator",
  admin: "administrator",
  finance_hr: "finance_hr",
  financeiro_rh: "finance_hr",
  "financeiro/rh": "finance_hr",
  financeiro: "finance_hr",
  professional_pj: "professional_pj",
  profissional_pj: "professional_pj",
  "profissional pj": "professional_pj",
  pj: "professional_pj",
};

export function normalizeRole(role: string | null | undefined): AppRole {
  return ROLE_ALIASES[(role ?? "").trim().toLowerCase()] ?? "unknown";
}

export function isActiveStatus(status: string | null | undefined): boolean {
  const value = (status ?? "").trim().toLowerCase();
  return value === "active" || value === "ativo";
}

export function isStaffRole(role: AppRole): boolean {
  return role === "administrator" || role === "finance_hr";
}

/**
 * Reads identity, company and role from public.users (never from user_metadata).
 * The PJ contractor id comes from public.contractors.user_id.
 */
export async function loadSessionContext(): Promise<SessionContext | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("id, company_id, nome_completo, email, role, status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (userError || !userRow || !isActiveStatus(userRow.status)) return null;

  const role = normalizeRole(userRow.role);
  let contractorId: string | null = null;

  if (role === "professional_pj") {
    const { data: contractorRow } = await supabase
      .from("contractors")
      .select("id")
      .eq("user_id", authData.user.id)
      .eq("company_id", userRow.company_id)
      .maybeSingle();
    contractorId = contractorRow?.id ?? null;
  }

  return {
    userId: userRow.id,
    companyId: userRow.company_id,
    role,
    contractorId,
    nome: userRow.nome_completo,
    email: userRow.email ?? authData.user.email ?? "",
  };
}
