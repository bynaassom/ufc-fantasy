# Notificacoes de Picks e Card

## Objetivo

Implementar notificacoes in-app e push no navegador para avisar usuarios sobre picks abertos, picks perto de fechar e mudancas no card do evento atual.

## Regras de Produto

- Notificacoes de picks abertos vao para usuarios ativos.
- Notificacoes de picks fechando amanha, hoje, em 1 hora, 30 minutos e 15 minutos vao apenas para usuarios ativos que ainda nao tem pick confirmado no evento atual.
- Notificacoes de card atualizado, luta removida e luta adicionada vao para todos os usuarios ativos.
- Usuario ativo significa perfil com `is_banned = false`.
- As mensagens devem ter um tom informal e divertido, sem depender de email.

## Arquitetura

- A tabela `notifications` continua sendo a fonte das notificacoes in-app.
- Uma nova tabela `push_subscriptions` guarda inscricoes Web Push por usuario/dispositivo.
- Um service worker em `public/sw.js` recebe pushes e abre `target_path` ao clicar.
- APIs autenticadas permitem registrar/remover inscricoes push do usuario atual.
- Uma rota protegida de cron dispara lembretes de picks conforme janelas de tempo.
- Fluxos administrativos que criam, removem ou sincronizam lutas disparam notificacoes de card.

## Entrega Web Push

O servidor usa VAPID via `web-push`. Quando as variaveis de ambiente nao estiverem configuradas, o app continua criando notificacoes in-app e apenas pula o envio push. Isso deixa o recurso seguro para ambientes locais e preview.

Variaveis esperadas:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `NOTIFICATIONS_CRON_SECRET`

## Anti-Duplicidade

Cada notificacao gerada automaticamente recebe uma `dedupe_key`. O banco impede duplicidade por `user_id + dedupe_key`, entao cron e rotas podem ser reexecutados sem criar spam.

## Mensagens

Exemplos aprovados:

- "E ai, ja fez seus picks? Faltam so 15 minutos pra fechar, hein."
- "Ultima chamada pro octogono: seus picks fecham em 30 minutos."
- "Ih, deu ruim: a luta X vs Y caiu do card."
- "Tem luta nova no card: X vs Y. Bora ajustar os palpites?"
- "Card atualizado. Da uma conferida antes de cravar seus picks."

## Testes

- Testar as janelas de lembretes de picks.
- Testar copia/titulo por tipo de notificacao.
- Testar filtragem de usuarios sem pick confirmado.
- Testar envio sem Web Push configurado, garantindo que in-app continua funcionando.
