import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, Mail, Phone, Plus, User } from "lucide-react";
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
import { loadSessionContext } from "@/lib/session";

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
  status: string | null;
};

type BenefitForm = {
  tipo: string;
  valor: string;
  periodicidade: string;
  requer_nota_fiscal: string;
  mes_pagamento: string;
  data_pagamento: string;
  observacoes: string;
  calendario_personalizado: string;
  ferias_ano: string;
  ferias_dias: string;
  ferias_dias_utilizados: string;
  ferias_remuneradas: string;
  ferias_pagamento: string;
};

const BENEFIT_TYPES = [
  { value: "cost_allowance", label: "Ajuda de custo (condição contratual)" },
  { value: "thirteenth_invoice", label: "13ª nota (condição contratual)" },
  { value: "paid_vacation", label: "Férias remuneradas (condição contratual)" },
  { value: "bonus", label: "Bônus (condição contratual)" },
  { value: "profit_sharing", label: "PLR (condição contratual)" },
  { value: "commission", label: "Comissão (condição contratual)" },
  { value: "award", label: "Prêmio (condição contratual)" },
  { value: "other", label: "Outra condição contratual" },
] as const;

const PERIODICITY_LABELS: Record<string, string> = {
  nao_aplicavel: "Não aplicável",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
  unico: "Pagamento único",
  personalizado: "Calendário personalizado",
};

const THIRTEENTH_CONFIGURATION_PREFIX = "[13th_note_config]";
const VACATION_CONFIGURATION_PREFIX = "[vacation_config]";
const DEMO_PROFESSIONALS_KEY = "dj-pay-demo-professionals";

function getDemoBenefitsKey(professionalId: string) {
  return `dj-pay-demo-benefits:${professionalId}`;
}

function readDemoData<Value>(key: string, fallback: Value): Value {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as Value) : fallback;
  } catch {
    return fallback;
  }
}

function getInstallmentCount(periodicity: string, customCalendar = "") {
  if (periodicity === "anual") return 1;
  if (periodicity === "semestral") return 2;
  if (periodicity === "trimestral") return 4;
  if (periodicity === "mensal") return 12;
  if (periodicity === "personalizado") {
    return customCalendar
      .split(",")
      .map((date) => date.trim())
      .filter(Boolean).length;
  }
  return 0;
}

function getThirteenthConfiguration(notes: string | null) {
  if (!notes?.startsWith(THIRTEENTH_CONFIGURATION_PREFIX)) {
    return { calendario: "", observacoes: notes ?? "" };
  }

  const [configuration = "", ...noteParts] = notes.split("\n");
  try {
    const parsed = JSON.parse(configuration.replace(THIRTEENTH_CONFIGURATION_PREFIX, "")) as {
      calendario?: string;
    };
    return { calendario: parsed.calendario ?? "", observacoes: noteParts.join("\n").trim() };
  } catch {
    return { calendario: "", observacoes: noteParts.join("\n").trim() };
  }
}

function getBenefitInstallmentValue(benefit: ContractBenefit) {
  const configuration = getThirteenthConfiguration(benefit.observacoes);
  const installments = getInstallmentCount(benefit.periodicidade, configuration.calendario);
  return installments > 0 ? benefit.valor / installments : null;
}

