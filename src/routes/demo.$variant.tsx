import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  MoveRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";

export const Route = createFileRoute("/demo/$variant")({
  head: () => ({
    meta: [
      { title: "Explorações visuais | DJ PAY" },
      {
        name: "description",
        content: "Três alternativas de layout e identidade para o DJ PAY.",
      },
    ],
  }),
  component: DemoRoute,
});

type VariantKey = "corporativo" | "fintech" | "humana";
type ScreenKey =
  | "overview"
  | "professionals"
  | "admission"
  | "vacation"
  | "closing"
  | "statement"
  | "termination"
  | "login";

type Theme = {
  key: VariantKey;
  label: string;
  eyebrow: string;
  description: string;
  primary: string;
  primarySoft: string;
  accent: string;
  canvas: string;
  sidebar: string;
  border: string;
  ink: string;
};

const THEMES: Record<VariantKey, Theme> = {
  corporativo: {
    key: "corporativo",
    label: "Corporativo claro",
    eyebrow: "Confiabilidade e precisão",
    description:
      "Navegação compacta, tabelas leves e leitura objetiva para rotinas administrativas.",
    primary: "#092d4d",
    primarySoft: "#e8f3f7",
    accent: "#0c9a9e",
    canvas: "#f6fafb",
    sidebar: "#ffffff",
    border: "#d9e6eb",
    ink: "#102a43",
  },
  fintech: {
    key: "fintech",
    label: "Fintech contemporâneo",
    eyebrow: "Visibilidade financeira",
    description:
      "Métricas expressivas e hierarquia forte para decisões rápidas no fechamento do mês.",
    primary: "#4338a8",
    primarySoft: "#eeecff",
    accent: "#f07463",
    canvas: "#faf9ff",
    sidebar: "#f6f4ff",
    border: "#e2def7",
    ink: "#25224c",
  },
  humana: {
    key: "humana",
    label: "Gestão humana",
    eyebrow: "Jornadas que merecem cuidado",
    description: "Uma leitura acolhedora para acompanhar pessoas, pendências e próximos passos.",
    primary: "#14533d",
    primarySoft: "#e7f4ec",
    accent: "#d59a38",
    canvas: "#f8fbf7",
    sidebar: "#ffffff",
    border: "#dbe9df",
    ink: "#173d2f",
  },
};

const navItems: Array<{
  key: Exclude<ScreenKey, "login">;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "professionals", label: "Profissionais PJ", icon: Users },
  { key: "admission", label: "Admissões", icon: ClipboardCheck },
  { key: "vacation", label: "Férias", icon: CalendarDays },
  { key: "closing", label: "Fechamento mensal", icon: WalletCards },
  { key: "statement", label: "Demonstrativos", icon: FileCheck2 },
  { key: "termination", label: "Encerramentos", icon: MoveRight },
];

const professionals = [
  {
    name: "Marina Albuquerque",
    role: "Product Designer",
    unit: "Produto",
    status: "Ativo",
    value: "R$ 12.800,00",
    next: "Nota em 05/09",
  },
  {
    name: "Rafael Nogueira",
    role: "Engenheiro de Software",
    unit: "Tecnologia",
    status: "Ativo",
    value: "R$ 18.500,00",
    next: "Nota em 05/09",
  },
  {
    name: "Camila Rocha",
    role: "Analista de Operações",
    unit: "Operações",
    status: "Férias",
    value: "R$ 9.600,00",
    next: "Retorno em 16/09",
  },
  {
    name: "Eduardo Martins",
    role: "Consultor Comercial",
    unit: "Expansão",
    status: "Admissão",
    value: "R$ 11.200,00",
    next: "3 pendências",
  },
];

