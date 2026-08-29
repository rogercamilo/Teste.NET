"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, CheckCheck } from "lucide-react";
import { ListaNotificacoes, type Notificacao } from "@/components/notificacoes/shared";

/**
 * "Avisos da comunidade" no Portal do Formando — histórico in-app durável dos
 * avisos (o push é efêmero; isto fica). Recebe os não-lidos por props do server
 * component; ao abrir/marcar, chama a API e faz router.refresh(). Some sozinho
 * quando não há avisos novos (mesmo modelo do sino: só não-lidos). Usa o mesmo
 * padrão visual do sino via componentes compartilhados.
 */
export function PortalAvisosCard({ notificacoes: inicial }: { notificacoes: Notificacao[] }) {
  const router = useRouter();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(inicial);

  const handleOpen = useCallback(
    async (n: Notificacao) => {
      // Resposta imediata: some da lista; persiste no servidor em seguida.
      setNotificacoes((prev) => prev.filter((x) => x.id !== n.id));
      await fetch(`/api/portal/notificacoes/${n.id}`, { method: "PATCH" }).catch(() => {});
      if (n.linkAcao) {
        router.push(n.linkAcao);
      } else {
        router.refresh();
      }
    },
    [router]
  );

  async function marcarTodas() {
    setNotificacoes([]);
    await fetch("/api/portal/notificacoes", { method: "PATCH" }).catch(() => {});
    router.refresh();
  }

  // Sem avisos novos → não ocupa espaço no painel.
  if (notificacoes.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Avisos da comunidade
        </CardTitle>
        {notificacoes.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            onClick={marcarTodas}
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ListaNotificacoes notificacoes={notificacoes} onOpen={handleOpen} />
      </CardContent>
    </Card>
  );
}
