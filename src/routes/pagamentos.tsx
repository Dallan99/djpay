import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Clock, FileText, Filter, Search, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { loadSessionContext } from "@/lib/session";

export const Route = createFileRoute("/pagamentos")({
  head: () => ({
    meta: [{ title: "Pagamentos | DJ PAY" }],
  }),
  component: PaymentsPage,
});

type Payment = {
  id: string;
  company_id: string;
  contractor_id: string;
  competencia: string | null;
  descricao: string | null;
  tipo_pagamento: string | null;
  valor: number;
  vencimento: string | null;
  data_pagamento: string | null;
  status: string;
};

type Contractor = {
  id: string;
  nome_completo: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Vencido" },
  { value: "cancelled", label: "Cancelado" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  pending: "border-warning/40 bg-warning/20 text-warning-foreground",
  paid: "border-success/30 bg-success/10 text-success",
  overdue: "border-destructive/25 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

const PAYMENT_TYPE_OPTIONS = [
  { value: "monthly_fee", label: "Mensalidade" },
  { value: "cost_allowance", label: "Ajuda de custo" },
  { value: "thirteenth_invoice", label: "13ª nota" },
  { value: "paid_vacation", label: "Férias remuneradas" },
  { value: "bonus", label: "Bônus" },
  { value: "profit_sharing", label: "PLR" },
  { value: "commission", label: "Comissão" },
  { value: "award", label: "Prêmio" },
  { value: "other", label: "Outros" },
] as const;

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (value: string | null) =>
  value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const formatCompetence = (value: string | null) => {
  if (!value) return "Não informada";
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [competenceFilter, setCompetenceFilter] = useState("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");

  useEffect(() => {
    let active = true;

    const loadPayments = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const session = await loadSessionContext();
      const companyId = session?.companyId ?? "";

      if (!session || !companyId) {
        if (active) {
          setErrorMessage("Não foi possível identificar a empresa da sua sessão.");
          setIsLoading(false);
        }
        return;
      }

      const [paymentsResult, contractorsResult] = await Promise.all([
        supabase
          .from("payments")
          .select("id, company_id, contractor_id, competencia, descricao, tipo_pagamento, valor, vencimento, data_pagamento, status")
          .eq("company_id", companyId)
          .order("vencimento", { ascending: true }),
        supabase
          .from("contractors")
          .select("id, nome_completo")
          .eq("company_id", companyId)
          .order("nome_completo", { ascending: true }),
      ]);

      if (!active) return;

      if (paymentsResult.error || contractorsResult.error) {
        setErrorMessage("Não foi possível carregar os pagamentos da empresa.");
        setPayments([]);
        setContractors([]);
      } else {
        setPayments(paymentsResult.data ?? []);
        setContractors(contractorsResult.data ?? []);
      }
      setIsLoading(false);
    };

    void loadPayments();
    return () => {
      active = false;
    };
  }, []);

  const contractorsById = useMemo(
    () => new Map(contractors.map((contractor) => [contractor.id, contractor.nome_completo])),
    [contractors],
  );

  const getEffectiveStatus = (payment: Payment) => {
    if (payment.status === "paid" || payment.status === "cancelled") return payment.status;
    const today = new Date().toISOString().slice(0, 10);
    return payment.vencimento && payment.vencimento.slice(0, 10) < today ? "overdue" : payment.status;
  };

  const handleStatusChange = async (payment: Payment, status: string) => {
    setStatusUpdateError("");
    setIsUpdatingStatus(true);

    const session = await loadSessionContext();
    const companyId = session?.companyId ?? "";

    if (!session || !companyId || companyId !== payment.company_id) {
      setStatusUpdateError("Não foi possível confirmar sua empresa para atualizar este pagamento.");
      setIsUpdatingStatus(false);
      return;
    }

    const { data, error } = await supabase
      .from("payments")
      .update({
        status,
        data_pagamento: status === "paid" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", payment.id)
      .eq("company_id", companyId)
      .select("id, company_id, contractor_id, competencia, descricao, tipo_pagamento, valor, vencimento, data_pagamento, status")
      .single();

    setIsUpdatingStatus(false);

    if (error || !data) {
      setStatusUpdateError("Não foi possível atualizar o status. Verifique suas permissões e tente novamente.");
      return;
    }

    setPayments((current) => current.map((item) => item.id === data.id ? data : item));
    setSelectedPayment(data);
  };

  const competencies = useMemo(
    () => [...new Set(payments.map((payment) => payment.competencia).filter((value): value is string => Boolean(value)))].sort().reverse(),
    [payments],
  );

  const filteredPayments = useMemo(
    () => payments.filter((payment) =>
      (professionalFilter === "all" || payment.contractor_id === professionalFilter) &&
      (competenceFilter === "all" || payment.competencia === competenceFilter) &&
      (paymentTypeFilter === "all" || payment.tipo_pagamento === paymentTypeFilter) &&
      (statusFilter === "all" || payment.status === statusFilter),
    ),
    [competenceFilter, paymentTypeFilter, payments, professionalFilter, statusFilter],
  );

  const totalPending = filteredPayments
    .filter((payment) => payment.status === "pending" || payment.status === "overdue")
    .reduce((total, payment) => total + Number(payment.valor), 0);
  const totalPaid = filteredPayments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + Number(payment.valor), 0);

  const statusLabel = (status: string) =>
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

  const paymentTypeLabel = (type: string | null) =>
    PAYMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "Outros";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              Financeiro
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              Pagamentos
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Acompanhe os pagamentos dos profissionais da sua empresa, com vencimentos, competências e situação atual.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Em aberto" value={isLoading ? "—" : money(totalPending)} tone="warning" />
            <SummaryCard label="Pagos" value={isLoading ? "—" : money(totalPaid)} tone="success" />
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingCart className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Lista de pagamentos</h2>
                  <p className="text-sm text-muted-foreground">Os dados exibidos respeitam o acesso da empresa corrente.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Carregando..." : `${filteredPayments.length} ${filteredPayments.length === 1 ? "pagamento" : "pagamentos"}`}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25"><Search className="mr-2 size-4 text-muted-foreground" /><SelectValue placeholder="Profissional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {contractors.map((contractor) => <SelectItem key={contractor.id} value={contractor.id}>{contractor.nome_completo}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25"><Clock className="mr-2 size-4 text-muted-foreground" /><SelectValue placeholder="Competência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as competências</SelectItem>
                  {competencies.map((competence) => <SelectItem key={competence} value={competence}>{formatCompetence(competence)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25"><FileText className="mr-2 size-4 text-muted-foreground" /><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {PAYMENT_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25"><Filter className="mr-2 size-4 text-muted-foreground" /><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {errorMessage ? (
            <div className="m-6 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{errorMessage}</p></div>
          ) : isLoading ? (
            <div className="space-y-3 p-6">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-muted/60" />)}</div>
          ) : filteredPayments.length ? (
            <div className="divide-y divide-border/60">
              {filteredPayments.map((payment) => (
                <article key={payment.id} className="flex flex-col gap-4 p-5 transition-all duration-300 hover:bg-muted/35 lg:flex-row lg:items-center">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{contractorsById.get(payment.contractor_id) ?? "Profissional não encontrado"}</h3>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{payment.descricao || "Pagamento sem descrição"}</p>
                    <Badge variant="outline" className="mt-2 w-fit rounded-full border-primary/20 bg-primary/5 px-2.5 py-0.5 text-primary">{paymentTypeLabel(payment.tipo_pagamento)}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:min-w-[23rem]">
                    <Detail label="Competência" value={formatCompetence(payment.competencia)} />
                    <Detail label="Tipo" value={paymentTypeLabel(payment.tipo_pagamento)} />
                    <Detail label="Vencimento" value={formatDate(payment.vencimento)} />
                    <Detail label="Pagamento" value={formatDate(payment.data_pagamento)} />
                  </div>
                  <div className="flex items-center gap-4 lg:min-w-52 lg:justify-end">
                    <div className="text-right"><p className="text-lg font-semibold tabular-nums text-foreground">{money(Number(payment.valor))}</p><Badge variant="outline" className={`mt-1 rounded-full px-2.5 py-0.5 ${STATUS_STYLE[payment.status] ?? "border-border bg-muted text-muted-foreground"}`}>{statusLabel(payment.status)}</Badge></div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedPayment(payment)} className="rounded-lg">Detalhes</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center"><div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><ShoppingCart className="size-5" /></div><p className="mt-4 font-semibold text-foreground">Nenhum pagamento encontrado</p><p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Ajuste os filtros ou aguarde a inclusão de pagamentos para esta empresa.</p></div>
          )}
        </section>
      </div>

      <Dialog open={selectedPayment !== null} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="border-border/60 bg-background sm:max-w-lg">
          {selectedPayment && <>
            <DialogHeader>
              <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><FileText className="size-5" /></div>
              <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>Detalhes do pagamento</DialogTitle>
              <DialogDescription>{selectedPayment.descricao || "Pagamento sem descrição"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm sm:grid-cols-2">
              <Detail label="Profissional" value={contractorsById.get(selectedPayment.contractor_id) ?? "Não encontrado"} />
              <Detail label="Competência" value={formatCompetence(selectedPayment.competencia)} />
              <Detail label="Tipo de pagamento" value={paymentTypeLabel(selectedPayment.tipo_pagamento)} />
              <Detail label="Valor" value={money(Number(selectedPayment.valor))} strong />
              <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p><Badge variant="outline" className={`mt-1 rounded-full px-2.5 py-0.5 ${STATUS_STYLE[selectedPayment.status] ?? "border-border bg-muted text-muted-foreground"}`}>{statusLabel(selectedPayment.status)}</Badge></div>
              <Detail label="Vencimento" value={formatDate(selectedPayment.vencimento)} />
              <Detail label="Data de pagamento" value={formatDate(selectedPayment.data_pagamento)} />
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "warning" | "success" }) {
  return <Card className={`min-w-36 border-${tone}/25 bg-card/75 shadow-sm shadow-black/5`}><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p></CardContent></Card>;
}

function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 truncate ${strong ? "font-semibold tabular-nums text-foreground" : "font-medium text-foreground"}`}>{value}</p></div>;
}
