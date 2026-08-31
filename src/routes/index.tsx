import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            Contrato PJ · {config.ano}
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
