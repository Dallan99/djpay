import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  Plus,
  User,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profissionais/$id")({
  component: ProfessionalDetailPage,
});

type Professional = {
  id: string;
  company_id: string;
  nome_completo: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cpf_cnpj: string | null;
  inscricao_municipal: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  cidade: string | null;
  estado: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  area: string | null;
  gestor: string | null;
  data_inicio: string | null;
  valor_mensal: number | null;
  data_vencimento: string | null;
  data_encerramento: string | null;
  ajuda_custo: number | null;
  contrato_observacoes: string | null;
  contrato_status: string | null;
  status: string;
  observacoes: string | null;
};

type ContractBenefit = {
  id: string;
  tipo: string;
  valor: number;
  periodicidade: string;
  requer_nota_fiscal: boolean;
  mes_pagamento: number | null;
  data_pagamento: string | null;
  observacoes: string | null;
};

type BenefitForm = {
  tipo: string;
  valor: string;
  periodicidade: string;
  requer_nota_fiscal: string;
  mes_pagamento: string;
  data_pagamento: string;
  observacoes: string;
};

const BENEFIT_TYPES = [
  { value: "ajuda_custo", label: "Ajuda de custo" },
  { value: "decima_terceira_nota", label: "13ª nota" },
  { value: "ferias_remuneradas", label: "Férias remuneradas" },
  { value: "bonus", label: "Bônus" },
  { value: "plr", label: "PLR" },
  { value: "comissao", label: "Comissão" },
  { value: "premio", label: "Prêmio" },
  { value: "outros", label: "Outros" },
] as const;

const PERIODICITY_LABELS: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  unico: "Pagamento único",
  personalizado: "Personalizado",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const initialBenefitForm: BenefitForm = {
  tipo: "ajuda_custo",
  valor: "",
  periodicidade: "mensal",
  requer_nota_fiscal: "sim",
  mes_pagamento: "",
  data_pagamento: "",
  observacoes: "",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  vacation: "Férias",
  leave: "Afastado",
  terminated: "Encerrado",
};

const STATUS_STYLES: Record<string, string> = {
  active: "border-success/30 bg-success/10 text-success",
  vacation: "border-warning/40 bg-warning/20 text-warning-foreground",
  leave: "border-primary/20 bg-primary/10 text-primary",
  terminated: "border-border bg-muted text-muted-foreground",
};

function formatDate(date: string | null) {
  if (!date) return "Não informada";

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | null) {
  if (value === null) return "Não informado";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function DetailItem({ label, value }: { label: string | number | null }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-foreground">
        {value || "Não informado"}
      </p>
    </div>
  );
}

