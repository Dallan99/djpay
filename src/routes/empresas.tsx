import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSessionContext } from "@/lib/session";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Gestão de Empresas | DJ PAY" }] }),
  component: CompaniesPage,
});

type FinancialSummary = { company_id: string; payments_count: number; payments_total: number; invoices_count: number; invoices_total: number };

type Company = { id: string; nome: string; cnpj: string | null; status: string; email: string | null; telefone: string | null };

function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [summaries, setSummaries] = useState<FinancialSummary[]>([]);
  const [financeError, setFinanceError] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const session = await loadSessionContext();
        if (!session) return;
        const { data: permitted, error: permissionError } = await supabase.rpc("dj_pay_is_central_admin" as never);
        if (permissionError || permitted !== true) return;
        if (mounted) setAuthorized(true);
        const { data, error } = await supabase.from("companies")
          .select("id,nome,cnpj,status,email,telefone").order("nome");
        if (error) throw error;
        if (mounted) setCompanies(data ?? []);
        const { data: totals, error: totalsError } = await supabase.rpc("dj_pay_central_financial_summary" as never, { p_company_id: null } as never);
        if (!mounted) return;
        if (totalsError) setFinanceError("Não foi possível carregar os indicadores financeiros.");
        else setSummaries((totals ?? []) as FinancialSummary[]);
      } catch {
        if (mounted) setMessage("Não foi possível carregar as empresas. Tente atualizar a página.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const isValidCnpj = (value: string): boolean => {
    if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
    const check = (length: number): number => {
      const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const remainder = weights.reduce((sum, weight, i) => sum + Number(value[i]) * weight, 0) % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    return Number(value[12]) === check(12) && Number(value[13]) === check(13);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const digits = cnpj.replace(/\D/g, "");
    if (!isValidCnpj(digits)) {
      setMessage("Informe um CNPJ com 14 dígitos válidos.");
      return;
    }
    if (companies.some(company => company.cnpj?.replace(/\D/g, "") === digits)) {
      setMessage("Este CNPJ já está cadastrado.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { data: permitted, error: permissionError } = await supabase.rpc("dj_pay_is_central_admin" as never);
      if (permissionError || permitted !== true) throw new Error("Sem permissão");
      const { data, error } = await supabase.from("companies").insert({
        nome: name.trim(),
        cnpj: digits,
        email: email.trim() || null,
        telefone: phone.trim() || null,
        status: "active",
      }).select("id,nome,cnpj,status,email,telefone").single();
      if (error) throw error;
      setCompanies(current => [...current, data].sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR")));
      setName(""); setCnpj(""); setEmail(""); setPhone("");
      setMessage("Empresa cadastrada com sucesso.");
    } catch {
      setMessage("Não foi possível cadastrar. Confira o CNPJ e suas permissões.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="p-6 text-muted-foreground">Carregando empresas...</main>;
  if (!authorized) return <main className="p-6" role="alert">Acesso restrito à administração central do DJ PAY.</main>;

  const filteredSummaries = summaries.filter(item => !selectedId || item.company_id === selectedId);
  const totals = filteredSummaries.reduce((acc, item) => ({
    payments: acc.payments + Number(item.payments_count),
    amount: acc.amount + Number(item.payments_total),
    invoices: acc.invoices + Number(item.invoices_count),
    invoiceAmount: acc.invoiceAmount + Number(item.invoices_total),
  }), { payments: 0, amount: 0, invoices: 0, invoiceAmount: 0 });
  const brl = (amount: number) => amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return <main className="mx-auto w-full max-w-6xl space-y-7 p-4 pb-14 sm:p-8">
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Administração central</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Gestão de Empresas</h1>
      <p className="mt-2 text-muted-foreground">Cadastre e consulte os CNPJs da operação. Pagamentos e notas continuam vinculados à empresa de origem até a próxima etapa.</p>
    </div>
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="size-5" /> Cadastrar empresa</h2>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="company-name">Razão social / nome da empresa</Label><Input id="company-name" value={name} onChange={e => setName(e.target.value)} maxLength={150} required placeholder="Nome da empresa" /></div>
        <div className="space-y-2"><Label htmlFor="company-cnpj">CNPJ</Label><Input id="company-cnpj" value={cnpj} onChange={e => setCnpj(e.target.value)} inputMode="numeric" maxLength={18} required placeholder="00.000.000/0000-00" /></div>
        <div className="space-y-2"><Label htmlFor="company-email">E-mail (opcional)</Label><Input id="company-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="company-phone">Telefone (opcional)</Label><Input id="company-phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} /></div>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar empresa"}</Button>
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </form>
    </div>
    <section className="rounded-xl border bg-card p-4 space-y-3" aria-label="Selecionar empresa">
      <Label htmlFor="selected-company">Selecionar empresa para consulta</Label>
      <select id="selected-company" value={selectedId} onChange={event => setSelectedId(event.target.value)}
        className="flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Todas as empresas cadastradas</option>
        {companies.map(company => <option key={company.id} value={company.id}>{company.nome} — {company.cnpj || "CNPJ não informado"}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">Esta seleção filtra somente o cadastro de empresas. O financeiro permanece vinculado à empresa original da conta.</p>
    </section>
    <section className="space-y-3" aria-label="Resumo financeiro por empresa">
      <h2 className="text-xl font-semibold">Resumo financeiro {selectedId ? "da empresa" : "consolidado"}</h2>
      <p className="text-sm text-muted-foreground">Consulta somente leitura. Totais dos registros existentes, independentemente do status de pagamento ou aprovação.</p>
      {financeError ? <p role="alert" className="text-sm text-destructive">{financeError}</p> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pagamentos registrados", String(totals.payments)],
            ["Valor dos pagamentos", brl(totals.amount)],
            ["Notas fiscais registradas", String(totals.invoices)],
            ["Valor das notas", brl(totals.invoiceAmount)],
          ].map(([label, value]) =>
            <article key={label} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold break-words">{value}</p>
            </article>
          )}
        </div>}
    </section>
    <section className="space-y-3" aria-label="Empresas cadastradas">
      <h2 className="text-xl font-semibold">Empresas cadastradas <span className="text-muted-foreground">({companies.length})</span></h2>
      {companies.length === 0 ? <p className="rounded-xl border p-5 text-muted-foreground">Nenhuma empresa cadastrada.</p> :
        <div className="grid gap-3 md:grid-cols-2">
          {companies.filter(company => !selectedId || company.id === selectedId).map(company => <article key={company.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <Building2 className="mt-1 size-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <h3 className="font-semibold break-words">{company.nome}</h3>
              <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj || "Não informado"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{company.status === "active" ? "Ativa" : "Inativa"}</p>
            </div>
          </article>)}
        </div>}
    </section>
  </main>;
}
