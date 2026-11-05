# Revisão dos avisos de segurança de 19/09/2026

A exportação contém 44 avisos: 11 de search_path, 16 de execução por anon,
16 de execução por authenticated e 1 de proteção de senhas vazadas.

## Correção

Aplicar `supabase/migrations/20260919000001_function_security_hardening.sql`
no SQL Editor como administrador. É independente da migration das views.
A mudança preserva os corpos das funções e as regras de negócio existentes.

- Fixa o search_path das 11 funções indicadas que ainda não tenham essa configuração.
- Remove CREATE em public para PUBLIC, anon e authenticated, tornando esse schema
  confiável para referências antigas sem prefixo. Acesso normal às tabelas permanece.
- Restringe funções de XP, streak, seguidores e abertura de palpites ao service_role.
- Remove permissões diretas dos clientes nas funções internas de gatilho listadas.
  Os gatilhos existentes continuam instalados e seus proprietários mantêm acesso.
- Funções legadas ausentes são ignoradas; todas as sobrecargas dos nomes listados
  são tratadas. Não recria funções existentes apenas no banco remoto.

Depois, executar `supabase/tests/function_security_hardening.sql` como administrador.
O script verifica permissões, configuração e funcionamento de um gatilho real
em tabela temporária. Finaliza com ROLLBACK e não altera os dados do app.
Verificar também cadastro, criação/edição de palpites e rankings no ambiente aplicado.

## Avisos intencionais

Manter os avisos de execução de `is_admin`, `picks_are_open`, `picks_are_locked`
e `pick_update_is_safe`: são auxiliares de leitura usados nas políticas RLS.
Não remover SECURITY DEFINER nem EXECUTE indiscriminadamente, pois pode quebrar
essas políticas ou causar recursão ao consultar tabelas protegidas.
`is_admin` consulta o usuário autenticado; não promove o usuário a administrador.

## Proteção de senhas

Não é resolvida com SQL. Ativar Leaked Password Protection nas configurações de
Auth se o projeto tiver plano Pro ou superior. Se estiver no plano Free, aceitar
essa limitação sem contratar um plano automaticamente. Não é evidência de vazamento.

## Limites da validação

Revisão baseada na exportação do Advisor e no repositório. Os corpos de
`open_next_event_picks`, `rls_auto_enable`, `recalc_pick_total_points` e
`set_picks_lock_at` não estão versionados aqui. A migration altera configuração
ou permissões quando presentes, preservando seus corpos. Não equivale a uma
auditoria completa dessas funções remotas.

Não aplicada ao projeto remoto nesta tarefa. O PostgreSQL local tem caminhos de
instalação incompletos; o teste SQL precisa ser executado no ambiente Supabase.

Referências:
- https://supabase.com/docs/guides/database/functions
- https://www.postgresql.org/docs/current/sql-createfunction.html
- https://supabase.com/docs/guides/auth/password-security
