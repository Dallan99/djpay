import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadSessionContext } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/configuracoes-empresa")({
  head: () => ({ meta: [{ title: "Minha Empresa | DJ PAY" }] }),
  component: CompanySettings,
});

type CompanyDetails = {
  id: string; nome: string; cnpj: string | null; email: string | null;
  telefone: string | null; logo_url: string | null;
};

function validCnpj(value: string) {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (weights: number[]) => {
    const remainder = weights.reduce((sum, weight, index) => sum + Number(value[index]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return Number(value[12]) === digit([5,4,3,2,9,8,7,6,5,4,3,2]) &&
    Number(value[13]) === digit([6,5,4,3,2,9,8,7,6,5,4,3,2]);
}

function CompanySettings() {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [form, setForm] = useState({ nome: "", cnpj: "", email: "", telefone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const session = await loadSessionContext();
        if (!session) throw new Error("Sessão não identificada.");
        const { data, error } = await supabase.from("companies")
          .select("id,nome,cnpj,email,telefone,logo_url")
          .eq("id", session.companyId).single();
        if (error || !data) throw new Error("Não foi possível carregar a empresa.");
        if (!active) return;
        setCompany(data);
        setForm({ nome: data.nome, cnpj: data.cnpj ?? "", email: data.email ?? "", telefone: data.telefone ?? "" });
        setCanEdit(session.role === "administrator");
      } catch {
        if (active) setMessage("Não foi possível consultar o cadastro da empresa. Verifique seu acesso.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!company || !canEdit || saving) return;
    const cnpj = form.cnpj.replace(/\D/g, "");
    if (!validCnpj(cnpj)) {
      setMessage("Informe um CNPJ válido, incluindo os dígitos verificadores.");
      return;
    }
    setSaving(true); setMessage("");
    try {
      const session = await loadSessionContext();
      if (!session || session.role !== "administrator" || session.companyId !== company.id) throw new Error("Sem permissão.");
      const { error } = await supabase.from("companies").update({
        nome: form.nome.trim(), cnpj, email: form.email.trim() || null, telefone: form.telefone.trim() || null,
      }).eq("id", company.id);
      if (error) throw error;
      setMessage("Cadastro da empresa atualizado com sucesso.");
    } catch {
      setMessage("Não foi possível salvar. Verifique seus dados e permissões.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="p-6 text-muted-foreground">Carregando cadastro da empresa...</main>;
  return <main className="mx-auto max-w-4xl space-y-6 p-4 pb-14 sm:p-8">
    <div className="flex items-start gap-3">
      <Building2 className="mt-1 size-7 text-primary" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Empresa contratante</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Minha Empresa</h1>
        <p className="mt-2 text-muted-foreground">Este é o cadastro da empresa mãe, tomadora das notas fiscais emitidas pelos prestadores PJ. Os PJs são cadastrados em Profissionais, não como empresas contratantes.</p>
      </div>
    </div>
    {company && <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-6">
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="mother-name">Razão social / nome da empresa</Label><Input id="mother-name" maxLength={150} required disabled={!canEdit || saving} value={form.nome} onChange={event => setForm(current => ({...current,nome:event.target.value}))}/></div>
      <div className="space-y-2"><Label htmlFor="mother-cnpj">CNPJ da tomadora</Label><Input id="mother-cnpj" required inputMode="numeric" maxLength={18} disabled={!canEdit || saving} value={form.cnpj} onChange={event => setForm(current => ({...current,cnpj:event.target.value}))} placeholder="00.000.000/0000-00"/></div>
      <div className="space-y-2"><Label htmlFor="mother-email">E-mail financeiro</Label><Input id="mother-email" type="email" disabled={!canEdit || saving} value={form.email} onChange={event => setForm(current => ({...current,email:event.target.value}))}/></div>
      <div className="space-y-2"><Label htmlFor="mother-phone">Telefone</Label><Input id="mother-phone" maxLength={30} disabled={!canEdit || saving} value={form.telefone} onChange={event => setForm(current => ({...current,telefone:event.target.value}))}/></div>
      <div className="sm:col-span-2 space-y-2">
        <p className="text-xs text-muted-foreground">A alteração do CNPJ deve corresponder à empresa contratante real. A consulta automática de notas fiscais ainda depende de integração fiscal autorizada.</p>
        {!canEdit && <p className="text-sm text-muted-foreground">Somente o administrador desta empresa pode editar seus dados.</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {canEdit && <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar cadastro"}</Button>}
      </div>
    </form>}
    {!company && <p role="alert" className="text-destructive">{message}</p>}
  </main>;
}
