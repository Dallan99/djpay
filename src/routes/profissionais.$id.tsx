import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  cidade: string | null;
  estado: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  area: string | null;
  gestor: string | null;
  data_inicio: string | null;
  status: string;
  observacoes: string | null;
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

function DetailItem({ label, value }: { label: string; value: string | null }) {
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
          "id, company_id, nome_completo, razao_social, nome_fantasia, cpf_cnpj, inscricao_municipal, cidade, estado, email, telefone, cargo, area, gestor, data_inicio, status, observacoes",
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
      }

      setIsLoading(false);
    };

    void loadProfessional();

    return () => {
      active = false;
    };
  }, [id]);

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
    </main>
  );
}