function ProfessionalDetailPage() {
  const { id } = Route.useParams();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [benefits, setBenefits] = useState<ContractBenefit[]>([]);
  const [isBenefitsLoading, setIsBenefitsLoading] = useState(true);
  const [isBenefitDialogOpen, setIsBenefitDialogOpen] = useState(false);
  const [isSavingBenefit, setIsSavingBenefit] = useState(false);
  const [benefitError, setBenefitError] = useState("");
  const [benefitForm, setBenefitForm] = useState<BenefitForm>(initialBenefitForm);

  useEffect(() => {
    let active = true;

    const loadProfessional = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const companyId =
        typeof authData.user?.user_metadata?.company_id === "string"
          ? authData.user.user_metadata.company_id
          : "";

      if (authError || !authData.user || !companyId) {
        if (active) {
          setProfessional(null);
          setErrorMessage("Não foi possível confirmar sua sessão e empresa vinculada.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("contractors")
        .select(
          "id, company_id, nome_completo, razao_social, nome_fantasia, cpf_cnpj, inscricao_municipal, banco, agencia, conta, tipo_conta, chave_pix, tipo_chave_pix, cidade, estado, email, telefone, cargo, area, gestor, data_inicio, valor_mensal, data_vencimento, data_encerramento, ajuda_custo, contrato_observacoes, contrato_status, status, observacoes",
        )
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setProfessional(null);
        setErrorMessage("Não foi possível carregar os dados deste profissional.");
      } else if (!data) {
        setProfessional(null);
        setErrorMessage("Profissional não encontrado ou indisponível para sua empresa.");
      } else {
        setProfessional(data);

        const { data: benefitsData, error: benefitsError } = await (supabase as any)
          .from("contract_benefits")
          .select("id, tipo, valor, periodicidade, requer_nota_fiscal, mes_pagamento, data_pagamento, observacoes")
          .eq("contractor_id", id)
          .eq("company_id", companyId)
          .order("created_at", { ascending: true });

        if (!active) return;
        setBenefits(benefitsError ? [] : (benefitsData ?? []));
        setIsBenefitsLoading(false);
      }

      setIsLoading(false);
    };

    void loadProfessional();

    return () => {
      active = false;
    };
  }, [id]);

  const updateBenefitField = <Key extends keyof BenefitForm>(key: Key, value: BenefitForm[Key]) => {
    setBenefitForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateBenefit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBenefitError("");

    if (!professional) return;
    const value = Number(benefitForm.valor);
    if (!benefitForm.valor || Number.isNaN(value) || value < 0) {
      setBenefitError("Informe um valor válido para o benefício.");
      return;
    }

    setIsSavingBenefit(true);
    const { error } = await (supabase as any)
      .from("contract_benefits")
      .insert({
        company_id: professional.company_id,
        contractor_id: professional.id,
        tipo: benefitForm.tipo,
        valor: value,
        periodicidade: benefitForm.periodicidade,
        requer_nota_fiscal: benefitForm.requer_nota_fiscal === "sim",
        mes_pagamento: benefitForm.mes_pagamento ? Number(benefitForm.mes_pagamento) : null,
        data_pagamento: benefitForm.data_pagamento || null,
        observacoes: benefitForm.observacoes.trim() || null,
      })
      .select("id, tipo, valor, periodicidade, requer_nota_fiscal, mes_pagamento, data_pagamento, observacoes")
      .single();

    setIsSavingBenefit(false);
    if (error) {
      setBenefitError("Não foi possível salvar o benefício. Verifique suas permissões e tente novamente.");
      return;
    }

    const { data } = await (supabase as any)
      .from("contract_benefits")
      .select("id, tipo, valor, periodicidade, requer_nota_fiscal, mes_pagamento, data_pagamento, observacoes")
      .eq("contractor_id", professional.id)
      .eq("company_id", professional.company_id)
      .order("created_at", { ascending: true });

    setBenefits(data ?? []);
    setBenefitForm(initialBenefitForm);
    setIsBenefitDialogOpen(false);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
        <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-8 sm:py-14">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-muted/70" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted/60" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !professional) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
        <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center sm:px-8">
          <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h1
            className="mt-5 text-3xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Perfil indisponível
          </h1>
          <p className="mt-3 max-w-md leading-7 text-muted-foreground">{errorMessage}</p>
          <Button asChild variant="outline" className="mt-7 rounded-xl">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Voltar para profissionais
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const initials = professional.nome_completo
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const statusLabel = STATUS_LABELS[professional.status] ?? "Não informado";
  const statusStyle = STATUS_STYLES[professional.status] ?? "border-border bg-muted text-muted-foreground";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Button asChild variant="ghost" className="-ml-3 rounded-xl text-muted-foreground hover:text-foreground">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Voltar para profissionais
          </Link>
        </Button>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-muted/30 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-md shadow-primary/20">
                  {initials || <User className="size-7" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">Perfil do profissional</p>
                  <h1
                    className="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {professional.nome_completo}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[professional.cargo, professional.area].filter(Boolean).join(" · ") || "Dados profissionais não informados"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={`w-fit rounded-full px-3 py-1 ${statusStyle}`}>
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-8">
            <DetailItem label="Cargo" value={professional.cargo} />
            <DetailItem label="Área" value={professional.area} />
            <DetailItem label="Gestor" value={professional.gestor} />
            <DetailItem label="CNPJ do prestador" value={professional.cpf_cnpj} />
            <DetailItem label="Razão social" value={professional.razao_social} />
            <DetailItem label="Nome fantasia" value={professional.nome_fantasia} />
            <DetailItem label="Inscrição municipal" value={professional.inscricao_municipal} />
            <DetailItem label="Cidade" value={professional.cidade} />
            <DetailItem label="Estado" value={professional.estado} />
            <DetailItem label="Data de início" value={formatDate(professional.data_inicio)} />
          </div>
        </section>

        <Card className="mt-6 border-border/60 bg-card/75 shadow-md shadow-black/5">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Dados bancários
                </h2>
                <p className="text-sm text-muted-foreground">Informações de pagamento protegidas pelas permissões deste profissional.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Banco" value={professional.banco} />
              <DetailItem label="Agência" value={professional.agencia} />
              <DetailItem label="Conta" value={professional.conta} />
              <DetailItem label="Tipo de conta" value={professional.tipo_conta} />
              <DetailItem label="Chave PIX" value={professional.chave_pix} />
              <DetailItem label="Tipo de chave PIX" value={professional.tipo_chave_pix} />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60 bg-card/75 shadow-md shadow-black/5">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Contrato financeiro
                </h2>
                <p className="text-sm text-muted-foreground">Condições financeiras individuais deste profissional PJ.</p>
              </div>
              {professional.contrato_status && (
                <Badge variant="outline" className="ml-auto rounded-full border-primary/20 bg-primary/5 px-3 py-1 capitalize text-primary">
                  {professional.contrato_status.replaceAll("_", " ")}
                </Badge>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Valor mensal" value={formatCurrency(professional.valor_mensal)} />
              <DetailItem label="Ajuda de custo" value={formatCurrency(professional.ajuda_custo)} />
              <DetailItem label="Data de vencimento" value={formatDate(professional.data_vencimento)} />
              <DetailItem label="Data de início" value={formatDate(professional.data_inicio)} />
              <DetailItem label="Data de encerramento" value={formatDate(professional.data_encerramento)} />
              <DetailItem label="Status do contrato" value={professional.contrato_status?.replaceAll("_", " ") ?? null} />
            </div>
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Observações do contrato</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{professional.contrato_observacoes || "Nenhuma observação contratual cadastrada."}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60 bg-card/75 shadow-md shadow-black/5">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    Benefícios financeiros
                  </h2>
                  <p className="text-sm text-muted-foreground">Condições adicionais configuradas para este contrato.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setBenefitError("");
                  setIsBenefitDialogOpen(true);
                }}
                className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/25 active:scale-[0.98]"
              >
                <Plus className="size-4" />
                Adicionar benefício
              </Button>
            </div>

            {isBenefitsLoading ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-muted/60" />)}
              </div>
            ) : benefits.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit) => (
                  <article key={benefit.id} className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {BENEFIT_TYPES.find((type) => type.value === benefit.tipo)?.label ?? "Outros"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{PERIODICITY_LABELS[benefit.periodicidade] ?? benefit.periodicidade}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
                        {formatCurrency(benefit.valor)}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      <p>{benefit.requer_nota_fiscal ? "Requer nota fiscal" : "Não requer nota fiscal"}</p>
                      {benefit.data_pagamento && <p>Pagamento: {formatDate(benefit.data_pagamento)}</p>}
                      {!benefit.data_pagamento && benefit.mes_pagamento && <p>Mês previsto: {MONTHS[benefit.mes_pagamento - 1]}</p>}
                    </div>
                    {benefit.observacoes && <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-6 text-muted-foreground">{benefit.observacoes}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
                <p className="font-medium text-foreground">Nenhum benefício adicional cadastrado</p>
                <p className="mt-1 text-sm text-muted-foreground">Adicione ajuda de custo, 13ª nota, férias, bônus ou outras condições deste contrato.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-border/60 bg-card/75 shadow-md shadow-black/5">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    Dados de contato
                  </h2>
                  <p className="text-sm text-muted-foreground">Informações cadastradas para este profissional.</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Mail className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">E-mail</p>
                    <p className="mt-1 truncate text-sm font-medium">{professional.email || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Phone className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Telefone</p>
                    <p className="mt-1 text-sm font-medium">{professional.telefone || "Não informado"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/75 shadow-md shadow-black/5">
            <CardContent className="p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    Observações
                  </h2>
                  <p className="text-sm text-muted-foreground">Anotações internas do cadastro.</p>
                </div>
              </div>
              <div className="mt-6 min-h-28 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                {professional.observacoes || "Nenhuma observação cadastrada para este profissional."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isBenefitDialogOpen} onOpenChange={setIsBenefitDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/60 bg-background sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>Adicionar benefício</DialogTitle>
            <DialogDescription>Defina as condições financeiras adicionais deste contrato.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleCreateBenefit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="benefit-type">Tipo de benefício</Label>
                <Select value={benefitForm.tipo} onValueChange={(value) => updateBenefitField("tipo", value)}>
                  <SelectTrigger id="benefit-type" className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{BENEFIT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-value">Valor</Label>
                <Input id="benefit-value" type="number" min="0" step="0.01" required value={benefitForm.valor} onChange={(event) => updateBenefitField("valor", event.target.value)} placeholder="Ex.: 500,00" className="h-10 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-periodicity">Periodicidade</Label>
                <Select value={benefitForm.periodicidade} onValueChange={(value) => updateBenefitField("periodicidade", value)}>
                  <SelectTrigger id="benefit-periodicity" className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem><SelectItem value="trimestral">Trimestral</SelectItem><SelectItem value="semestral">Semestral</SelectItem><SelectItem value="anual">Anual</SelectItem><SelectItem value="unico">Pagamento único</SelectItem><SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-invoice">Necessita nota fiscal?</Label>
                <Select value={benefitForm.requer_nota_fiscal} onValueChange={(value) => updateBenefitField("requer_nota_fiscal", value)}>
                  <SelectTrigger id="benefit-invoice" className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-month">Mês de pagamento</Label>
                <Select value={benefitForm.mes_pagamento} onValueChange={(value) => updateBenefitField("mes_pagamento", value)}>
                  <SelectTrigger id="benefit-month" className="h-10 rounded-xl"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={String(index + 1)}>{month}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-date">Data de pagamento</Label>
                <Input id="benefit-date" type="date" value={benefitForm.data_pagamento} onChange={(event) => updateBenefitField("data_pagamento", event.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit-notes">Observações</Label>
              <textarea id="benefit-notes" value={benefitForm.observacoes} onChange={(event) => updateBenefitField("observacoes", event.target.value)} placeholder="Registre condições ou regras específicas." className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25" />
            </div>
            {benefitError && <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{benefitError}</div>}
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsBenefitDialogOpen(false)} disabled={isSavingBenefit} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={isSavingBenefit} className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">{isSavingBenefit ? "Salvando..." : "Salvar benefício"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
