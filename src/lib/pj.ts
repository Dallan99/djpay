import { useCallback, useEffect, useState } from "react";

export type ThirteenthMode = "dezembro" | "trimestral";

export type Config = {
  nome: string;
  salario: number;
  ajudaCusto: number;
  decimoModo: ThirteenthMode;
  /** meses (1-12) das notas do 13º quando trimestral */
  decimoMeses: number[];
  feriasDias: 10 | 20 | 30;
  /** mês em que a nota de férias é emitida */
  feriasMes: number;
  diaEmissao: number;
  ano: number;
};

export const defaultConfig: Config = {
  nome: "",
  salario: 12000,
  ajudaCusto: 800,
  decimoModo: "trimestral",
  decimoMeses: [3, 6, 9, 12],
  feriasDias: 10,
  feriasMes: 1,
  diaEmissao: 25,
  ano: new Date().getFullYear(),
};

export type InvoiceKind = "salario" | "ajuda" | "decimo" | "ferias";

export type Invoice = {
  id: string;
  mes: number;
  kind: InvoiceKind;
  label: string;
  valor: number;
};

export const MESES = [
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

export const KIND_LABEL: Record<InvoiceKind, string> = {
  salario: "Salário",
  ajuda: "Ajuda de custo",
  decimo: "13ª nota",
  ferias: "Férias",
};

export function brl(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

/** Gera o calendário anual de notas a emitir a partir da configuração. */
export function buildSchedule(cfg: Config): Invoice[] {
  const out: Invoice[] = [];
  const decimoMeses =
    cfg.decimoModo === "dezembro" ? [12] : [...cfg.decimoMeses].sort((a, b) => a - b);
  const parcelaDecimo = decimoMeses.length ? cfg.salario / decimoMeses.length : 0;
  const valorFerias = (cfg.salario / 30) * cfg.feriasDias;

  for (let mes = 1; mes <= 12; mes++) {
    out.push({
      id: `${cfg.ano}-${mes}-salario`,
      mes,
      kind: "salario",
      label: "Salário mensal",
      valor: cfg.salario,
    });
    if (cfg.ajudaCusto > 0) {
      out.push({
        id: `${cfg.ano}-${mes}-ajuda`,
        mes,
        kind: "ajuda",
        label: "Ajuda de custo",
        valor: cfg.ajudaCusto,
      });
    }
    if (decimoMeses.includes(mes)) {
      const idx = decimoMeses.indexOf(mes) + 1;
      out.push({
        id: `${cfg.ano}-${mes}-decimo`,
        mes,
        kind: "decimo",
        label:
          decimoMeses.length > 1
            ? `13ª nota — parcela ${idx}/${decimoMeses.length}`
            : "13ª nota (integral)",
        valor: parcelaDecimo,
      });
    }
    if (mes === cfg.feriasMes && cfg.feriasDias > 0) {
      out.push({
        id: `${cfg.ano}-${mes}-ferias`,
        mes,
        kind: "ferias",
        label: `Férias remuneradas — ${cfg.feriasDias} dias`,
        valor: valorFerias,
      });
    }
  }
  return out;
}

export function totals(schedule: Invoice[]) {
  const by = (k: InvoiceKind) =>
    schedule.filter((i) => i.kind === k).reduce((s, i) => s + i.valor, 0);
  const total = schedule.reduce((s, i) => s + i.valor, 0);
  return {
    salario: by("salario"),
    ajuda: by("ajuda"),
    decimo: by("decimo"),
    ferias: by("ferias"),
    total,
    media: total / 12,
  };
}

const CFG_KEY = "pj-pagamentos:config";
const DONE_KEY = "pj-pagamentos:emitidas";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...(fallback as object), ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePjStore() {
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setConfig(read<Config>(CFG_KEY, defaultConfig));
    setDone(read<Record<string, boolean>>(DONE_KEY, {}));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(CFG_KEY, JSON.stringify(config));
  }, [config, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(DONE_KEY, JSON.stringify(done));
  }, [done, hydrated]);

  const toggle = useCallback((id: string) => {
    setDone((d) => ({ ...d, [id]: !d[id] }));
  }, []);

  const update = useCallback(<K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  }, []);

  return { hydrated, config, setConfig, update, done, toggle };
}
