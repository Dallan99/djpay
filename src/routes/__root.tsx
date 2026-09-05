import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { FileText, Menu, ShieldCheck, ShoppingCart, Sparkles, User, X } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "../integrations/supabase/client";
import { loadSessionContext } from "../lib/session";

import { Sheet, SheetClose, SheetContent, SheetTitle } from "../components/ui/sheet";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DJ PAY — condições comerciais para prestadores PJ" },
      {
        name: "description",
        content: "Organize condições comerciais e contratuais configuráveis para prestadores PJ.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "DJ PAY — condições comerciais para prestadores PJ" },
      {
        property: "og:description",
        content: "Organize condições comerciais acordadas e o calendário de notas do contrato PJ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/branding/dj-pay-symbol.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navigationItems = [
  { label: "Dashboard", icon: Sparkles, to: "/demo/corporativo" },
  { label: "Profissionais", icon: User, to: "/" },
  { label: "Pagamentos", icon: ShoppingCart, to: "/pagamentos" },
  { label: "Notas Fiscais", icon: FileText, to: "/notas-fiscais" },
  { label: "Configurações", icon: ShieldCheck, to: "/" },
] as const;

type AccountSummary = {
  company: string;
  name: string;
  email: string;
};

const initialAccount: AccountSummary = {
  company: "Empresa não identificada",
  name: "Carregando conta...",
  email: "",
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center">
      <img
        src={compact ? "/branding/dj-pay-symbol.png" : "/branding/dj-pay-logo-primary.png"}
        alt="DJ PAY — Pagamentos para PJ"
        className={`block h-auto object-contain ${compact ? "h-10 w-10 sm:h-11 sm:w-11" : "w-40 max-w-full sm:w-48 lg:w-56"}`}
      />
    </div>
  );
}

function AccountCard({ account }: { account: AccountSummary }) {
  const initials = account.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border/60 bg-card/75 p-3 shadow-sm shadow-black/5">
      <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {account.company}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials || <User className="size-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
          {account.email && (
            <p className="truncate text-xs text-muted-foreground">{account.email}</p>
          )}
        </div>
      </div>
      {account.name === "Sessão não identificada" && (
        <Link
          to="/login"
          className="mt-3 flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Entrar para usar dados reais
        </Link>
      )}
    </div>
  );
}

function Navigation({
  activeItem,
  onSelect,
}: {
  activeItem: string;
  onSelect: (item: string) => void;
}) {
  return (
    <nav aria-label="Navegação principal" className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item.label;

        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={() => onSelect(item.label)}
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Profissionais");
  const [account, setAccount] = useState<AccountSummary>(initialAccount);

  useEffect(() => {
    let mounted = true;

    void loadSessionContext().then(async (session) => {
      if (!mounted) return;

      if (!session) {
        setAccount({ ...initialAccount, name: "Sessão não identificada" });
        return;
      }

      const { data: companyRow } = await supabase
        .from("companies")
        .select("nome")
        .eq("id", session.companyId)
        .maybeSingle();

      if (!mounted) return;

      setAccount({
        company: companyRow?.nome ?? "Sua empresa",
        name: session.nome || "Usuário DJ PAY",
        email: session.email,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleNavigation = (item: string) => {
    setActiveItem(item);
    setMobileOpen(false);
  };

  if (pathname.startsWith("/demo/") || pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-border/60 bg-sidebar/80 p-4 backdrop-blur-md lg:flex">
          <Brand />
          <div className="mt-10">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Visão geral
            </p>
            <Navigation activeItem={activeItem} onSelect={handleNavigation} />
          </div>
          <div className="mt-auto pt-6">
            <AccountCard account={account} />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md lg:hidden">
            <Brand compact />
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-xl border border-border/60 bg-card text-foreground shadow-sm transition-all duration-200 hover:scale-[1.02] hover:bg-muted active:scale-[0.98]"
            >
              <Menu className="size-5" />
            </button>
          </header>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              className="flex w-[18rem] flex-col border-border/60 bg-sidebar p-4 sm:w-[20rem]"
            >
              <div className="flex items-center justify-between pr-8">
                <Brand />
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </SheetClose>
              </div>
              <SheetTitle className="sr-only">Menu principal do DJ PAY</SheetTitle>
              <div className="mt-10">
                <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Visão geral
                </p>
                <Navigation activeItem={activeItem} onSelect={handleNavigation} />
              </div>
              <div className="mt-auto pt-6">
                <AccountCard account={account} />
              </div>
            </SheetContent>
          </Sheet>

          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </div>
      </div>
    </QueryClientProvider>
  );
}
