import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loadSessionContext } from "@/lib/session";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar | DJ PAY" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadSessionContext().then((session) => {
      if (session) void navigate({ to: "/" });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setIsSubmitting(false);
      setErrorMessage("E-mail ou senha inválidos. Confira os dados e tente novamente.");
      return;
    }

    const session = await loadSessionContext();
    if (!session) {
      await supabase.auth.signOut();
      setIsSubmitting(false);
      setErrorMessage(
        "A conta foi autenticada, mas ainda não possui empresa, perfil ativo e permissão no DJ PAY.",
      );
      return;
    }

    await navigate({ to: "/" });
  };

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden bg-[linear-gradient(145deg,#071f38_0%,#0b3854_55%,#08a6a6_100%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src="/branding/dj-pay-logo-primary.png"
          alt="DJ PAY"
          className="w-56 rounded-2xl bg-white/95 p-4"
        />
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Gestão segura de prestadores PJ
          </p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight">
            Contratos, notas fiscais e pagamentos em um único fluxo.
          </h1>
          <div className="mt-8 flex items-center gap-3 text-sm text-cyan-50">
            <ShieldCheck className="size-5" />
            Acesso individual e dados separados por empresa.
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <img
            src="/branding/dj-pay-logo-primary.png"
            alt="DJ PAY"
            className="mb-10 w-48 lg:hidden"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Área segura
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
            Acesse sua empresa
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Entre com a conta autorizada para cadastrar e consultar dados reais.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-xl pl-10"
                  placeholder="voce@empresa.com.br"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-xl pl-10"
                  placeholder="Sua senha"
                />
              </div>
            </div>
            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
              >
                {errorMessage}
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl text-base shadow-md shadow-primary/20"
            >
              {isSubmitting ? "Entrando..." : "Entrar no DJ PAY"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm leading-6 text-muted-foreground">
            O cadastro de contas é controlado pelo administrador da empresa.
          </p>
        </div>
      </section>
    </main>
  );
}