function getVacationConfiguration(notes: string | null) {
  if (!notes?.startsWith(VACATION_CONFIGURATION_PREFIX)) {
    return {
      ano: new Date().getFullYear(),
      dias: 0,
      diasUtilizados: 0,
      remuneradas: true,
      pagamento: "separado",
      observacoes: notes ?? "",
    };
  }

  const [configuration = "", ...noteParts] = notes.split("\n");
  try {
    const parsed = JSON.parse(configuration.replace(VACATION_CONFIGURATION_PREFIX, "")) as {
      ano?: number;
      dias?: number;
      diasUtilizados?: number;
      remuneradas?: boolean;
      pagamento?: "separado" | "junto_mensal";
    };
    return {
      ano: parsed.ano ?? new Date().getFullYear(),
      dias: parsed.dias ?? 0,
      diasUtilizados: parsed.diasUtilizados ?? 0,
      remuneradas: parsed.remuneradas ?? true,
      pagamento: parsed.pagamento ?? "separado",
      observacoes: noteParts.join("\n").trim(),
    };
  } catch {
    return {
      ano: new Date().getFullYear(),
      dias: 0,
      diasUtilizados: 0,
      remuneradas: true,
      pagamento: "separado",
      observacoes: noteParts.join("\n").trim(),
    };
  }
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const initialBenefitForm: BenefitForm = {
  tipo: "cost_allowance",
  valor: "",
  periodicidade: "mensal",
  requer_nota_fiscal: "sim",
  mes_pagamento: "",
  data_pagamento: "",
  observacoes: "",
  calendario_personalizado: "",
  ferias_ano: String(new Date().getFullYear()),
  ferias_dias: "10",
  ferias_dias_utilizados: "0",
  ferias_remuneradas: "sim",
  ferias_pagamento: "separado",
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

function DetailItem({ label, value }: { label: string; value?: string | number | null }) {
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
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfessional = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const session = await loadSessionContext();
      const companyId = session?.companyId ?? "";

      if (!session || !companyId) {
        if (active) {
          const demoProfessionals = readDemoData<Professional[]>(DEMO_PROFESSIONALS_KEY, []);
          const demoProfessional = demoProfessionals.find((item) => item.id === id) ?? null;
          setIsDemoMode(true);
          setProfessional(
            demoProfessional
              ? { ...demoProfessional, observacoes: demoProfessional.observacoes ?? null }
              : null,
          );
          setBenefits(readDemoData<ContractBenefit[]>(getDemoBenefitsKey(id), []));
          setIsBenefitsLoading(false);
          setErrorMessage(
            demoProfessional ? "" : "Profissional demonstrativo não encontrado neste navegador.",
          );
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
          .from("contractor_financial_benefits")
          .select(
            "id, tipo, valor, periodicidade, requer_nota_fiscal, mes_pagamento, data_pagamento, observacoes, status",
          )
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

  const loadBenefits = async () => {
    if (!professional) return;

    if (isDemoMode) {
      setBenefits(readDemoData<ContractBenefit[]>(getDemoBenefitsKey(professional.id), []));
      return;
    }

    const { data } = await (supabase as any)
      .from("contractor_financial_benefits")
      .select(
        "id, tipo, valor, periodicidade, requer_nota_fiscal, mes_pagamento, data_pagamento, observacoes, status",
      )
      .eq("contractor_id", professional.id)
      .eq("company_id", professional.company_id)
      .order("created_at", { ascending: true });

    setBenefits(data ?? []);
  };

  const openCreateBenefitDialog = () => {
    setBenefitError("");
    setEditingBenefitId(null);
    setBenefitForm(initialBenefitForm);
    setIsBenefitDialogOpen(true);
  };

  const openEditBenefitDialog = (benefit: ContractBenefit) => {
    setBenefitError("");
    setEditingBenefitId(benefit.id);
    const thirteenthConfiguration = getThirteenthConfiguration(benefit.observacoes);
    const vacationConfiguration = getVacationConfiguration(benefit.observacoes);
    setBenefitForm({
      tipo: benefit.tipo,
      valor: String(benefit.valor),
      periodicidade: benefit.periodicidade,
      requer_nota_fiscal: benefit.requer_nota_fiscal ? "sim" : "nao",
      mes_pagamento: benefit.mes_pagamento ? String(benefit.mes_pagamento) : "",
      data_pagamento: benefit.data_pagamento ?? "",
      observacoes:
        benefit.tipo === "paid_vacation"
          ? vacationConfiguration.observacoes
          : thirteenthConfiguration.observacoes,
      calendario_personalizado: thirteenthConfiguration.calendario,
      ferias_ano: String(vacationConfiguration.ano),
      ferias_dias: String(vacationConfiguration.dias || 10),
      ferias_dias_utilizados: String(vacationConfiguration.diasUtilizados),
      ferias_remuneradas: vacationConfiguration.remuneradas ? "sim" : "nao",
      ferias_pagamento: vacationConfiguration.pagamento,
    });
    setIsBenefitDialogOpen(true);
  };

  const handleSaveBenefit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBenefitError("");

    if (!professional) return;
    const isPaidVacation = benefitForm.tipo === "paid_vacation";
    const vacationDays = Number(benefitForm.ferias_dias);
    const vacationDaysUsed = Number(benefitForm.ferias_dias_utilizados);
    const calculatedVacationValue =
      isPaidVacation && benefitForm.ferias_remuneradas === "sim"
        ? ((professional.valor_mensal ?? 0) / 30) * vacationDaysUsed
        : 0;
    const value = isPaidVacation ? calculatedVacationValue : Number(benefitForm.valor);

    if (
      (!isPaidVacation && (!benefitForm.valor || Number.isNaN(value) || value < 0)) ||
      (isPaidVacation && professional.valor_mensal === null)
    ) {
      setBenefitError(
        isPaidVacation
          ? "Informe o valor mensal no contrato para calcular as férias remuneradas."
          : "Informe um valor válido para a condição comercial.",
      );
      return;
    }

    const isThirteenthInvoice = benefitForm.tipo === "thirteenth_invoice";
    const installments = getInstallmentCount(
      benefitForm.periodicidade,
      benefitForm.calendario_personalizado,
    );

    if (
      isThirteenthInvoice &&
      benefitForm.periodicidade === "personalizado" &&
      installments === 0
    ) {
      setBenefitError("Informe ao menos uma data no calendário personalizado.");
      return;
    }

    const thirteenthNotes = `${THIRTEENTH_CONFIGURATION_PREFIX}${JSON.stringify({ calendario: benefitForm.calendario_personalizado.trim() })}`;
    if (isPaidVacation && (!Number.isInteger(vacationDays) || vacationDays < 1)) {
      setBenefitError(
        "Informe uma quantidade válida de dias disponíveis para o período comercial.",
      );
      return;
    }

    if (
      isPaidVacation &&
      (!Number.isInteger(vacationDaysUsed) ||
        vacationDaysUsed < 0 ||
        vacationDaysUsed > vacationDays)
    ) {
      setBenefitError("Os dias utilizados devem ficar entre zero e os dias disponíveis.");
      return;
    }

    const vacationNotes = `${VACATION_CONFIGURATION_PREFIX}${JSON.stringify({
      ano: Number(benefitForm.ferias_ano) || new Date().getFullYear(),
      dias: vacationDays,
      diasUtilizados: vacationDaysUsed,
      remuneradas: benefitForm.ferias_remuneradas === "sim",
      pagamento: benefitForm.ferias_pagamento,
    })}`;
    const benefitData = {
      tipo: benefitForm.tipo,
      valor: value,
      periodicidade: benefitForm.periodicidade,
      requer_nota_fiscal: benefitForm.requer_nota_fiscal === "sim",
      mes_pagamento: benefitForm.mes_pagamento ? Number(benefitForm.mes_pagamento) : null,
      data_pagamento: benefitForm.data_pagamento || null,
      observacoes: isThirteenthInvoice
        ? [thirteenthNotes, benefitForm.observacoes.trim()].filter(Boolean).join("\n")
        : isPaidVacation
          ? [vacationNotes, benefitForm.observacoes.trim()].filter(Boolean).join("\n")
          : benefitForm.observacoes.trim() || null,
    };

    setIsSavingBenefit(true);
    if (isDemoMode) {
      const demoBenefit: ContractBenefit = {
        id: editingBenefitId ?? crypto.randomUUID(),
        ...benefitData,
        status: benefits.find((item) => item.id === editingBenefitId)?.status ?? "active",
      };
      const updatedBenefits = editingBenefitId
        ? benefits.map((item) => (item.id === editingBenefitId ? demoBenefit : item))
        : [...benefits, demoBenefit];
      window.localStorage.setItem(
        getDemoBenefitsKey(professional.id),
        JSON.stringify(updatedBenefits),
      );
      setBenefits(updatedBenefits);
      setIsSavingBenefit(false);
      setBenefitForm(initialBenefitForm);
      setEditingBenefitId(null);
      setIsBenefitDialogOpen(false);
      return;
    }

    const query = (supabase as any).from("contractor_financial_benefits");
    const { error } = editingBenefitId
      ? await query
          .update(benefitData)
          .eq("id", editingBenefitId)
          .eq("company_id", professional.company_id)
          .eq("contractor_id", professional.id)
      : await query.insert({
          ...benefitData,
          company_id: professional.company_id,
          contractor_id: professional.id,
          status: "active",
        });

    setIsSavingBenefit(false);
    if (error) {
      setBenefitError(
        "Não foi possível salvar a condição comercial. Verifique suas permissões e tente novamente.",
      );
      return;
    }

    await loadBenefits();
    setBenefitForm(initialBenefitForm);
    setEditingBenefitId(null);
    setIsBenefitDialogOpen(false);
  };

  const handleBenefitStatusChange = async (benefit: ContractBenefit) => {
    if (!professional) return;

    const isActive = benefit.status !== "inactive";
    if (isDemoMode) {
      const updatedBenefits = benefits.map((item) =>
        item.id === benefit.id ? { ...item, status: isActive ? "inactive" : "active" } : item,
      );
      window.localStorage.setItem(
        getDemoBenefitsKey(professional.id),
        JSON.stringify(updatedBenefits),
      );
      setBenefits(updatedBenefits);
      return;
    }

    const { error } = await (supabase as any)
      .from("contractor_financial_benefits")
      .update({ status: isActive ? "inactive" : "active" })
      .eq("id", benefit.id)
      .eq("company_id", professional.company_id)
      .eq("contractor_id", professional.id);

    if (error) {
      setBenefitError("Não foi possível atualizar o status da condição comercial.");
      return;
    }

    await loadBenefits();
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
  const statusStyle =
    STATUS_STYLES[professional.status] ?? "border-border bg-muted text-muted-foreground";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Button
          asChild
          variant="ghost"
          className="-ml-3 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="size-4" />
            Voltar para profissionais
          </Link>
        </Button>

        {isDemoMode && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="font-semibold text-primary">Modo demonstração.</span> Este perfil e
            suas condições comerciais ficam salvos somente neste navegador até o acesso com uma
            conta da empresa.
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-muted/30 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-md shadow-primary/20">
                  {initials || <User className="size-7" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    Perfil do profissional
                  </p>
                  <h1
                    className="mt-1 truncate text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {professional.nome_completo}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[professional.cargo, professional.area].filter(Boolean).join(" · ") ||
                      "Dados profissionais não informados"}
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
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Dados bancários
                </h2>
                <p className="text-sm text-muted-foreground">
                  Informações de pagamento protegidas pelas permissões deste profissional.
                </p>
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
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Contrato financeiro
                </h2>
                <p className="text-sm text-muted-foreground">
                  Condições comerciais individuais acordadas entre a empresa e este prestador PJ.
                </p>
              </div>
              {professional.contrato_status && (
                <Badge
                  variant="outline"
                  className="ml-auto rounded-full border-primary/20 bg-primary/5 px-3 py-1 capitalize text-primary"
                >
                  {professional.contrato_status.replaceAll("_", " ")}
                </Badge>
              )}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Valor mensal" value={formatCurrency(professional.valor_mensal)} />
              <DetailItem
                label="Ajuda de custo acordada"
                value={formatCurrency(professional.ajuda_custo)}
              />
              <DetailItem
                label="Data de vencimento"
                value={formatDate(professional.data_vencimento)}
              />
              <DetailItem label="Data de início" value={formatDate(professional.data_inicio)} />
              <DetailItem
                label="Data de encerramento"
                value={formatDate(professional.data_encerramento)}
              />
              <DetailItem
                label="Status do contrato"
                value={professional.contrato_status?.replaceAll("_", " ") ?? null}
              />
            </div>
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Observações do contrato
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                {professional.contrato_observacoes || "Nenhuma observação contratual cadastrada."}
              </p>
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
                  <h2
                    className="text-xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Condições comerciais configuráveis
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Itens financeiros definidos em contrato entre a empresa e este prestador PJ.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={openCreateBenefitDialog}
                className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/25 active:scale-[0.98]"
              >
                <Plus className="size-4" />
                Adicionar condição
              </Button>
            </div>

            {isBenefitsLoading ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-36 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : benefits.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit) => (
                  <article
                    key={benefit.id}
                    className={`rounded-xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg ${benefit.status === "inactive" ? "border-border/60 bg-muted/40 opacity-75" : "border-border/60 bg-muted/20"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {BENEFIT_TYPES.find((type) => type.value === benefit.tipo)?.label ??
                              "Outros"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2 py-0.5 ${benefit.status === "inactive" ? "border-border bg-muted text-muted-foreground" : "border-success/30 bg-success/10 text-success"}`}
                          >
                            {benefit.status === "inactive" ? "Inativo" : "Ativo"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {PERIODICITY_LABELS[benefit.periodicidade] ?? benefit.periodicidade}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-primary/20 bg-primary/5 text-primary"
                      >
                        {benefit.tipo === "thirteenth_invoice"
                          ? `Total: ${formatCurrency(benefit.valor)}`
                          : formatCurrency(benefit.valor)}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      {benefit.tipo === "thirteenth_invoice" &&
                        benefit.periodicidade !== "nao_aplicavel" &&
                        getBenefitInstallmentValue(benefit) !== null && (
                          <p className="font-medium text-primary">
                            {getInstallmentCount(
                              benefit.periodicidade,
                              getThirteenthConfiguration(benefit.observacoes).calendario,
                            )}{" "}
                            parcela(s) de {formatCurrency(getBenefitInstallmentValue(benefit))}
                          </p>
                        )}
                      {benefit.tipo === "thirteenth_invoice" &&
                        benefit.periodicidade === "nao_aplicavel" && (
                          <p>Condição não aplicável a este contrato.</p>
                        )}
                      {benefit.tipo === "paid_vacation" &&
                        (() => {
                          const vacation = getVacationConfiguration(benefit.observacoes);
                          const balance = Math.max(vacation.dias - vacation.diasUtilizados, 0);
                          return (
                            <>
                              <p className="font-medium text-primary">
                                {vacation.ano}: {vacation.dias} dias disponíveis ·{" "}
                                {vacation.diasUtilizados} utilizados · {balance} de saldo
                              </p>
                              <p>
                                {vacation.remuneradas
                                  ? "Período comercial remunerado"
                                  : "Período comercial não remunerado"}
                              </p>
                              {vacation.remuneradas && (
                                <p className="font-medium text-primary">
                                  {vacation.pagamento === "junto_mensal"
                                    ? "Pago junto ao valor mensal"
                                    : "Pago separadamente"}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      <p>
                        {benefit.requer_nota_fiscal
                          ? "Requer nota fiscal"
                          : "Não requer nota fiscal"}
                      </p>
                      {benefit.data_pagamento && (
                        <p>Pagamento: {formatDate(benefit.data_pagamento)}</p>
                      )}
                      {!benefit.data_pagamento && benefit.mes_pagamento && (
                        <p>Mês previsto: {MONTHS[benefit.mes_pagamento - 1]}</p>
                      )}
                    </div>
                    {benefit.tipo === "thirteenth_invoice" &&
                      getThirteenthConfiguration(benefit.observacoes).calendario && (
                        <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-6 text-muted-foreground">
                          Calendário: {getThirteenthConfiguration(benefit.observacoes).calendario}
                        </p>
                      )}
                    {(benefit.tipo === "paid_vacation"
                      ? getVacationConfiguration(benefit.observacoes).observacoes
                      : getThirteenthConfiguration(benefit.observacoes).observacoes) && (
                      <p className="mt-3 border-t border-border/60 pt-3 text-sm leading-6 text-muted-foreground">
                        {benefit.tipo === "paid_vacation"
                          ? getVacationConfiguration(benefit.observacoes).observacoes
                          : getThirteenthConfiguration(benefit.observacoes).observacoes}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditBenefitDialog(benefit)}
                        className="rounded-lg"
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleBenefitStatusChange(benefit)}
                        className="rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        {benefit.status === "inactive" ? "Ativar" : "Desativar"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center">
                <p className="font-medium text-foreground">
                  Nenhuma condição comercial adicional cadastrada
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione itens acordados, como ajuda de custo, 13ª nota, férias remuneradas, bônus
                  ou outras condições deste contrato.
                </p>
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
                  <h2
                    className="text-xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Dados de contato
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Informações cadastradas para este profissional.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Mail className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      E-mail
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {professional.email || "Não informado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <Phone className="size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Telefone
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {professional.telefone || "Não informado"}
                    </p>
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
                  <h2
                    className="text-xl font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Observações
                  </h2>
                  <p className="text-sm text-muted-foreground">Anotações internas do cadastro.</p>
                </div>
              </div>
              <div className="mt-6 min-h-28 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                {professional.observacoes ||
                  "Nenhuma observação cadastrada para este profissional."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={isBenefitDialogOpen}
        onOpenChange={(open) => {
          setIsBenefitDialogOpen(open);
          if (!open) {
            setBenefitError("");
            setEditingBenefitId(null);
            setBenefitForm(initialBenefitForm);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-border/60 bg-background sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              {editingBenefitId ? "Editar condição comercial" : "Adicionar condição comercial"}
            </DialogTitle>
            <DialogDescription>
              Defina itens financeiros comerciais acordados entre a empresa e o prestador. Eles não
              representam direitos trabalhistas obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSaveBenefit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="benefit-type">Tipo de condição comercial</Label>
                <Select
                  value={benefitForm.tipo}
                  onValueChange={(value) => updateBenefitField("tipo", value)}
                >
                  <SelectTrigger id="benefit-type" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-value">
                  {benefitForm.tipo === "thirteenth_invoice"
                    ? "Valor total previsto"
                    : benefitForm.tipo === "paid_vacation"
                      ? "Valor calculado das férias"
                      : "Valor"}
                </Label>
                <Input
                  id="benefit-value"
                  type="number"
                  min="0"
                  step="0.01"
                  required={benefitForm.tipo !== "paid_vacation"}
                  readOnly={benefitForm.tipo === "paid_vacation"}
                  value={
                    benefitForm.tipo === "paid_vacation"
                      ? String(
                          benefitForm.ferias_remuneradas === "sim"
                            ? ((professional.valor_mensal ?? 0) / 30) *
                                (Number(benefitForm.ferias_dias_utilizados) || 0)
                            : 0,
                        )
                      : benefitForm.valor
                  }
                  onChange={(event) => updateBenefitField("valor", event.target.value)}
                  placeholder="Ex.: 500,00"
                  className="h-10 rounded-xl read-only:bg-muted/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-periodicity">Periodicidade</Label>
                <Select
                  value={benefitForm.periodicidade}
                  onValueChange={(value) => updateBenefitField("periodicidade", value)}
                >
                  <SelectTrigger id="benefit-periodicity" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {benefitForm.tipo === "thirteenth_invoice" && (
                      <SelectItem value="nao_aplicavel">Não aplicável</SelectItem>
                    )}
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="unico">Pagamento único</SelectItem>
                    <SelectItem value="personalizado">Calendário personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-invoice">Necessita nota fiscal?</Label>
                <Select
                  value={benefitForm.requer_nota_fiscal}
                  onValueChange={(value) => updateBenefitField("requer_nota_fiscal", value)}
                >
                  <SelectTrigger id="benefit-invoice" className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-month">Mês de pagamento</Label>
                <Select
                  value={benefitForm.mes_pagamento}
                  onValueChange={(value) => updateBenefitField("mes_pagamento", value)}
                >
                  <SelectTrigger id="benefit-month" className="h-10 rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefit-date">Data de pagamento</Label>
                <Input
                  id="benefit-date"
                  type="date"
                  value={benefitForm.data_pagamento}
                  onChange={(event) => updateBenefitField("data_pagamento", event.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            {benefitForm.tipo === "paid_vacation" && (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Configuração do período comercial
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Defina esta condição específica do contrato PJ. Ela não representa direito
                  trabalhista obrigatório.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vacation-year">Ano de referência</Label>
                    <Input
                      id="vacation-year"
                      type="number"
                      min="2000"
                      max="2100"
                      value={benefitForm.ferias_ano}
                      onChange={(event) => updateBenefitField("ferias_ano", event.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vacation-days">Dias disponíveis</Label>
                    <Select
                      value={
                        ["10", "15", "20", "30"].includes(benefitForm.ferias_dias)
                          ? benefitForm.ferias_dias
                          : "personalizado"
                      }
                      onValueChange={(value) =>
                        updateBenefitField("ferias_dias", value === "personalizado" ? "" : value)
                      }
                    >
                      <SelectTrigger id="vacation-days" className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="20">20 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="personalizado">Quantidade personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!["10", "15", "20", "30"].includes(benefitForm.ferias_dias) && (
                    <div className="space-y-2">
                      <Label htmlFor="vacation-custom-days">Quantidade personalizada</Label>
                      <Input
                        id="vacation-custom-days"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={benefitForm.ferias_dias}
                        onChange={(event) => updateBenefitField("ferias_dias", event.target.value)}
                        placeholder="Ex.: 25"
                        className="h-10 rounded-xl"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="vacation-days-used">Dias utilizados</Label>
                    <Input
                      id="vacation-days-used"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={benefitForm.ferias_dias_utilizados}
                      onChange={(event) =>
                        updateBenefitField("ferias_dias_utilizados", event.target.value)
                      }
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vacation-paid">O período é remunerado?</Label>
                    <Select
                      value={benefitForm.ferias_remuneradas}
                      onValueChange={(value) => updateBenefitField("ferias_remuneradas", value)}
                    >
                      <SelectTrigger id="vacation-paid" className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim, remunerado</SelectItem>
                        <SelectItem value="nao">Não remunerado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vacation-payment">Como será pago?</Label>
                    <Select
                      value={benefitForm.ferias_pagamento}
                      onValueChange={(value) => updateBenefitField("ferias_pagamento", value)}
                      disabled={benefitForm.ferias_remuneradas === "nao"}
                    >
                      <SelectTrigger id="vacation-payment" className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="separado">Pago separadamente</SelectItem>
                        <SelectItem value="junto_mensal">Junto ao pagamento mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {Number.isFinite(Number(benefitForm.ferias_dias)) && (
                  <div className="mt-4 rounded-lg border border-primary/15 bg-background/70 p-3 text-sm">
                    <p className="text-primary">
                      Saldo de{" "}
                      {Math.max(
                        Number(benefitForm.ferias_dias) -
                          (Number(benefitForm.ferias_dias_utilizados) || 0),
                        0,
                      )}{" "}
                      dia(s) para {benefitForm.ferias_ano || "o ano informado"}.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {benefitForm.ferias_remuneradas === "sim"
                        ? `Cálculo: ${formatCurrency(professional.valor_mensal)} ÷ 30 × ${Number(benefitForm.ferias_dias_utilizados) || 0} dia(s) = ${formatCurrency(((professional.valor_mensal ?? 0) / 30) * (Number(benefitForm.ferias_dias_utilizados) || 0))}.`
                        : "Período não remunerado: não há valor adicional a pagar."}
                    </p>
                  </div>
                )}
              </div>
            )}
            {benefitForm.tipo === "thirteenth_invoice" && (
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">Configuração da 13ª nota</p>
                {benefitForm.periodicidade === "personalizado" && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="thirteenth-calendar">Datas previstas do calendário</Label>
                    <Input
                      id="thirteenth-calendar"
                      value={benefitForm.calendario_personalizado}
                      onChange={(event) =>
                        updateBenefitField("calendario_personalizado", event.target.value)
                      }
                      placeholder="Ex.: 15/03, 15/06, 15/09, 15/12"
                      className="h-10 rounded-xl"
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Informe uma data para cada parcela, separando-as por vírgula.
                    </p>
                  </div>
                )}
                {benefitForm.periodicidade !== "nao_aplicavel" &&
                  benefitForm.valor &&
                  getInstallmentCount(
                    benefitForm.periodicidade,
                    benefitForm.calendario_personalizado,
                  ) > 0 && (
                    <p className="mt-3 text-sm text-primary">
                      {getInstallmentCount(
                        benefitForm.periodicidade,
                        benefitForm.calendario_personalizado,
                      )}{" "}
                      parcela(s) previstas de{" "}
                      {formatCurrency(
                        Number(benefitForm.valor) /
                          getInstallmentCount(
                            benefitForm.periodicidade,
                            benefitForm.calendario_personalizado,
                          ),
                      )}
                      .
                    </p>
                  )}
                {benefitForm.periodicidade === "nao_aplicavel" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Esta condição ficará registrada como não aplicável ao contrato atual.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="benefit-notes">Observações</Label>
              <textarea
                id="benefit-notes"
                value={benefitForm.observacoes}
                onChange={(event) => updateBenefitField("observacoes", event.target.value)}
                placeholder="Registre condições ou regras específicas."
                className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/25"
              />
            </div>
            {benefitError && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                {benefitError}
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBenefitDialogOpen(false)}
                disabled={isSavingBenefit}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingBenefit}
                className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSavingBenefit
                  ? "Salvando..."
                  : editingBenefitId
                    ? "Salvar alterações"
                    : "Salvar condição"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