const metrics = [
  {
    label: "Profissionais ativos",
    value: "42",
    hint: "+3 neste mês",
    icon: Users,
    tone: "primary",
  },
  {
    label: "Pagamentos do mês",
    value: "R$ 486,2 mil",
    hint: "18 notas aguardadas",
    icon: CircleDollarSign,
    tone: "accent",
  },
  {
    label: "Férias programadas",
    value: "07",
    hint: "próximos 30 dias",
    icon: CalendarDays,
    tone: "warm",
  },
  {
    label: "Pendências críticas",
    value: "03",
    hint: "exigem atenção hoje",
    icon: ShieldCheck,
    tone: "danger",
  },
];

function DemoRoute() {
  const { variant: rawVariant } = Route.useParams();
  const variant: VariantKey =
    rawVariant === "fintech" || rawVariant === "humana" ? rawVariant : "corporativo";
  const theme = THEMES[variant];
  const [screen, setScreen] = useState<ScreenKey>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const themeStyle = useMemo(
    () =>
      ({
        "--demo-primary": theme.primary,
        "--demo-primary-soft": theme.primarySoft,
        "--demo-accent": theme.accent,
        "--demo-canvas": theme.canvas,
        "--demo-sidebar": theme.sidebar,
        "--demo-border": theme.border,
        "--demo-ink": theme.ink,
      }) as React.CSSProperties,
    [theme],
  );

  return (
    <main
      style={themeStyle}
      className="min-h-screen bg-[var(--demo-canvas)] text-[var(--demo-ink)]"
    >
      <div className="border-b border-[var(--demo-border)] bg-white/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[var(--demo-primary-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--demo-primary)]">
              Exploração visual
            </span>
            <span className="hidden text-sm text-slate-500 sm:inline">
              Dados fictícios — nenhuma alteração no banco ou no fluxo real
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(THEMES) as VariantKey[]).map((key) => (
              <Link
                key={key}
                to={`/demo/${key}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${key === variant ? "bg-[var(--demo-primary)] text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {THEMES[key].label}
              </Link>
            ))}
            <Link
              to="/"
              className="ml-1 hidden text-xs font-semibold text-slate-500 underline-offset-4 hover:underline md:inline"
            >
              Voltar ao produto atual
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-57px)]">
        <aside
          className={`hidden shrink-0 flex-col border-r border-[var(--demo-border)] bg-[var(--demo-sidebar)] transition-all duration-200 lg:flex ${collapsed ? "w-[76px]" : "w-[256px]"}`}
        >
          <DemoBrand compact={collapsed} />
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-5"}`}
          >
            {!collapsed && (
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Operação
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              className="grid size-9 place-items-center rounded-xl text-slate-500 transition hover:bg-[var(--demo-primary-soft)] hover:text-[var(--demo-primary)]"
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          </div>
          <nav className="mt-5 space-y-1 px-3" aria-label="Navegação da demonstração">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = screen === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setScreen(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-[var(--demo-primary)] text-white shadow-sm" : "text-slate-600 hover:bg-[var(--demo-primary-soft)] hover:text-[var(--demo-primary)]"} ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className="size-[17px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
          <div
            className={`mt-auto border-t border-[var(--demo-border)] p-4 ${collapsed ? "flex justify-center" : ""}`}
          >
            {!collapsed ? (
              <div className="rounded-2xl bg-[var(--demo-primary-soft)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--demo-primary)]">
                  Empresa conectada
                </p>
                <p className="mt-2 truncate text-sm font-bold">Orbe Tecnologia Ltda.</p>
                <p className="mt-0.5 text-xs text-slate-500">Administradora · Ana Souza</p>
              </div>
            ) : (
              <div className="grid size-9 place-items-center rounded-full bg-[var(--demo-primary)] text-xs font-bold text-white">
                AS
              </div>
            )}
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <aside
              className="h-full w-[280px] bg-[var(--demo-sidebar)] p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <DemoBrand />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <nav className="mt-8 space-y-1" aria-label="Navegação móvel">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setScreen(item.key);
                        setMobileOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${screen === item.key ? "bg-[var(--demo-primary)] text-white" : "text-slate-600 hover:bg-[var(--demo-primary-soft)]"}`}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <section className="min-w-0 flex-1">
          <header className="sticky top-[57px] z-20 flex items-center justify-between border-b border-[var(--demo-border)] bg-[var(--demo-canvas)]/90 px-4 py-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="grid size-10 place-items-center rounded-xl border border-[var(--demo-border)] bg-white lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
                  {theme.eyebrow}
                </p>
                <h1 className="mt-1 text-lg font-bold tracking-tight md:text-xl">
                  {screen === "login"
                    ? "Acesso ao DJ PAY"
                    : "Olá, Ana. Vamos organizar a operação?"}
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreen("login")}
              className="hidden items-center gap-2 rounded-xl border border-[var(--demo-border)] bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-[var(--demo-primary)] hover:text-[var(--demo-primary)] sm:flex"
            >
              <div className="grid size-7 place-items-center rounded-full bg-[var(--demo-primary-soft)] text-[10px] font-bold text-[var(--demo-primary)]">
                AS
              </div>
              Ana Souza <ChevronDown className="size-4" />
            </button>
          </header>

          <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-8 md:py-8">
            <DemoSwitcher active={screen} onChange={setScreen} />
            {screen === "login" ? (
              <LoginScreen theme={theme} onBack={() => setScreen("overview")} />
            ) : (
              <DemoContent screen={screen} theme={theme} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? "justify-center px-2 py-5" : "px-5 py-6"}`}>
      <img
        src={compact ? "/branding/dj-pay-symbol.png" : "/branding/dj-pay-logo-primary.png"}
        alt="DJ PAY"
        className={compact ? "size-10 object-contain" : "h-auto w-40 max-w-full"}
      />
    </div>
  );
}

function DemoSwitcher({
  active,
  onChange,
}: {
  active: ScreenKey;
  onChange: (screen: ScreenKey) => void;
}) {
  const options: Array<{ key: ScreenKey; label: string }> = [
    { key: "overview", label: "Visão geral" },
    { key: "professionals", label: "Profissionais" },
    { key: "admission", label: "Admissão" },
    { key: "vacation", label: "Férias" },
    { key: "closing", label: "Fechamento" },
    { key: "statement", label: "Demonstrativo" },
    { key: "termination", label: "Encerramento" },
    { key: "login", label: "Login" },
  ];
  return (
    <div
      className="mb-7 flex gap-2 overflow-x-auto border-b border-[var(--demo-border)] pb-3"
      aria-label="Telas da proposta"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition ${active === option.key ? "bg-[var(--demo-primary)] text-white" : "text-slate-500 hover:bg-white hover:text-[var(--demo-primary)]"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DemoContent({ screen, theme }: { screen: Exclude<ScreenKey, "login">; theme: Theme }) {
  if (screen === "professionals") return <ProfessionalsScreen theme={theme} />;
  if (screen === "admission") return <AdmissionScreen theme={theme} />;
  if (screen === "vacation") return <VacationScreen theme={theme} />;
  if (screen === "closing") return <ClosingScreen theme={theme} />;
  if (screen === "statement") return <StatementScreen theme={theme} />;
  if (screen === "termination") return <TerminationScreen theme={theme} />;
  return <OverviewScreen theme={theme} />;
}

function OverviewScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            Quarta-feira, 05 de setembro de 2026
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Visão geral</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Uma leitura rápida do que precisa acontecer hoje, do fechamento deste mês e das jornadas
            em andamento.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--demo-primary)] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
        >
          <Plus className="size-4" /> Nova admissão
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 shadow-[0_10px_30px_rgba(16,42,67,0.04)] md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
                Atenção da semana
              </p>
              <h3 className="mt-2 text-xl font-bold">Pendências que pedem um próximo passo</h3>
            </div>
            <button type="button" className="rounded-xl p-2 text-slate-400 hover:bg-slate-50">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
          <div className="mt-5 divide-y divide-[var(--demo-border)]">
            {[
              ["3 admissões", "Documentos aguardando conferência", "Ver admissões", "warning"],
              [
                "18 notas fiscais",
                "Referentes ao fechamento de setembro",
                "Abrir pagamentos",
                "primary",
              ],
              ["2 contratos", "Próximos do encerramento contratual", "Revisar contratos", "accent"],
            ].map(([title, detail, action, tone]) => (
              <div
                key={title}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-2xl ${tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "accent" ? "bg-[var(--demo-primary-soft)] text-[var(--demo-accent)]" : "bg-sky-50 text-sky-700"}`}
                >
                  <Clock3 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{detail}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-bold text-[var(--demo-primary)] hover:underline"
                >
                  {action}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-[var(--demo-primary)] p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                Fechamento de setembro
              </p>
              <p className="mt-3 text-4xl font-bold">72%</p>
              <p className="mt-1 text-sm text-white/70">do ciclo concluído</p>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-white/10">
              <WalletCards className="size-5" />
            </div>
          </div>
          <div className="mt-7 h-2 rounded-full bg-white/15">
            <div className="h-2 w-[72%] rounded-full bg-[var(--demo-accent)]" />
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/65">Pagamentos processados</span>
              <strong>30 / 42</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-white/65">Notas recebidas</span>
              <strong>24 / 42</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-white/65">Pendências</span>
              <strong>03</strong>
            </div>
          </div>
          <button
            type="button"
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[var(--demo-primary)]"
          >
            Abrir fechamento <ArrowRight className="size-4" />
          </button>
        </section>
      </div>
      <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 md:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-bold">Próximos eventos</h3>
            <p className="mt-1 text-sm text-slate-500">
              O que está previsto para a operação nos próximos dias.
            </p>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--demo-primary)]">
            Ver calendário <ArrowRight className="ml-1 inline size-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Event
            date="05 SET"
            title="Notas fiscais"
            detail="18 documentos aguardados"
            theme={theme}
          />
          <Event
            date="10 SET"
            title="Pagamento mensal"
            detail="42 prestadores no lote"
            theme={theme}
          />
          <Event date="16 SET" title="Retorno de férias" detail="Camila Rocha" theme={theme} />
        </div>
      </section>
    </div>
  );
}

function ProfessionalsScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Pessoas e contratos"
        title="Profissionais PJ"
        description="Acompanhe dados cadastrais, contratos, valores e próximos passos de cada prestador."
        action="Novo profissional"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="42 ativos" value="96%" detail="cadastros completos" />
        <MiniStat label="03 admissões" value="7 dias" detail="tempo médio da jornada" />
        <MiniStat label="04 áreas" value="R$ 486,2 mil" detail="prestação mensal" />
      </div>
      <section className="overflow-hidden rounded-3xl border border-[var(--demo-border)] bg-white">
        <div className="flex flex-col gap-4 border-b border-[var(--demo-border)] p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h3 className="text-xl font-bold">Lista de profissionais</h3>
            <p className="mt-1 text-sm text-slate-500">
              Dados fictícios para comparar a experiência da proposta.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--demo-border)] px-3 py-2 text-sm text-slate-400">
              <Search className="size-4" /> Buscar profissional
            </div>
            <button
              type="button"
              className="rounded-xl border border-[var(--demo-border)] px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Filtros
            </button>
          </div>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4">Área</th>
                <th className="px-6 py-4">Prestação</th>
                <th className="px-6 py-4">Situação</th>
                <th className="px-6 py-4">Próximo passo</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--demo-border)]">
              {professionals.map((person) => (
                <tr key={person.name} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-full bg-[var(--demo-primary-soft)] text-xs font-bold text-[var(--demo-primary)]">
                        {person.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <p className="font-bold">{person.name}</p>
                        <p className="text-xs text-slate-500">{person.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{person.unit}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{person.value}</td>
                  <td className="px-6 py-4">
                    <StatusPill status={person.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-500">{person.next}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-[var(--demo-border)] md:hidden">
          {professionals.map((person) => (
            <div key={person.name} className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--demo-primary-soft)] text-xs font-bold text-[var(--demo-primary)]">
                  {person.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{person.name}</p>
                  <p className="text-xs text-slate-500">
                    {person.role} · {person.unit}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-bold">{person.value}</span>
                    <StatusPill status={person.status} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdmissionScreen({ theme }: { theme: Theme }) {
  const steps = ["Dados do profissional", "Documentos", "Contrato", "Conferência"];
  const checklist = [
    "Dados da pessoa física preenchidos",
    "CNPJ e dados bancários conferidos",
    "Contrato de prestação gerado",
    "Responsável aprovou a admissão",
  ];
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Jornada de entrada"
        title="Nova admissão"
        description="Uma jornada clara para tirar o profissional do primeiro cadastro até a operação."
        action="Salvar rascunho"
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 md:p-7">
          <div className="flex flex-col gap-4 border-b border-[var(--demo-border)] pb-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--demo-primary)]">Etapa 2 de 4</p>
              <h3 className="mt-1 text-xl font-bold">Documentos e contrato</h3>
            </div>
            <span className="rounded-full bg-[var(--demo-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--demo-primary)]">
              Em andamento
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`grid size-8 place-items-center rounded-full text-xs font-bold ${index < 2 ? "bg-[var(--demo-primary)] text-white" : "bg-slate-100 text-slate-400"}`}
                >
                  {index < 2 ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={`text-xs font-semibold ${index === 1 ? "text-[var(--demo-primary)]" : "text-slate-500"}`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Field label="Nome completo" value="Eduardo Martins" />
            <Field label="CNPJ" value="28.394.721/0001-09" />
            <Field label="Serviço prestado" value="Consultoria comercial" />
            <Field label="Centro de custo" value="Expansão · CC-204" />
          </div>
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--demo-border)] p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[var(--demo-primary-soft)] text-[var(--demo-primary)]">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="font-bold">Contrato de prestação</p>
                <p className="text-sm text-slate-500">Versão 1.0 · gerado em 03/09/2026</p>
              </div>
              <button
                type="button"
                className="ml-auto rounded-xl border border-[var(--demo-border)] px-3 py-2 text-xs font-bold"
              >
                Visualizar
              </button>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-[var(--demo-border)] px-4 py-3 text-sm font-semibold text-slate-600"
            >
              Voltar
            </button>
            <button
              type="button"
              className="rounded-xl bg-[var(--demo-primary)] px-4 py-3 text-sm font-bold text-white"
            >
              Continuar
            </button>
          </div>
        </section>
        <aside className="rounded-3xl bg-[var(--demo-primary)] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
            Checklist admissional
          </p>
          <div className="mt-5 space-y-4">
            {checklist.map((item, index) => (
              <div key={item} className="flex gap-3">
                <div
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${index < 2 ? "bg-[var(--demo-accent)] text-white" : "border border-white/30 text-white/30"}`}
                >
                  {index < 2 && <Check className="size-3" />}
                </div>
                <p className={`text-sm leading-5 ${index < 2 ? "text-white" : "text-white/55"}`}>
                  {item}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"
          >
            Gerar kit admissional <ArrowRight className="size-4" />
          </button>
        </aside>
      </div>
    </div>
  );
}

function VacationScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Descanso contratado"
        title="Férias e períodos"
        description="Acompanhe períodos, saldos e lançamentos manuais com clareza sobre a condição contratual."
        action="Novo lançamento"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Saldo disponível" value="87 dias" detail="3 períodos ativos" />
        <MiniStat label="Programadas" value="16 dias" detail="próximos 90 dias" />
        <MiniStat label="Ajustes" value="02" detail="aguardando conferência" />
      </div>
      <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Períodos de Marina Albuquerque</h3>
            <p className="mt-1 text-sm text-slate-500">
              Condição contratual configurada pela empresa. Não representa vínculo CLT.
            </p>
          </div>
          <StatusPill status="Ativo" />
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <PeriodCard
            title="02/09/2025 — 01/09/2026"
            status="Em andamento"
            balance="24 dias"
            detail="30 iniciais · 6 gozados"
            accent="primary"
          />
          <PeriodCard
            title="02/09/2026 — 01/09/2027"
            status="Futuro"
            balance="30 dias"
            detail="ainda sem lançamentos"
            accent="accent"
          />
          <PeriodCard
            title="Ponte de feriado"
            status="Ajuste manual"
            balance="-1 dia"
            detail="saldo antes: 25 · depois: 24"
            accent="warm"
          />
        </div>
        <div className="mt-7 border-t border-[var(--demo-border)] pt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-bold">Histórico de lançamentos</h4>
            <button type="button" className="text-sm font-bold text-[var(--demo-primary)]">
              Ver tudo
            </button>
          </div>
          <div className="mt-4 divide-y divide-[var(--demo-border)]">
            {[
              ["12/08/2026", "Férias gozadas", "6 dias", "Aprovado"],
              ["20/07/2026", "Programação de férias", "16 dias", "Agendado"],
              ["10/06/2026", "Ponte de feriado", "-1 dia", "Ajuste manual"],
            ].map((row) => (
              <div key={row[0]} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="w-24 text-slate-500">{row[0]}</span>
                <span className="flex-1 font-semibold">{row[1]}</span>
                <span className="font-bold">{row[2]}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {row[3]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ClosingScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Financeiro"
        title="Fechamento mensal"
        description="Confira o ciclo de setembro antes de enviar pagamentos e acompanhar notas fiscais."
        action="Exportar lote"
      />
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Prestadores", "42"],
          ["Proventos", "R$ 512.400"],
          ["Descontos", "R$ 26.180"],
          ["Total líquido", "R$ 486.220"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--demo-border)] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Itens do fechamento</h3>
            <p className="mt-1 text-sm text-slate-500">
              Os pagamentos de origem permanecem idempotentes por empresa.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            Conferência em andamento
          </span>
        </div>
        <div className="mt-5 space-y-3">
          {professionals.map((person, index) => (
            <div
              key={person.name}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--demo-border)] p-4"
            >
              <div className="grid size-9 place-items-center rounded-full bg-[var(--demo-primary-soft)] text-xs font-bold text-[var(--demo-primary)]">
                {person.name[0]}
              </div>
              <div className="min-w-40 flex-1">
                <p className="font-bold">{person.name}</p>
                <p className="text-xs text-slate-500">
                  Competência setembro · {index === 2 ? "Férias remuneradas" : "Prestação mensal"}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums">{person.value}</span>
              <StatusPill status={index === 3 ? "Aguardando NF" : "Conferido"} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatementScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Transparência do pagamento"
        title="Demonstrativo de pagamento"
        description="Memória de cálculo pronta para conferência, impressão e emissão da nota fiscal."
        action="Imprimir demonstrativo"
      />
      <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 border-b border-[var(--demo-border)] pb-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-2xl bg-[var(--demo-primary-soft)] text-[var(--demo-primary)]">
              <FileCheck2 className="size-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
                DJ PAY · Setembro 2026
              </p>
              <h3 className="mt-1 text-2xl font-bold">Marina Albuquerque</h3>
              <p className="mt-1 text-sm text-slate-500">
                CNPJ 28.394.721/0001-09 · Product Designer
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Total líquido
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--demo-primary)]">
              R$ 12.540,00
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-3">
          <Detail label="Admissão" value="02/09/2025" />
          <Detail label="Mês de referência" value="09/2026" />
          <Detail label="Vencimento" value="05/10/2026" />
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <StatementBox
            title="Proventos"
            rows={[
              ["Prestação contratual", "R$ 12.800,00"],
              ["Ajuda de custo", "R$ 540,00"],
            ]}
            total="R$ 13.340,00"
          />
          <StatementBox
            title="Descontos e ajustes"
            rows={[
              ["Benefício odontológico", "R$ 180,00"],
              ["Ajuste de férias", "R$ 620,00"],
            ]}
            total="R$ 800,00"
            negative
          />
        </div>
        <div className="mt-8 rounded-2xl bg-[var(--demo-primary-soft)] p-4 text-sm text-slate-600">
          <span className="font-bold text-[var(--demo-primary)]">Memória de cálculo:</span>{" "}
          prestação contratual + proventos adicionais − descontos e ajustes = valor líquido para
          emissão da nota fiscal.
        </div>
      </section>
    </div>
  );
}

function TerminationScreen({ theme }: { theme: Theme }) {
  return (
    <div className="space-y-7">
      <PageHeading
        eyebrow="Encerramento contratual"
        title="Encerramento de Eduardo Martins"
        description="Consolide dias trabalhados, saldos e documentos antes de finalizar a relação contratual."
        action="Salvar análise"
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <section className="rounded-3xl border border-[var(--demo-border)] bg-white p-5 md:p-7">
          <div className="flex items-center gap-3 border-b border-[var(--demo-border)] pb-6">
            <div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <MoveRight className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Memória de encerramento</h3>
              <p className="text-sm text-slate-500">
                Data prevista: 30/09/2026 · motivo: conclusão de escopo
              </p>
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {[
              ["Dias trabalhados no período final", "20 dias", "R$ 7.466,67"],
              ["Férias contratuais não utilizadas", "08 dias", "R$ 2.986,67"],
              ["Gratificação anual proporcional", "09/12 avos", "R$ 8.400,00"],
              ["Benefícios e ajustes", "2 lançamentos", "- R$ 320,00"],
            ].map((row) => (
              <div
                key={row[0]}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--demo-border)] p-4"
              >
                <div className="flex-1">
                  <p className="font-bold">{row[0]}</p>
                  <p className="mt-1 text-xs text-slate-500">{row[1]}</p>
                </div>
                <span className="font-bold tabular-nums">{row[2]}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--demo-primary)] p-5 text-white">
            <span className="font-bold">Total estimado do encerramento</span>
            <strong className="text-2xl tabular-nums">R$ 18.533,34</strong>
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-[var(--demo-border)] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
              Documentos
            </p>
            <div className="mt-4 space-y-3">
              {["Demonstrativo final", "Distrato contratual", "Comprovante de pagamento"].map(
                (item, index) => (
                  <div key={item} className="flex items-center gap-3 text-sm">
                    <div
                      className={`grid size-6 place-items-center rounded-full ${index < 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                    >
                      {index < 1 && <Check className="size-3" />}
                    </div>
                    <span className={index < 1 ? "font-semibold" : "text-slate-500"}>{item}</span>
                  </div>
                ),
              )}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-xl border border-[var(--demo-border)] px-3 py-2.5 text-sm font-bold text-[var(--demo-primary)]"
            >
              Gerar distrato
            </button>
          </div>
          <div className="rounded-3xl bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-bold">Atenção contratual</p>
            <p className="mt-1">
              Valores e regras desta tela dependem das condições acordadas com a empresa e de
              validação jurídica/contábil.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function LoginScreen({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  return (
    <div className="flex min-h-[620px] items-center justify-center">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[32px] border border-[var(--demo-border)] bg-white shadow-[0_24px_80px_rgba(16,42,67,0.12)] md:grid-cols-2">
        <div className="hidden bg-[var(--demo-primary)] p-10 text-white md:block">
          <img
            src="/branding/dj-pay-logo-primary.png"
            alt="DJ PAY"
            className="w-52 max-w-full brightness-0 invert"
          />
          <p className="mt-24 text-3xl font-bold leading-tight">
            A operação PJ, com clareza em cada etapa.
          </p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
            Uma experiência para acompanhar pessoas, contratos, pagamentos e documentos sem perder o
            contexto.
          </p>
          <div className="mt-12 flex items-center gap-3 text-sm text-white/70">
            <div className="grid size-9 place-items-center rounded-full bg-white/10">
              <ShieldCheck className="size-4" />
            </div>{" "}
            Ambiente seguro por empresa
          </div>
        </div>
        <div className="p-7 sm:p-10">
          <img
            src="/branding/dj-pay-logo-primary.png"
            alt="DJ PAY"
            className="w-44 max-w-full md:hidden"
          />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
            Bem-vinda de volta
          </p>
          <h2 className="mt-2 text-3xl font-bold">Acesse sua conta</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Entre para acompanhar a operação da Orbe Tecnologia.
          </p>
          <div className="mt-7 space-y-4">
            <Field label="E-mail corporativo" value="ana@orbetech.com.br" />
            <Field label="Senha" value="••••••••••" />
            <button
              type="button"
              className="w-full rounded-xl bg-[var(--demo-primary)] px-4 py-3.5 text-sm font-bold text-white"
            >
              Entrar no DJ PAY
            </button>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-[var(--demo-primary)]"
          >
            Voltar para a demonstração
          </button>
        </div>
      </div>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--demo-accent)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--demo-primary)] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
      >
        {action}
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--demo-border)] bg-white p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <div
          className={`grid size-9 place-items-center rounded-xl ${tone === "accent" ? "bg-orange-50 text-orange-600" : tone === "warm" ? "bg-amber-50 text-amber-700" : tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-[var(--demo-primary-soft)] text-[var(--demo-primary)]"}`}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[var(--demo-border)] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
function Event({
  date,
  title,
  detail,
}: {
  date: string;
  title: string;
  detail: string;
  theme: Theme;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--demo-border)] p-4">
      <div className="rounded-xl bg-[var(--demo-primary-soft)] px-2.5 py-2 text-center text-[10px] font-bold leading-3 text-[var(--demo-primary)]">
        {date.split(" ")[0]}
        <br />
        {date.split(" ")[1]}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
function StatusPill({ status }: { status: string }) {
  const warm = status === "Férias" || status === "Aguardando NF" || status === "Ajuste manual";
  const green = status === "Ativo" || status === "Conferido" || status === "Aprovado";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${green ? "bg-emerald-50 text-emerald-700" : warm ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
    >
      {status}
    </span>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <div className="mt-2 rounded-xl border border-[var(--demo-border)] bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-700">
        {value}
      </div>
    </label>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function PeriodCard({
  title,
  status,
  balance,
  detail,
  accent,
}: {
  title: string;
  status: string;
  balance: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${accent === "primary" ? "border-[var(--demo-primary)]/25 bg-[var(--demo-primary-soft)]" : accent === "warm" ? "border-amber-200 bg-amber-50" : "border-[var(--demo-border)] bg-slate-50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold">{title}</p>
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {status}
        </span>
      </div>
      <p className="mt-6 text-2xl font-bold">{balance}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
function StatementBox({
  title,
  rows,
  total,
  negative = false,
}: {
  title: string;
  rows: string[][];
  total: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--demo-border)] p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">{title}</h4>
        <span className="text-xs text-slate-400">BRL</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-between border-t border-[var(--demo-border)] pt-4 font-bold">
        <span>Total</span>
        <span
          className={`tabular-nums ${negative ? "text-rose-700" : "text-[var(--demo-primary)]"}`}
        >
          {negative ? `− ${total}` : total}
        </span>
      </div>
    </div>
  );
}
