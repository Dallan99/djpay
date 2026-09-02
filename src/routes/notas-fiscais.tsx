import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Filter,
  Paperclip,
  Search,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isStaffRole, loadSessionContext, type SessionContext } from "@/lib/session";
import {
  INVOICE_BUCKET,
  buildInvoiceObjectPath,
  validateInvoiceFile,
} from "@/lib/invoice-files";

export const Route = createFileRoute("/notas-fiscais")({
  head: () => ({
    meta: [
      { title: "Notas Fiscais | DJ PAY" },
      {
        name: "description",
        content:
          "Envie, acompanhe e consulte as notas fiscais dos prestadores PJ com arquivos em ambiente privado.",
      },
      { property: "og:title", content: "Notas Fiscais | DJ PAY" },
      {
        property: "og:description",
        content: "Controle das notas fiscais emitidas por prestadores PJ, com anexos privados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

type Invoice = {
  id: string;
  company_id: string;
  contractor_id: string;
  payment_id: string | null;
  numero: string | null;
  competencia: string;
  valor: number;
  data_emissao: string | null;
  data_vencimento: string | null;
  status: string;
  url_arquivo: string | null;
  observacoes: string | null;
  submitted_at: string | null;
};

const INVOICE_SELECT =
  "id, company_id, contractor_id, payment_id, numero, competencia, valor, data_emissao, data_vencimento, status, url_arquivo, observacoes, submitted_at";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "approved", label: "Aprovada" },
  { value: "paid", label: "Paga" },
  { value: "rejected", label: "Rejeitada" },
  { value: "cancelled", label: "Cancelada" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  pending: "border-warning/40 bg-warning/20 text-warning-foreground",
  approved: "border-primary/25 bg-primary/10 text-primary",
  paid: "border-success/30 bg-success/10 text-success",
  rejected: "border-destructive/25 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

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

const emptyForm = {
  contractor_id: "",
  payment_id: "",
  numero: "",
  competencia: "",
  valor: "",
  data_emissao: "",
  data_vencimento: "",
  observacoes: "",
};

function InvoicesPage() {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contractors, setContractors] = useState<{ id: string; nome_completo: string }[]>([]);
  const [payments, setPayments] = useState<
    { id: string; contractor_id: string; descricao: string | null; competencia: string; valor: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [contractorFilter, setContractorFilter] = useState("all");
  const [competenceFilter, setCompetenceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fileError, setFileError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const currentSession = await loadSessionContext();
    if (!currentSession) {
      setSession(null);
      setInvoices([]);
      setErrorMessage(
        "Não foi possível identificar sua sessão ativa e sua empresa. Faça login novamente.",
      );
      setIsLoading(false);
      return;
    }

    setSession(currentSession);

    const invoicesQuery = supabase
      .from("invoices")
      .select(INVOICE_SELECT)
      .eq("company_id", currentSession.companyId)
      .order("competencia", { ascending: false });

    const [invoicesResult, contractorsResult, paymentsResult] = await Promise.all([
      currentSession.contractorId
        ? invoicesQuery.eq("contractor_id", currentSession.contractorId)
        : invoicesQuery,
      supabase
        .from("contractors")
        .select("id, nome_completo")
        .eq("company_id", currentSession.companyId)
        .order("nome_completo", { ascending: true }),
      supabase
        .from("payments")
        .select("id, contractor_id, descricao, competencia, valor")
        .eq("company_id", currentSession.companyId)
        .order("competencia", { ascending: false }),
    ]);

    if (invoicesResult.error) {
      setErrorMessage("Não foi possível carregar as notas fiscais com o seu nível de acesso.");
      setInvoices([]);
    } else {
      setInvoices(invoicesResult.data ?? []);
    }

    setContractors(contractorsResult.data ?? []);
    setPayments(paymentsResult.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contractorsById = useMemo(
    () => new Map(contractors.map((item) => [item.id, item.nome_completo])),
    [contractors],
  );

  const paymentsById = useMemo(() => new Map(payments.map((item) => [item.id, item])), [payments]);

  const competencies = useMemo(
    () => [...new Set(invoices.map((invoice) => invoice.competencia))].sort().reverse(),
    [invoices],
  );

  const filtered = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          (contractorFilter === "all" || invoice.contractor_id === contractorFilter) &&
          (competenceFilter === "all" || invoice.competencia === competenceFilter) &&
          (statusFilter === "all" || invoice.status === statusFilter),
      ),
    [competenceFilter, contractorFilter, invoices, statusFilter],
  );

  const isPj = session?.role === "professional_pj" && Boolean(session.contractorId);
  const isStaff = session ? isStaffRole(session.role) : false;

  const openFile = async (invoice: Invoice) => {
    if (!invoice.url_arquivo) return;
    // Sessão autenticada + signed URL curta. Nunca getPublicUrl.
    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(invoice.url_arquivo, 120);

    if (error || !data?.signedUrl) {
      setErrorMessage("Não foi possível gerar o link temporário deste arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!session) {
      setFormError("Sessão não identificada.");
      return;
    }

    const contractorId = isPj ? session.contractorId! : form.contractor_id;
    if (!contractorId) {
      setFormError("Selecione o profissional da nota fiscal.");
      return;
    }
    if (!form.competencia || !form.valor) {
      setFormError("Informe a competência e o valor da nota.");
      return;
    }
    if (!file) {
      setFormError("Anexe o arquivo da nota fiscal (PDF, XML ou imagem).");
      return;
    }
    const fileProblem = validateInvoiceFile(file);
    if (fileProblem) {
      setFormError(fileProblem);
      return;
    }

    setIsSubmitting(true);

    const insertPayload = {
      company_id: session.companyId,
      contractor_id: contractorId,
      payment_id: form.payment_id || null,
      numero: form.numero.trim() || null,
      competencia: `${form.competencia}-01`,
      valor: Number(form.valor),
      data_emissao: form.data_emissao || null,
      data_vencimento: form.data_vencimento || null,
      observacoes: form.observacoes.trim() || null,
      status: "pending",
      submitted_by_user_id: session.userId,
    };

    const { data: created, error: insertError } = await supabase
      .from("invoices")
      .insert(insertPayload)
      .select(INVOICE_SELECT)
      .single();

    if (insertError || !created) {
      setIsSubmitting(false);
      setFormError(
        "Não foi possível registrar a nota fiscal. Verifique os dados e suas permissões de acesso.",
      );
      return;
    }

    const objectPath = buildInvoiceObjectPath({
      companyId: created.company_id,
      contractorId: created.contractor_id,
      invoiceId: created.id,
      fileName: file.name,
    });

    const { error: uploadError } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(objectPath, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      // Sem linha órfã: remove o registro criado quando o upload falha.
      await supabase.from("invoices").delete().eq("id", created.id);
      setIsSubmitting(false);
      setFormError("Falha no envio do arquivo. Nenhuma nota foi registrada. Tente novamente.");
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({ url_arquivo: objectPath })
      .eq("id", created.id)
      .select(INVOICE_SELECT)
      .single();

    if (updateError || !updated) {
      await supabase.storage.from(INVOICE_BUCKET).remove([objectPath]);
      await supabase.from("invoices").delete().eq("id", created.id);
      setIsSubmitting(false);
      setFormError("Não foi possível vincular o arquivo à nota. Nada foi mantido no sistema.");
      return;
    }

    setInvoices((current) => [updated, ...current]);
    setForm(emptyForm);
    setFile(null);
    setIsFormOpen(false);
    setIsSubmitting(false);
  };

  const statusLabel = (status: string) =>
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

  const paymentOptions = useMemo(
    () =>
      payments.filter((payment) =>
        isPj ? payment.contractor_id === session?.contractorId : payment.contractor_id === form.contractor_id,
      ),
    [form.contractor_id, isPj, payments, session?.contractorId],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge
              variant="outline"
              className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary"
            >
              Documentos fiscais
            </Badge>
            <h1
              className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Notas Fiscais
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {isPj
                ? "Envie suas notas fiscais e acompanhe a situação de cada envio."
                : "Consulte as notas fiscais enviadas pelos profissionais da sua empresa."}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsFormOpen(true)}
            disabled={!session}
            className="rounded-xl"
          >
            <Upload className="mr-2 size-4" />
            Enviar nota fiscal
          </Button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h2
                    className="text-xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Lista de notas
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Os arquivos ficam em bucket privado e abrem por link temporário.
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Carregando..."
                  : `${filtered.length} ${filtered.length === 1 ? "nota" : "notas"}`}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {!isPj && (
                <Select value={contractorFilter} onValueChange={setContractorFilter}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <Search className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        {contractor.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={competenceFilter} onValueChange={setCompetenceFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <Filter className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue placeholder="Competência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as competências</SelectItem>
                  {competencies.map((competence) => (
                    <SelectItem key={competence} value={competence}>
                      {formatCompetence(competence)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl">
                  <Filter className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {errorMessage ? (
            <div className="m-6 flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-border/60">
              {filtered.map((invoice) => (
                <article
                  key={invoice.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-muted/35 lg:flex-row lg:items-center"
                >
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">
                      {contractorsById.get(invoice.contractor_id) ?? "Profissional não encontrado"}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {invoice.numero ? `NF ${invoice.numero}` : "Nota sem número informado"} ·{" "}
                      {formatCompetence(invoice.competencia)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:min-w-[20rem]">
                    <Detail label="Emissão" value={formatDate(invoice.data_emissao)} />
                    <Detail label="Vencimento" value={formatDate(invoice.data_vencimento)} />
                    <Detail
                      label="Pagamento vinculado"
                      value={
                        invoice.payment_id
                          ? paymentsById.get(invoice.payment_id)?.descricao ?? "Pagamento vinculado"
                          : "Sem vínculo"
                      }
                    />
                    <Detail label="Arquivo" value={invoice.url_arquivo ? "Anexado" : "Sem anexo"} />
                  </div>
                  <div className="flex items-center gap-3 lg:min-w-56 lg:justify-end">
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {money(Number(invoice.valor))}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 rounded-full px-2.5 py-0.5 ${STATUS_STYLE[invoice.status] ?? "border-border bg-muted text-muted-foreground"}`}
                      >
                        {statusLabel(invoice.status)}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setSelected(invoice)}
                    >
                      Detalhes
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <p className="mt-4 font-semibold text-foreground">Nenhuma nota fiscal encontrada</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Ajuste os filtros ou envie a primeira nota fiscal deste período.
              </p>
            </div>
          )}
        </section>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="border-border/60 bg-background sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                  Detalhes da nota fiscal
                </DialogTitle>
                <DialogDescription>
                  {selected.numero ? `NF ${selected.numero}` : "Nota sem número informado"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <Detail
                  label="Profissional"
                  value={contractorsById.get(selected.contractor_id) ?? "Não encontrado"}
                />
                <Detail label="Competência" value={formatCompetence(selected.competencia)} />
                <Detail label="Valor" value={money(Number(selected.valor))} />
                <Detail label="Status" value={statusLabel(selected.status)} />
                <Detail label="Emissão" value={formatDate(selected.data_emissao)} />
                <Detail label="Vencimento" value={formatDate(selected.data_vencimento)} />
                <Detail
                  label="Enviada em"
                  value={
                    selected.submitted_at
                      ? new Date(selected.submitted_at).toLocaleString("pt-BR")
                      : "—"
                  }
                />
                <Detail
                  label="Pagamento"
                  value={
                    selected.payment_id
                      ? paymentsById.get(selected.payment_id)?.descricao ?? "Pagamento vinculado"
                      : "Sem vínculo"
                  }
                />
                {selected.observacoes && (
                  <div className="sm:col-span-2">
                    <Detail label="Observações" value={selected.observacoes} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  disabled={!selected.url_arquivo}
                  onClick={() => void openFile(selected)}
                >
                  <Download className="mr-2 size-4" />
                  {selected.url_arquivo ? "Abrir arquivo (link temporário)" : "Sem arquivo anexado"}
                </Button>
                {isStaff && (
                  <p className="w-full text-xs text-muted-foreground">
                    Aprovação, pagamento e cancelamento seguem o fluxo financeiro da empresa.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && setIsFormOpen(false)}>
        <DialogContent className="border-border/60 bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              Enviar nota fiscal
            </DialogTitle>
            <DialogDescription>
              O arquivo é gravado em ambiente privado e nunca fica com link público.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {!isPj && (
              <div className="grid gap-2">
                <Label>Profissional</Label>
                <Select
                  value={form.contractor_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, contractor_id: value, payment_id: "" }))}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        {contractor.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="competencia">Competência</Label>
                <Input
                  id="competencia"
                  type="month"
                  value={form.competencia}
                  onChange={(event) => setForm((current) => ({ ...current, competencia: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor}
                  onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="numero">Número da nota</Label>
                <Input
                  id="numero"
                  value={form.numero}
                  onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data_emissao">Emissão</Label>
                <Input
                  id="data_emissao"
                  type="date"
                  value={form.data_emissao}
                  onChange={(event) => setForm((current) => ({ ...current, data_emissao: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data_vencimento">Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={form.data_vencimento}
                  onChange={(event) => setForm((current) => ({ ...current, data_vencimento: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Pagamento (opcional)</Label>
                <Select
                  value={form.payment_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, payment_id: value }))}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Vincular pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((payment) => (
                      <SelectItem key={payment.id} value={payment.id}>
                        {`${payment.descricao ?? "Pagamento"} · ${formatCompetence(payment.competencia)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={form.observacoes}
                onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arquivo">Arquivo (PDF, XML, PNG, JPG ou WEBP · até 15 MB)</Label>
              <div className="flex items-center gap-3">
                <Paperclip className="size-4 text-muted-foreground" />
                <Input
                  id="arquivo"
                  type="file"
                  accept=".pdf,.xml,.png,.jpg,.jpeg,.webp,application/pdf,application/xml,text/xml,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    setFile(nextFile);
                    setFileError(nextFile ? validateInvoiceFile(nextFile) ?? "" : "");
                  }}
                />
              </div>
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            </div>
            {formError && (
              <p className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={isSubmitting || Boolean(fileError)} className="rounded-xl">
              {isSubmitting ? "Enviando..." : "Enviar nota fiscal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words font-medium text-foreground">{value}</p>
    </div>
  );
}
