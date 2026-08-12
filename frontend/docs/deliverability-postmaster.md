# Entregabilidade de e-mail — monitoramento e reputação

Guia operacional para manter os e-mails da Formattio fora do spam. A **autenticação
já está correta e não é a causa** do problema (ver diagnóstico abaixo); o que resta é
**reputação de domínio**, que se constrói medindo e engajando.

Domínio de envio: `formattio.com.br` (Resend / Amazon SES, região `sa-east-1`).
DNS gerenciado na **Cloudflare** (Hostinger é só registrador).

---

## 1. Diagnóstico atual (2026-08-12) — autenticação OK

Verificado por consulta DNS ao vivo (`8.8.8.8`):

| Item | Registro | Estado |
|------|----------|--------|
| **SPF** (envelope) | `send.formattio.com.br` → `v=spf1 include:amazonses.com ~all` | ✅ passa e alinha (relaxed) com `From @formattio.com.br` |
| **DKIM** | `resend._domainkey.formattio.com.br` | ✅ presente, assina `d=formattio.com.br` (alinhado) |
| **DMARC** | `_dmarc.formattio.com.br` = `v=DMARC1; p=none; rua=…@dmarc-reports.cloudflare.net` | ✅ existe (satisfaz Gmail/Yahoo); `rua` coletando via Cloudflare |

Correções de conteúdo já aplicadas em código (commit `e158cfa` + este):
- **Parte `text/plain`** em todos os e-mails (antes eram só-HTML → regra `MIME_HTML_ONLY`).
- **`List-Unsubscribe` one-click (RFC 8058)** nos e-mails de marketing.
- **Dica "adicione aos contatos"** no rodapé de todos os e-mails.

---

## 2. Google Postmaster Tools (medir reputação no Gmail)

O Gmail é a maior fatia da base. O Postmaster Tools mostra **reputação de domínio/IP,
taxa de spam, autenticação (SPF/DKIM/DMARC) e loop de feedback** — é o painel-verdade.

### Passo a passo
1. Acesse **https://postmaster.google.com** com a conta Google da empresa (idealmente
   a mesma que administra o Search Console de `formattio.com.br`).
2. **Add domain** → digite `formattio.com.br`.
3. **Verificação:**
   - Se o domínio **já está verificado no Google Search Console** com esta conta, o
     Postmaster Tools reaproveita a verificação — nada a fazer.
   - Caso contrário, o Google fornece um TXT `google-site-verification=…`. Adicione-o
     na **Cloudflare → DNS → Records** (Type `TXT`, Name `@`, Content o valor dado,
     Proxy **DNS only**). Já existe um `google-site-verification` no apex — **não
     substitua**; crie um segundo TXT (múltiplos são válidos). Volte e clique **Verify**.
4. Aguarde **~48h** para os dashboards popularem (precisa de volume mínimo — alguns
   dias de envios reais). Sem volume, os gráficos ficam vazios; é esperado.

### O que observar (semanalmente no início)
- **Spam rate:** meta **< 0,1%**; acima de **0,3%** o Gmail começa a punir. Este é o
  número mais importante.
- **Domain reputation:** meta **High** (ou ao menos **Medium**). **Low/Bad** = maioria
  vai pro spam — agir imediatamente (reduzir volume, limpar lista, aumentar engajamento).
- **Authentication:** SPF/DKIM/DMARC devem aparecer **~100% passing**. Se cair, algo
  quebrou no DNS.

> **Microsoft (Outlook/Hotmail/Live), opcional:** cadastre-se no **SNDS**
> (postmaster.live.com/snds) e no **JMRP** (loop de feedback) — úteis se houver muitos
> destinatários @outlook/@hotmail.

---

## 3. Warm-up e engajamento (constrói reputação rápido)

Domínio novo/ baixo volume tende a cair em spam ou na aba "Promoções" até "esquentar".

- **Volume gradual e constante** — evite picos súbitos de envio; cresça aos poucos.
- **Peça o allowlisting nos primeiros contatos** (ver a dica que já vai no rodapé):
  marcar **"Não é spam" / mover para a caixa de entrada** e **adicionar
  `contato@formattio.com.br` aos contatos**. Poucas ações dessas movem a reputação
  bem mais rápido do que qualquer ajuste técnico.
- **Só envie para quem opta / espera** — a suppression list (hard bounce/complaint) já
  está ativa via webhook do Resend; mantenha listas limpas.
- **Responda ao Reply-To** — conversas reais (respostas dos usuários ao `contato@`)
  sinalizam legitimidade.

---

## 4. Apertar o DMARC (anti-spoofing, ritmo conservador)

Hoje `p=none` (só monitora). Com o `rua` do Cloudflare coletando, subir em degraus
sinaliza domínio bem gerido. **Editar** (não duplicar) o TXT `_dmarc` na Cloudflare:

1. `p=none` → observar relatórios ~1–2 semanas (confirmar que só o Resend/SES envia).
2. `p=quarantine; pct=25` → `pct=100`.
3. `p=reject`.

Lembrete de revisão já agendado para **2026-08-22**. Antes de `reject`, confirmar nos
relatórios que **nada legítimo** envia por outra origem (ex.: webmail Hostinger — as
caixas Hostinger só **recebem** aliases, receber não usa SPF).

---

## 5. Checklist rápido quando "está caindo no spam"

- [ ] Postmaster Tools: spam rate < 0,1%? Domain reputation ≥ Medium?
- [ ] SPF/DKIM/DMARC ~100% passing no Postmaster?
- [ ] O e-mail tem parte texto + HTML? (sim, garantido no código)
- [ ] Marketing tem `List-Unsubscribe` one-click? (sim, garantido no código)
- [ ] A lista está limpa (sem endereços inválidos/reclamações)?
- [ ] Volume estável, sem picos?
- [ ] Pediu aos primeiros destinatários para adicionar aos contatos / marcar "não é spam"?
