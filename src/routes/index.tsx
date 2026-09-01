import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronRight,
  FileText,
  Filter,
  Search,
  Upload,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  MESES,
  KIND_LABEL,
  brl,
  buildSchedule,
  totals,
  usePjStore,
  type InvoiceKind,
} from "@/lib/pj";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel PJ — 13ª nota, férias e ajuda de custo" },
      {
        name: "description",
        content:
          "Organize seu contrato PJ: salário, ajuda de custo, 13ª nota parcelada e férias remuneradas, com o calendário de notas a emitir no ano.",
      },
      { property: "og:title", content: "Painel PJ — 13ª nota, férias e ajuda de custo" },
      {
        property: "og:description",
        content:
          "Calendário de notas fiscais para quem trabalha como PJ: salário, ajuda de custo, 13ª nota e férias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const KIND_STYLE: Record<InvoiceKind, string> = {
  salario: "bg-primary/10 text-primary border-primary/20",
  ajuda: "bg-accent/40 text-accent-foreground border-accent",
  decimo: "bg-warning/25 text-warning-foreground border-warning/40",
  ferias: "bg-success/15 text-success border-success/30",
};

function Index() {
  return <ProfessionalsPage />;
}

function LegacyPjPanel() {
  const { hydrated, config, update, done, toggle } = usePjStore();
  const schedule = useMemo(() => buildSchedule(config), [config]);
  const t = useMemo(() => totals(schedule), [schedule]);

  const mesAtual = new Date().getMonth() + 1;
  const pendentes = schedule.filter((i) => !done[i.id]);
  const doMes = schedule.filter((i) => i.mes === mesAtual);
  const emitidasCount = schedule.length - pendentes.length;

  const toggleDecimoMes = (mes: number) => {
    const has = config.decimoMeses.includes(mes);
    const next = has
      ? config.decimoMeses.filter((m) => m !== mes)
      : [...config.decimoMeses, mes];
    update("decimoMeses", next.sort((a, b) => a - b));
  };

  return (
    <main className="min-h-screen bg-background font-sans">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8">
          <Badge variant="outline" className="w-fit border-primary/30 text-primary">
            Contrato PJ{hydrated ? ` · ${config.ano}` : ""}
          </Badge>
          <h1
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Painel de pagamentos PJ
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Salário, ajuda de custo, 13ª nota (integral ou trimestral) e férias
            remuneradas — com o calendário de todas as notas que você precisa emitir no
            ano.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total no ano" value={brl(t.total)} hint="soma de todas as notas" />
          <StatCard title="Média mensal" value={brl(t.media)} hint="total ÷ 12 meses" />
          <StatCard
            title="13ª nota"
            value={brl(t.decimo)}
            hint={
              config.decimoModo === "trimestral"
                ? `${config.decimoMeses.length} parcelas de ${brl(
                    t.decimo / Math.max(config.decimoMeses.length, 1),
                  )}`
                : "nota integral em dezembro"
            }
          />
          <StatCard
            title="Férias"
            value={brl(t.ferias)}
            hint={`${config.feriasDias} dias em ${MESES[config.feriasMes - 1]}`}
          />
        </section>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle style={{ fontFamily: "var(--font-display)" }}>
                Seu contrato
              </CardTitle>
              <CardDescription>
                Tudo é salvo automaticamente neste navegador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="salario">Salário mensal (nota)</Label>
                <Input
                  id="salario"
                  type="number"
                  min={0}
                  value={config.salario}
                  onChange={(e) => update("salario", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ajuda">Ajuda de custo mensal</Label>
                <Input
                  id="ajuda"
                  type="number"
                  min={0}
                  value={config.ajudaCusto}
                  onChange={(e) => update("ajudaCusto", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>13ª nota</Label>
                <Select
                  value={config.decimoModo}
                  onValueChange={(v) => update("decimoModo", v as "dezembro" | "trimestral")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dezembro">Integral em dezembro</SelectItem>
                    <SelectItem value="trimestral">Parcelada (a cada 3 meses)</SelectItem>
                  </SelectContent>
                </Select>
                {config.decimoModo === "trimestral" && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {MESES.map((m, i) => {
                      const mes = i + 1;
                      const active = config.decimoMeses.includes(mes);
                      return (
                        <Button
                          key={m}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleDecimoMes(mes)}
                        >
                          {m.slice(0, 3)}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Dias de férias</Label>
                  <Select
                    value={String(config.feriasDias)}
                    onValueChange={(v) => update("feriasDias", Number(v) as 10 | 20 | 30)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 dias</SelectItem>
                      <SelectItem value="20">20 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mês das férias</Label>
                  <Select
                    value={String(config.feriasMes)}
                    onValueChange={(v) => update("feriasMes", Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dia">Dia habitual de emissão</Label>
                <Input
                  id="dia"
                  type="number"
                  min={1}
                  max={31}
                  value={config.diaEmissao}
                  onChange={(e) => update("diaEmissao", Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: "var(--font-display)" }}>
                  Notas de {MESES[mesAtual - 1]}
                </CardTitle>
                <CardDescription>
                  Emitir até o dia {config.diaEmissao} · {brl(doMes.reduce((s, i) => s + i.valor, 0))}{" "}
                  no mês
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {doMes.map((i) => (
                  <label
                    key={i.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={hydrated ? !!done[i.id] : false}
                      onCheckedChange={() => toggle(i.id)}
                    />
                    <span className="flex-1 text-sm font-medium">{i.label}</span>
                    <Badge variant="outline" className={KIND_STYLE[i.kind]}>
                      {KIND_LABEL[i.kind]}
                    </Badge>
                    <span className="w-28 text-right text-sm tabular-nums">
                      {brl(i.valor)}
                    </span>
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: "var(--font-display)" }}>
                  Calendário do ano
                </CardTitle>
                <CardDescription>
                  {emitidasCount} de {schedule.length} notas marcadas como emitidas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {MESES.map((mesNome, idx) => {
                  const mes = idx + 1;
                  const itens = schedule.filter((i) => i.mes === mes);
                  const soma = itens.reduce((s, i) => s + i.valor, 0);
                  return (
                    <div
                      key={mesNome}
                      className={`rounded-xl border p-4 ${
                        mes === mesAtual ? "border-primary/40 bg-primary/5" : "bg-card"
                      }`}
                    >
                      <div className="mb-3 flex items-baseline justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {mesNome}
                        </h3>
                        <span className="text-sm font-semibold tabular-nums">
                          {brl(soma)}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {itens.map((i) => (
                          <li key={i.id} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={hydrated ? !!done[i.id] : false}
                              onCheckedChange={() => toggle(i.id)}
                            />
                            <span
                              className={`flex-1 ${
                                hydrated && done[i.id]
                                  ? "text-muted-foreground line-through"
                                  : ""
                              }`}
                            >
                              {i.label}
                            </span>
                            <Badge variant="outline" className={KIND_STYLE[i.kind]}>
                              {KIND_LABEL[i.kind]}
                            </Badge>
                            <span className="w-28 text-right tabular-nums">
                              {brl(i.valor)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

const DOCUMENT_CATEGORIES = [
  "CNH",
  "Comprovante de residência",
  "CPF",
  "CNPJ",
  "Dados bancários",
  "Chave Pix",
  "Dados da empresa",
  "Endereço da empresa",
  "Endereço do sócio",
] as const;

type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

type EmployeeDocument = {
  id: string;
  name: string;
  size: number;
  type: string;
  category: DocumentCategory;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  admissionDate: string;
  photoUrl: string;
  documents: EmployeeDocument[];
};

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "vacation", label: "Férias" },
  { value: "leave", label: "Afastado" },
  { value: "terminated", label: "Encerrado" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  active: "border-success/30 bg-success/10 text-success",
  vacation: "border-warning/40 bg-warning/20 text-warning-foreground",
  leave: "border-primary/20 bg-primary/10 text-primary",
  terminated: "border-border bg-muted text-muted-foreground",
};

type Professional = {
  id: string;
  company_id: string;
  nome_completo: string;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  area: string | null;
  gestor: string | null;
  data_inicio: string | null;
  status: string;
};

function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    const loadProfessionals = async () => {
      setIsLoading(true);
      setErrorMessage("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        if (active) {
          setProfessionals([]);
          setErrorMessage("Não foi possível identificar sua sessão. Faça login novamente.");
          setIsLoading(false);
        }
        return;
      }

      const metadata = authData.user.user_metadata ?? {};
      const companyId = typeof metadata.company_id === "string" ? metadata.company_id : "";

      if (!companyId) {
        if (active) {
          setProfessionals([]);
          setErrorMessage("Sua conta não possui uma empresa associada.");
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("contractors")
        .select("id, company_id, nome_completo, cpf_cnpj, email, telefone, cargo, area, gestor, data_inicio, status")
        .eq("company_id", companyId)
        .order("nome_completo", { ascending: true });

      if (!active) return;

      if (error) {
        setProfessionals([]);
        setErrorMessage("Não foi possível carregar os profissionais da empresa.");
      } else {
        setProfessionals(data ?? []);
      }
      setIsLoading(false);
    };

    void loadProfessionals();

    return () => {
      active = false;
    };
  }, []);

  const areas = useMemo(
    () => [...new Set(professionals.map((professional) => professional.area).filter(Boolean))] as string[],
    [professionals],
  );

  const filteredProfessionals = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");

    return professionals.filter((professional) => {
      const searchableFields = [
        professional.nome_completo,
        professional.cpf_cnpj,
        professional.email,
        professional.telefone,
        professional.cargo,
        professional.area,
        professional.gestor,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return (
        (!normalizedSearch || searchableFields.includes(normalizedSearch)) &&
        (statusFilter === "all" || professional.status === statusFilter) &&
        (areaFilter === "all" || professional.area === areaFilter)
      );
    });
  }, [areaFilter, professionals, searchTerm, statusFilter]);

  const getStatusLabel = (status: string) =>
    STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Não informado";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              Gestão de pessoas
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              Profissionais
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Consulte os profissionais vinculados à sua empresa e acompanhe seus dados cadastrais em um só lugar.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/75 px-4 py-3 shadow-sm shadow-black/5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total cadastrado</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
              {isLoading ? "—" : professionals.length}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-muted/20 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Lista de profissionais</h2>
                  <p className="text-sm text-muted-foreground">Os resultados exibidos pertencem exclusivamente à sua empresa.</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Carregando..." : `${filteredProfessionals.length} ${filteredProfessionals.length === 1 ? "resultado" : "resultados"}`}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, CPF, e-mail, cargo, área ou gestor"
                  className="h-10 rounded-xl pl-9 focus-visible:ring-2 focus-visible:ring-primary/25"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25">
                  <Filter className="mr-2 size-4 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="h-10 rounded-xl focus:ring-2 focus:ring-primary/25">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {areas.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
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
              {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted/60" />)}
            </div>
          ) : filteredProfessionals.length > 0 ? (
            <div className="divide-y divide-border/60">
              {filteredProfessionals.map((professional) => {
                const initials = professional.nome_completo.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                return (
                  <article key={professional.id} className="flex flex-col gap-4 p-5 transition-all duration-300 hover:bg-muted/35 sm:flex-row sm:items-center">
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-foreground">{professional.nome_completo}</h3>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {[professional.cargo, professional.area].filter(Boolean).join(" · ") || "Cargo não informado"}
                      </p>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground sm:min-w-52">
                      <span className="truncate">{professional.email || "E-mail não informado"}</span>
                      <span>{professional.telefone || "Telefone não informado"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:min-w-40 sm:justify-end">
                      {professional.gestor && <span className="text-sm text-muted-foreground">Gestor: {professional.gestor}</span>}
                      <Badge variant="outline" className={`rounded-full px-3 py-1 ${STATUS_STYLE[professional.status] ?? "border-border bg-muted text-muted-foreground"}`}>
                        {getStatusLabel(professional.status)}
                      </Badge>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><User className="size-5" /></div>
              <p className="mt-4 font-semibold text-foreground">Nenhum profissional encontrado</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">Ajuste a busca ou os filtros para encontrar outro profissional.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EmployeeDashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [employeePhoto, setEmployeePhoto] = useState<File | null>(null);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<DocumentCategory>("CNH");
  const [photoPreview, setPhotoPreview] = useState("");
  const [saved, setSaved] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    admissionDate: "",
  });
  const { hydrated, config, done } = usePjStore();
  const invoiceSummary = useMemo(() => {
    const schedule = buildSchedule(config);
    const emitted = schedule.filter((invoice) => done[invoice.id]);
    const pending = schedule.filter((invoice) => !done[invoice.id]);

    return {
      total: schedule.length,
      totalValue: schedule.reduce((sum, invoice) => sum + invoice.valor, 0),
      emittedCount: emitted.length,
      emittedValue: emitted.reduce((sum, invoice) => sum + invoice.valor, 0),
      pendingCount: pending.length,
      pendingValue: pending.reduce((sum, invoice) => sum + invoice.valor, 0),
    };
  }, [config, done]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setEmployeePhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedEmployee) return;

    const document: EmployeeDocument = {
      id: `${selectedDocumentCategory}-${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type,
      category: selectedDocumentCategory,
    };
    const updatedEmployee = {
      ...selectedEmployee,
      documents: [...selectedEmployee.documents, document],
    };

    setEmployees((current) =>
      current.map((employee) =>
        employee.id === updatedEmployee.id ? updatedEmployee : employee,
      ),
    );
    setSelectedEmployee(updatedEmployee);
    event.target.value = "";
  };

  const filteredEmployees = employees.filter((employee) =>
    `${employee.name} ${employee.role} ${employee.email}`
      .toLocaleLowerCase("pt-BR")
      .includes(searchTerm.toLocaleLowerCase("pt-BR")),
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 font-sans">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">Equipe</p>
              <p className="text-sm text-muted-foreground">Cadastro e importação de colaboradores</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
            Configuração inicial
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="mb-10 max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Gestão de pessoas</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            Organize sua equipe em um só lugar.
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            Cadastre colaboradores individualmente ou prepare uma planilha para importação. Nesta etapa, os dados ficam somente nesta tela.
          </p>
        </div>

        <section className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-success/20 bg-card/80 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-success/40 hover:shadow-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notas emitidas</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                    {hydrated ? invoiceSummary.emittedCount : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{hydrated ? brl(invoiceSummary.emittedValue) : "Carregando resumo"}</p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-success/15 text-success">
                  <Check className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-card/80 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-warning/60 hover:shadow-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notas pendentes</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                    {hydrated ? invoiceSummary.pendingCount : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{hydrated ? brl(invoiceSummary.pendingValue) : "Carregando resumo"}</p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-warning/25 text-warning-foreground">
                  <AlertCircle className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl sm:col-span-2 lg:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Previsão anual</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                    {hydrated ? invoiceSummary.total : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{hydrated ? brl(invoiceSummary.totalValue) : "Carregando resumo"}</p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <User className="size-5" />
              </div>
              <CardTitle className="pt-3 text-xl" style={{ fontFamily: "var(--font-display)" }}>
                Cadastrar funcionário
              </CardTitle>
              <CardDescription>Preencha os dados básicos para incluir um novo colaborador.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const employee: Employee = {
                    id: crypto.randomUUID(),
                    ...formData,
                    photoUrl: photoPreview,
                    documents: [],
                  };
                  setEmployees((current) => [employee, ...current]);
                  setFormData({ name: "", email: "", phone: "", role: "", admissionDate: "" });
                  setEmployeePhoto(null);
                  setPhotoPreview("");
                  setSaved(true);
                }}
              >
                <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <label htmlFor="foto-funcionario" className="group relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-primary/30 bg-primary/10 text-primary transition-all duration-200 hover:border-primary hover:scale-105">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Prévia da foto" className="size-full object-cover" />
                    ) : (
                      <User className="size-6" />
                    )}
                    <input id="foto-funcionario" type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                  </label>
                  <div className="min-w-0">
                    <Label htmlFor="foto-funcionario" className="cursor-pointer">Foto do funcionário</Label>
                    <p className="mt-1 text-sm text-muted-foreground">Clique no avatar para selecionar uma imagem.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Marina Oliveira" className="focus-visible:ring-2 focus-visible:ring-primary/25" required />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail corporativo</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} placeholder="nome@empresa.com" className="focus-visible:ring-2 focus-visible:ring-primary/25" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input id="telefone" type="tel" value={formData.phone} onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))} placeholder="(00) 00000-0000" className="focus-visible:ring-2 focus-visible:ring-primary/25" />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input id="cargo" value={formData.role} onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))} placeholder="Ex.: Analista financeiro" className="focus-visible:ring-2 focus-visible:ring-primary/25" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissao">Data de admissão</Label>
                    <Input id="admissao" type="date" value={formData.admissionDate} onChange={(event) => setFormData((current) => ({ ...current, admissionDate: event.target.value }))} className="focus-visible:ring-2 focus-visible:ring-primary/25" />
                  </div>
                </div>
                {saved && (
                  <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
                    <Check className="size-4" />
                    Cadastro validado localmente. A conexão com o banco será adicionada depois.
                  </div>
                )}
                <Button type="submit" className="w-full rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/25 active:scale-[0.98] sm:w-auto">
                  Salvar funcionário
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/60 bg-card/80 shadow-lg shadow-black/5">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Search className="size-5" />
              </div>
              <CardTitle className="pt-3 text-xl" style={{ fontFamily: "var(--font-display)" }}>
                Importar planilha
              </CardTitle>
              <CardDescription>Selecione um arquivo Excel para conferir sua estrutura antes da importação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              <label htmlFor="excel-file" className="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center transition-all duration-300 hover:border-primary/60 hover:bg-primary/10">
                <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-background text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <Search className="size-5" />
                </div>
                <span className="font-semibold text-foreground">Selecionar arquivo Excel</span>
                <span className="mt-1 text-sm text-muted-foreground">Formatos aceitos: .xlsx e .xls</span>
                <input id="excel-file" type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleFileChange} />
              </label>

              {selectedFile ? (
                <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-8 place-items-center rounded-lg bg-success/15 text-success"><Check className="size-4" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB · arquivo selecionado</p>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                    <div className="grid grid-cols-3 border-b border-border/60 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      <span>Nome</span><span>Cargo</span><span>E-mail</span>
                    </div>
                    <div className="grid grid-cols-3 px-3 py-2.5 text-xs text-muted-foreground">
                      <span className="truncate">Aguardando leitura</span><span>—</span><span>—</span>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">A leitura dos dados da planilha será habilitada junto com a integração ao banco.</p>
                </div>
              ) : (
                <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                  <p>Use colunas como <strong className="font-medium text-foreground">Nome</strong>, <strong className="font-medium text-foreground">Cargo</strong>, <strong className="font-medium text-foreground">E-mail</strong> e <strong className="font-medium text-foreground">Telefone</strong> para facilitar a futura importação.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <section className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-lg shadow-black/5">
          <div className="flex flex-col gap-4 border-b border-border/60 bg-muted/20 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <User className="size-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Funcionários cadastrados</h2>
                  <p className="text-sm text-muted-foreground">{employees.length} {employees.length === 1 ? "colaborador cadastrado" : "colaboradores cadastrados nesta sessão"}</p>
                </div>
              </div>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome ou cargo" className="h-10 rounded-xl pl-9 focus-visible:ring-2 focus-visible:ring-primary/25" />
            </div>
          </div>

          <div className="divide-y divide-border/60">
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
                <button key={employee.id} type="button" onClick={() => setSelectedEmployee(employee)} className="group flex w-full items-center gap-4 p-5 text-left transition-all duration-300 hover:bg-muted/40">
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {employee.photoUrl ? (
                      <img src={employee.photoUrl} alt={`Foto de ${employee.name}`} className="size-full object-cover" />
                    ) : (
                      employee.name.split(" ").slice(0, 2).map((part) => part[0]).join("")
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{employee.name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{employee.role} · {employee.email}</p>
                  </div>
                  <Badge variant="outline" className="hidden rounded-full border-primary/20 bg-primary/5 text-primary sm:flex">{employee.documents.length} {employee.documents.length === 1 ? "documento" : "documentos"}</Badge>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><User className="size-5" /></div>
                <p className="mt-4 font-semibold">{employees.length ? "Nenhum resultado encontrado" : "Sua lista aparecerá aqui"}</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{employees.length ? "Tente buscar por outro nome, cargo ou e-mail." : "Após salvar um cadastro, clique no funcionário para ver os dados e incluir documentos."}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={selectedEmployee !== null} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="mb-2 grid size-14 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
                  {selectedEmployee.photoUrl ? (
                    <img src={selectedEmployee.photoUrl} alt={`Foto de ${selectedEmployee.name}`} className="size-full object-cover" />
                  ) : (
                    <User className="size-6" />
                  )}
                </div>
                <DialogTitle className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>{selectedEmployee.name}</DialogTitle>
                <DialogDescription>{selectedEmployee.role} · {selectedEmployee.email}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4 text-sm sm:grid-cols-2">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telefone</p><p className="mt-1 font-medium">{selectedEmployee.phone || "Não informado"}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admissão</p><p className="mt-1 font-medium">{selectedEmployee.admissionDate ? new Date(`${selectedEmployee.admissionDate}T00:00:00`).toLocaleDateString("pt-BR") : "Não informada"}</p></div>
              </div>

                              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-semibold">Documentos e dados cadastrais</h3><p className="mt-1 text-sm text-muted-foreground">Organize os comprovantes e informações necessárias para este PJ.</p></div><div className="flex gap-2"><Select value={selectedDocumentCategory} onValueChange={(value) => setSelectedDocumentCategory(value as DocumentCategory)}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{DOCUMENT_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select><label htmlFor="employee-document" className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:scale-[1.02] hover:shadow-primary/25 active:scale-[0.98]"><Upload className="size-4" />Anexar<input id="employee-document" type="file" accept="application/pdf,image/*" className="sr-only" onChange={handleDocumentUpload} /></label></div></div>
                <div className="grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2"><p className="sm:col-span-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Itens esperados</p>{DOCUMENT_CATEGORIES.map((category) => { const attached = selectedEmployee.documents.some((document) => document.category === category); return <div key={category} className="flex items-center gap-2 text-sm"><Check className={`size-4 ${attached ? "text-success" : "text-muted-foreground/40"}`} /><span className={attached ? "font-medium text-foreground" : "text-muted-foreground"}>{category}</span></div>; })}</div>
                {selectedEmployee.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.documents.map((document) => (
                      <div key={document.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"><div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.name}</p><p className="text-xs text-muted-foreground">{document.category} · {document.type === "application/pdf" ? "PDF" : "Imagem"} · {(document.size / 1024).toFixed(1)} KB</p></div><Check className="size-4 text-success" /></div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-7 text-center"><FileText className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Nenhum documento anexado ainda.</p></div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p
          className="text-2xl font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
