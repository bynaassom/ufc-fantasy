# Especificação de implementação — Home “Fight Night”

**Status:** pronta para implementação  
**Data:** 23 de agosto de 2026  
**Leitor principal:** GPT-5.6 Luna e pessoa revisora  
**Entrega desta fase:** redesign completo da home autenticada, sem refatorar o restante do produto

---

## 1. Objetivo final

A home deve deixar de parecer uma coleção de listas administrativas e passar a funcionar como a entrada para a noite de luta. A prioridade, nesta ordem, é:

1. identificar imediatamente o evento atual;
2. entender o andamento dos próprios picks;
3. entrar no card com um toque/clique;
4. receber contexto complementar sobre a luta principal;
5. enxergar desafios e descobrir um rival relevante;
6. navegar por próximos eventos e resultados anteriores com mais dinamismo.

O resultado deve ser mobile first, rápido, acessível, consistente em temas claro e escuro e reconhecível como um produto de fantasy de MMA — não como um dashboard SaaS genérico.

### Métrica principal

Aumentar a proporção de usuários que, a partir da home:

- entram no evento atual;
- iniciam os picks;
- concluem todos os picks antes do fechamento.

### Critério de sucesso visual

Em `390 × 844`, sem rolar a página, o usuário deve ver:

- a navegação;
- a saudação compacta;
- o nome e a imagem do evento atual;
- o estado/progresso dos picks;
- a ação principal inteira.

O comparativo da luta principal pode começar abaixo da dobra. Ele é complemento, não um segundo hero.

---

## 2. Escopo e ordem obrigatória da home

A composição é fixa. Não personalizar nem reordenar blocos por usuário nesta fase.

1. Saudação compacta;
2. evento atual + progresso/ação dos picks;
3. comparativo compacto da luta principal;
4. desafios ativos + rival sugerido;
5. carrossel de próximos eventos;
6. carrossel de eventos anteriores.

### Fora do escopo desta entrega

- redesign da tela de picks;
- novo acompanhamento ao vivo;
- novo ranking;
- reorganização global da navegação;
- mudanças no banco para salvar pick parcial;
- WebGL, Three.js, vídeos pesados, parallax ou scroll hijacking;
- telemetria/analytics nova, salvo se a infraestrutura já existir;
- reprodução literal das referências visuais.

As decisões futuras estão documentadas na seção 19 para impedir que a implementação da home crie conflitos com elas.

---

## 3. Decisões congeladas

Estas decisões vieram do grill de produto e não devem ser reinterpretadas pelo implementador.

### Evento atual

- É o elemento dominante da página.
- O bloco inteiro é clicável e abre diretamente `/event/[slug]`.
- Não existe modal ou prévia intermediária.
- A faixa estrutural logo abaixo do banner mostra progresso e CTA.
- O CTA é contextual: `Fazer picks`, `Continuar picks`, `Revisar picks`, `Ver card` ou `Acompanhar ao vivo`.
- O progresso usa a linguagem `8/13 picks` e uma barra visual.
- A saudação fica acima, em uma única linha: `Olá, Nome` à esquerda e pontos acumulados à direita.

### Comparativo da luta principal

- Os dois atletas aparecem ao mesmo tempo no mobile.
- Não transformar os atletas em carrossel.
- Altura mobile entre `280px` e `340px`.
- Exibir para ambos exatamente: cartel, vitórias por KO/TKO, vitórias por finalização e vitórias no primeiro round.
- Não exibir odds na home.
- CTA secundário `Ver confronto`, apontando para a luta principal dentro do card.
- Exibir discretamente `Dados dos atletas: UFC.com`.
- Se a luta principal não estiver confirmada/publicada, ocultar o bloco inteiro.
- Se uma imagem falhar, manter o bloco com fallback tipográfico/silhueta. Nunca desmontar a seção por falha de mídia.

### Próximos eventos

- Até 6 eventos.
- Carrossel manual; nunca autoplay.
- Swipe/drag no touch e setas no desktop.
- Parte do próximo card visível no mobile.
- Três cards visíveis no desktop.
- Card horizontal/landscape, próximo de `16:9`.
- Banner promocional limpo; data e local ficam em uma faixa estrutural abaixo.
- Não mostrar disponibilidade ou estado de picks nesses cards. Os picks futuros só abrem na semana do evento e esse estado adicionaria ruído.
- Se não houver banner, gerar poster tipográfico em CSS com nome, data/cidade, grid e formas vermelhas.
- Link `Ver todos` no cabeçalho da seção, apontando para `/event`.

### Eventos anteriores

- Até 6 eventos.
- Mesmo comportamento de carrossel dos próximos eventos.
- Link `Ver todos` apontando para `/historico`.
- O foco do card é o desempenho pessoal: pontos, posição, acertos e cravadas.
- Se o usuário não participou, manter o evento e mostrar `Você não participou`.
- Não chamar `fights_scored` de acertos. Acerto é pick com `points_winner > 0`.

### Desafios

- Lista compacta; nunca carrossel.
- No máximo 3 desafios reais na home.
- O rival sugerido é o último item, depois dos desafios reais.
- Algoritmo híbrido: priorizar alguém próximo e acima no ranking; fallback para pontuação semelhante no último evento.
- Sempre explicar a sugestão, por exemplo: `2 posições à sua frente` ou `mesma pontuação no último evento`.
- `Desafiar` abre uma confirmação curta com rival, evento e botão `Enviar desafio`.
- Nunca enviar desafio no primeiro toque.
- Usar o template `classic` por padrão.
- `Outra sugestão` percorre no máximo 3 candidatos sem repetir.

### Picks, para uma fase posterior

- Pick salvo continua com o mesmo tamanho e totalmente interativo até o lock.
- Não existe “modo edição” nem botão `Editar`.
- Tocar em outro atleta inicia a alteração imediatamente.
- Ao trocar o vencedor, limpar método e round.
- O pick anterior permanece oficial no servidor até o novo conjunto estar completo.
- A seleção incompleta é rascunho local em `localStorage`; nenhuma migration para pick parcial.
- Mostrar aviso persistente dentro do card: `Alteração incompleta · pick salvo: Song · Decisão · R3` e ação `Descartar`.
- Somente depois de vencedor + método + round completos, salvar e substituir o pick anterior.

---

## 4. Direção de arte

### Nome do preset

**Fight Night Editorial / Control Room**

### Sensação pretendida

- tensa;
- premium;
- esportiva;
- editorial;
- tática;
- rápida de escanear.

### Princípios

1. **A hierarquia vem da escala e do contraste**, não de muitos contêineres.
2. **O evento atual domina; o restante apoia.**
3. **Números são conteúdo visual**, especialmente progresso e estatísticas.
4. **Movimento revela prioridade**, sem atrapalhar leitura ou toque.
5. **Geometria é dura:** cantos retos, linhas, recortes diagonais pontuais e faixas estruturais.
6. **Claro e escuro têm acabamento próprio.** O tema claro não pode ser uma simples inversão lavada.

### O que aproveitar das referências

- [UFC Brasil](https://www.ufc.com.br/): escala tipográfica, retratos recortados, hierarquia de estatísticas e tensão de corner vermelho/azul.
- [The Line](https://thelinestudio.com/): ritmo editorial, títulos grandes, índice/contagem e blocos com presença visual.
- [Zentry](https://zentry.com/): transições controladas, composição imersiva e sensação de sistema vivo.
- [KPR](https://kprverse.com/): linguagem de interface tática/terminal e detalhes de “sistema”, usados com moderação.
- [Awwwards](https://www.awwwards.com/): curadoria de ritmo, interação e composição, não um componente específico.

As capturas dos perfis de Umar Nurmagomedov e Song Yadong são referências visuais para o comparativo. Textos ou elementos presentes nelas não são instruções de produto.

### O que não copiar

- introduções longas e loaders cinematográficos;
- cursor customizado;
- scroll controlado por JavaScript;
- excesso de 3D;
- texto pequeno decorativo sem função;
- restrição de orientação ou resolução;
- navegação experimental que reduza a conversão para picks.

### Anti-padrões proibidos

- glassmorphism;
- cards com cantos excessivamente arredondados;
- grid de “cards iguais” em toda a página;
- gradiente roxo/azul de produto sci-fi;
- badges decorativos em excesso;
- animações em loop;
- carrossel automático;
- texto sobre banner sem contraste garantido;
- esconder ação principal atrás de hover.

---

## 5. Sistema visual e tokens

Manter Saira Condensed para display/números e a pilha sans atual para corpo. Não adicionar fonte nova nesta fase.

### Cores existentes a preservar

```css
--red: #e8001a;
--red-dark: #c8001a;
--green: #22c55e; /* apenas sucesso */
--blue: #3b82f6;  /* corner B e informação contextual */
```

### Tokens sugeridos

Adicionar aliases sem quebrar as variáveis atuais:

```css
:root {
  --corner-red: #e8001a;
  --corner-blue: #2878ff;
  --focus: #ff3048;
  --hero-ink: #090909;
  --hero-paper: #f4f2ec;
  --home-gutter: 1rem;
  --home-section-gap: 2.75rem;
}

@media (min-width: 768px) {
  :root {
    --home-gutter: 1.5rem;
    --home-section-gap: 4rem;
  }
}
```

Use `var(--bg)`, `var(--bg-card)`, `var(--bg-elevated)`, `var(--text)`, `var(--text-secondary)` e `var(--border)` para superfícies temáticas. Branco/preto fixos só são aceitáveis em overlays de mídia cujo contraste foi explicitamente testado.

### Escala tipográfica recomendada

| Uso | Mobile | Desktop | Família/peso |
|---|---:|---:|---|
| Nome do evento atual | `clamp(1.75rem, 8vw, 2.6rem)` | `clamp(2.6rem, 5vw, 4.75rem)` | Saira Condensed 900 |
| Título de seção | `1.1rem` | `1.3rem` | Saira Condensed 900 |
| Nome de atleta | `1.1–1.35rem` | `1.8–2.5rem` | Saira Condensed 900 |
| Número de estatística | `1.4–1.8rem` | `2–2.6rem` | Saira Condensed 900 |
| Corpo | `0.875rem` | `0.9375rem` | sans 400–600 |
| Microcopy | `0.6875–0.75rem` | `0.75rem` | Saira Condensed 600–800 |

Não usar texto funcional abaixo de `11px`.

### Geometria

- raio padrão: `0` a `4px`;
- borda: `1px solid var(--border)`;
- faixa de ênfase: `3px` ou `4px` em vermelho;
- recortes diagonais: apenas no hero, comparativo e fallback de poster;
- target mínimo: `44 × 44px`.

---

## 6. Arquitetura da tela

### Wireframe mobile

```text
┌──────────────────────────────┐
│ Navbar                       │
├──────────────────────────────┤
│ Olá, Naassom       1.240 pts │
├──────────────────────────────┤
│                              │
│    BANNER EVENTO ATUAL       │  bloco inteiro clicável
│    nome · data · local       │
│                              │
├──────────────────────────────┤
│ 8/13 PICKS   ━━━━━━━░░  CTA  │
├──────────────────────────────┤
│ A  UMAR        SONG  B       │
│    imagens lado a lado       │
│ 20-1-0  · métricas · 23-9-1  │
│       VER CONFRONTO          │
├──────────────────────────────┤
│ DESAFIOS               TODOS │
│ desafio real 1               │
│ desafio real 2               │
│ Desafie @rival · motivo      │
├──────────────────────────────┤
│ PRÓXIMOS              TODOS  │
│ [ card 82vw ][próximo…       │
├──────────────────────────────┤
│ ANTERIORES            TODOS  │
│ [ card 82vw ][próximo…       │
└──────────────────────────────┘
```

### Wireframe desktop

```text
┌────────────────────────────────────────────────────────────┐
│ Navbar                                                     │
├────────────────────────────────────────────────────────────┤
│ Olá, Naassom                                    1.240 pts  │
├────────────────────────────────────────────────────────────┤
│                 EVENTO ATUAL — HERO                        │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 8/13 picks          ━━━━━━━━━━━━━░░         CONTINUAR       │
├────────────────────────────────────────────────────────────┤
│ UMAR + retrato │ métricas espelhadas │ retrato + SONG      │
├────────────────────────────────────────────────────────────┤
│ desafios reais (até 3) + sugestão ao final                  │
├────────────────────────────────────────────────────────────┤
│ PRÓXIMOS                       ← [card][card][card] →       │
├────────────────────────────────────────────────────────────┤
│ ANTERIORES                     ← [card][card][card] →       │
└────────────────────────────────────────────────────────────┘
```

Largura máxima recomendada da home: `1180px`. O hero pode ocupar toda essa largura; listas e trilhos não devem voltar ao limite atual de `max-w-4xl`.

---

## 7. Especificação por componente

### 7.1 `HomeSummary`

- Uma linha, sem bloco alto de boas-vindas.
- Esquerda: `Olá, {getDisplayName(profile)}`.
- Direita: `{total_points} pts` com número destacado.
- Altura alvo: `40–52px`.
- Não usar parágrafo explicativo abaixo.

### 7.2 `CurrentEventHero`

#### Estrutura

1. banner;
2. overlay de contraste;
3. selo `AO VIVO` somente quando `status === "live"`;
4. nome, data e local;
5. faixa de ação/progresso separada da imagem.

#### Comportamento

- Um único `<Link>` envolve banner e faixa.
- `href=/event/${event.slug}`.
- A faixa não pode parecer um botão desconectado; é parte da mesma ação.
- Em hover desktop, escala de imagem no máximo `1.04` e deslocamento da seta `2–4px`.
- Em touch, feedback por mudança de cor/opacity; não depender de hover.

#### CTA

| Estado | Rótulo |
|---|---|
| evento live | `Acompanhar ao vivo` |
| picks ainda não abriram | `Ver card` |
| abertos, 0 completos | `Fazer picks` |
| abertos, parcial | `Continuar picks` |
| abertos, completos | `Revisar picks` |
| bloqueados e não live | `Ver card` |

Mostrar barra numérica somente quando existe um total de lutas maior que zero. A fração é baseada em picks completos já persistidos, não em rascunho local.

#### Fallback sem banner

Usar `EventPosterFallback`; nunca um espaço vazio ou gradiente genérico. O fallback contém:

- `UFC FANTASY` pequeno;
- nome do evento grande;
- data e cidade;
- grid fino;
- faixa diagonal vermelha;
- número/slug do evento como detalhe editorial, quando existir.

### 7.3 `MainEventComparison`

#### Regra de seleção

Selecionar somente:

```ts
fight.card_type === "main" && fight.fight_order === 1
```

O seed e a convenção atual do projeto definem `fight_order = 1` como main event. Não usar “primeira luta retornada”, luta com cinturão ou fallback para preliminar.

#### Layout

- corner A à esquerda/vermelho;
- corner B à direita/azul;
- retratos recortados com `object-fit: contain` e ancoragem inferior;
- nomes próximos aos respectivos atletas;
- métricas espelhadas ou alinhadas em linhas centrais;
- ambos visíveis em `320px` de largura;
- altura mobile preferida: `320px`; mínimo `280px`, máximo `340px`.

#### Dados

```ts
type HomeFighterStats = {
  record: string | null;
  winsByKoTko: number | null;
  winsBySubmission: number | null;
  firstRoundWins: number | null;
  sourceUrl: string;
};

type HomeFighter = {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  stats: HomeFighterStats | null;
};

type HomeMainEvent = {
  fightId: string;
  eventSlug: string;
  weightClass: string;
  isTitleFight: boolean;
  fighterA: HomeFighter;
  fighterB: HomeFighter;
};
```

- Renderizar `—` para uma métrica isolada ausente.
- Se todas as métricas de um atleta estiverem ausentes, mostrar `Dados indisponíveis` no lugar da grade daquele lado.
- Não inventar zero quando a fonte não trouxe o valor.
- `Ver confronto` aponta para `/event/${eventSlug}#fight-${fightId}`.
- A tela do evento deve expor esse `id` no card correspondente; se ainda não expõe, adicionar apenas o atributo `id`, sem redesign da tela.

#### Fallback de imagem

1. `fighters.headshot_url` se for URL utilizável;
2. mídia resolvida da página oficial do atleta;
3. silhueta CSS/SVG local neutra;
4. iniciais e nome.

Falha de uma imagem não pode ocultar a imagem do outro atleta nem o comparativo.

### 7.4 `HomeChallenges`

- Preservar links dos desafios reais.
- Cortar desafios reais em 3, não 5.
- Se não houver desafio real e houver sugestão, não mostrar um grande empty state antes dela.
- `Ver todos` continua levando a `/desafios`.

### 7.5 `SuggestedChallengeCard`

```ts
type SuggestedRival = {
  userId: string;
  nickname: string;
  displayName: string;
  reason: string;
  rankPosition: number | null;
  lastEventPoints: number | null;
};
```

#### Algoritmo, em ordem

1. excluir o próprio usuário;
2. excluir banidos ou perfis não públicos/inválidos;
3. excluir usuários já presentes nos desafios reais retornados;
4. excluir par com desafio ativo ou pendente no evento atual;
5. se o usuário tem ranking, ordenar primeiro candidatos acima dele pela menor distância de posição;
6. preencher posições restantes pela menor diferença absoluta de pontos no último evento concluído;
7. desempatar por posição no ranking e depois por `userId`, garantindo resultado determinístico;
8. retornar no máximo 3.

Motivos devem ser calculados, não textos aleatórios:

- distância 1: `1 posição à sua frente`;
- distância N: `${N} posições à sua frente`;
- mesmo total no último evento: `mesma pontuação no último evento`;
- diferença pequena: `${N} ponto(s) de diferença no último evento`.

#### Interação

- `Outra sugestão` avança no array localmente.
- Não refazer request a cada troca.
- Após o terceiro candidato, ocultar ou desabilitar a troca com texto `Sem outras sugestões`.
- `Desafiar` abre `Dialog` do Radix.
- O diálogo mostra rival, evento atual e template `Pontuação total`.
- `Enviar desafio` reutiliza `POST /api/challenges` e `readApiResponse`.
- Sucesso: fechar diálogo, toast curto e invalidar/atualizar a home.
- Erro: manter diálogo aberto e mostrar mensagem acionável.

### 7.6 `HorizontalEventRail`

Usar scroll nativo com CSS scroll snap. Não instalar Swiper, Embla ou GSAP.

```css
.event-rail {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--home-gutter);
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.event-rail-card {
  flex: 0 0 min(82vw, 320px);
  scroll-snap-align: start;
}

@media (min-width: 768px) {
  .event-rail-card { flex-basis: min(44vw, 360px); }
}

@media (min-width: 1024px) {
  .event-rail-card { flex-basis: calc((100% - 2rem) / 3); }
}
```

- Setas aparecem em pointer fine/desktop.
- Cada seta rola aproximadamente a largura de um card + gap usando `element.scrollBy({ left, behavior: "smooth" })`.
- Estado disabled é calculado por `scrollLeft`, `clientWidth` e `scrollWidth`.
- Em `prefers-reduced-motion`, usar `behavior: "auto"`.
- Não capturar vertical scroll para simular drag. O touch nativo já resolve swipe.

### 7.7 `UpcomingEventCard`

- Banner em `16:9`.
- Faixa inferior contém nome, data e local.
- Não exibir CTA interno redundante; o card inteiro é link.
- Não exibir estado dos picks.
- `aria-label`: `Abrir {nome}, em {data}`.

### 7.8 `PreviousEventCard`

```ts
type PreviousEventPerformance = {
  eventId: string;
  participated: boolean;
  totalPoints: number | null;
  rankPosition: number | null;
  correctWinners: number | null;
  perfectPicks: number | null;
};
```

- `participated = true` se existir `event_scores` ou picks do usuário no evento.
- `correctWinners` é a contagem de picks com `points_winner > 0`.
- `perfectPicks` vem de `event_scores.perfect_picks`.
- Se participou: destaque pontos; linha secundária para posição, acertos e cravadas.
- Se não participou: `Você não participou`, sem zeros que pareçam desempenho real.
- Link para a página histórica já existente do evento, seguindo a rota usada pelo projeto.

---

## 8. Responsividade

| Largura | Comportamento obrigatório |
|---:|---|
| `320px` | sem overflow horizontal da página; atletas simultâneos; CTA do hero não corta |
| `360px` | card de trilho mostra pelo menos 12% do próximo card |
| `390px` | hero + ação principal acima da dobra em `390 × 844` |
| `430px` | comparativo mantém altura máxima de `340px` |
| `768px` | trilho mostra aproximadamente 2,2 cards; setas opcionais conforme pointer |
| `1024px` | 3 cards; hero mais largo; desafios continuam em lista |
| `1280px` | conteúdo limitado a `1180px`; não esticar retratos indefinidamente |
| `1440px+` | preservar limite e aumentar apenas respiro externo |

### Regras adicionais

- respeitar `env(safe-area-inset-bottom)` da navegação mobile atual;
- não criar sticky inferior na home;
- textos longos de evento podem ocupar no máximo duas linhas;
- localização pode truncar, data não;
- validar nomes de atletas longos em português e inglês;
- nenhuma ação funcional depende de hover.

---

## 9. Motion preset

A base já usa `LazyMotion`, `domAnimation`, `MotionConfig reducedMotion="user"` e modo `strict`. Portanto, componentes devem importar `m` de `motion/react`, nunca `motion`.

```ts
export const HOME_MOTION = {
  ease: [0.22, 1, 0.36, 1] as const,
  mobile: {
    fast: 0.18,
    base: 0.24,
    slow: 0.28,
    revealY: 8,
  },
  desktop: {
    fast: 0.22,
    base: 0.34,
    slow: 0.45,
    revealY: 16,
  },
  hoverScale: 1.04,
};
```

### Permitido

- hero: fade/translate curto na entrada;
- seções: reveal uma vez, com `opacity` e `y` pequenos;
- desktop: scale de imagem `1.03–1.04` no hover;
- barra de progresso: animação de largura na primeira renderização;
- estatísticas: contagem breve apenas se não comprometer estabilidade visual.

### Proibido

- autoplay;
- animação infinita, exceto pulso reduzido do estado live;
- parallax no touch;
- transformar o scroll horizontal nativo em timeline Motion;
- animar layout inteiro a cada atualização de dados;
- count-up que comece em zero a cada rerender;
- duração maior que `500ms` em interação funcional.

Com `prefers-reduced-motion`, mostrar imediatamente o estado final, desativar contagem e usar scroll sem suavização.

---

## 10. Bibliotecas e ferramentas

### Usar o que já existe

| Necessidade | Ferramenta |
|---|---|
| framework | Next.js `16.3.1`, App Router |
| UI | React `19.2.4` |
| estilo | Tailwind `3.4.1` + tokens em `globals.css` |
| movimento | Motion `13.1.0` |
| modal de confirmação | `radix-ui` `Dialog` |
| imagens | `next/image`, mantendo `images.unoptimized: true` |
| dados/auth | Supabase SSR + service role no servidor |
| validação | Zod `4.3.6` onde houver payload novo |
| feedback | `react-hot-toast` |
| unitários | Vitest `4.1.4` |
| E2E/responsivo | Playwright `1.59.1` |
| isolamento visual | Storybook `10.5.8`, opcional mas recomendado |

### Não adicionar nesta fase

- Swiper;
- Embla;
- GSAP;
- Lenis;
- Three.js;
- biblioteca nova de ícones;
- biblioteca nova de skeleton;
- segundo sistema de componentes.

Se surgir uma necessidade não coberta, primeiro demonstrar por que CSS nativo, Motion ou Radix não resolvem.

### Ferramentas de inspeção

- Browser/Playwright para comparar visualmente `320`, `360`, `390`, `430`, `768`, `1024`, `1280` e `1440`.
- DevTools Performance para procurar long tasks e layout shifts.
- Network para confirmar que a home não faz N+1 de estatísticas ou histórico.
- Storybook a11y para estados isolados, se já estiver operacional.

---

## 11. Regras de Next.js 16

Antes de editar código, ler os guias locais instalados no próprio projeto:

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
- `node_modules/next/dist/docs/03-architecture/accessibility.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`

### Limites de arquitetura

- `src/app/home/page.tsx` continua Server Component.
- Buscar e montar dados no servidor.
- Criar Client Components apenas para:
  - controles do trilho;
  - troca de rival sugerido;
  - diálogo e envio do desafio;
  - motion que realmente precise de runtime.
- Props atravessando a fronteira server/client devem ser serializáveis.
- Não fazer fetch do próprio `/api` a partir do Server Component.
- Em Next 16, `fetch` não deve ser tratado como cacheado por padrão; declarar cache/revalidate conscientemente.
- Reutilizar o padrão `unstable_cache` e tags já presente no serviço.
- Manter `next/image` e a configuração `images.unoptimized: true`, pois ela evita 403 das CDNs atuais.
- Atualizar o skeleton da home para corresponder à nova geometria.

---

## 12. Arquitetura de dados da home

### Contrato final sugerido

```ts
type HomePageData = {
  profile: Profile;
  userId: string;
  currentEvent: Event | null;
  currentEventPickProgress: { picked: number; total: number };
  mainEvent: HomeMainEvent | null;
  activeChallenges: HomeChallenge[]; // máximo 3
  suggestedRivals: SuggestedRival[]; // máximo 3
  upcomingEvents: Event[]; // máximo 6
  previousEvents: Array<{
    event: Event;
    performance: PreviousEventPerformance;
  }>; // máximo 6
};
```

### Carregamento

Em `getHomePageData()`:

1. carregar evento atual, até 6 próximos e até 6 concluídos em paralelo;
2. resolver a sequência pública como hoje;
3. com `currentEvent.id`, carregar lutas, picks, total de lutas e desafios em paralelo;
4. selecionar main event de forma determinística;
5. buscar estatísticas dos dois atletas com `Promise.allSettled` e cache;
6. buscar performance dos eventos anteriores em lote;
7. buscar standings/perfis necessários à sugestão em lote;
8. montar DTO serializável e enxuto.

Uma falha no UFC.com não pode falhar a home. Uma falha de dados essenciais do Supabase deve seguir o tratamento de erro atual da aplicação.

### Evitar N+1

Adicionar funções de repositório em lote:

```ts
listEventScoresForUserAndEvents(client, userId, eventIds)
listPicksForUserAndEvents(client, userId, eventIds)
```

A segunda pode selecionar apenas `event_id, points_winner, total_points`, pois a home não precisa do pick inteiro.

Não executar uma query por card anterior.

---

## 13. Estatísticas oficiais dos atletas

### Decisão de persistência

**Não criar migration nesta fase.** Extrair o parser que hoje está dentro de `/api/fighter-stats/[slug]` para um módulo de servidor reutilizável e aplicar cache explícito. Isso entrega a home sem ampliar o schema e mantém a rota atual compatível.

### Estrutura proposta

Criar `src/lib/ufc-fighter-stats.ts` com:

- normalização e candidatos de slug;
- fetch da página `ufc.com.br`, com fallback `ufc.com` se necessário;
- timeout de 10 segundos;
- parser puro exportado para testes;
- resolução de cartel, KO/TKO, finalizações e vitórias no primeiro round;
- retorno com `null` em dado ausente;
- URL da fonte e slug efetivamente resolvido.

Criar função cacheada no servidor:

```ts
const getCachedHomeFighterStats = unstable_cache(
  async (slug: string, name: string) => fetchUfcFighterStats({ slug, name }),
  ["home-fighter-stats"],
  { revalidate: 21_600 }, // 6 horas
);
```

Se a assinatura de `unstable_cache` instalada exigir chave diferente para argumentos, seguir a documentação local do Next 16; não presumir comportamento de versões antigas.

### Primeiro round

O parser deve reconhecer rótulos em português e inglês, incluindo variações equivalentes a:

- `Vitórias no 1º round`;
- `Vitórias no 1° round`;
- `First Round Wins`.

Usar fixture HTML reduzida nos testes. Não testar fazendo request real ao UFC.com.

### Mídia

- Ampliar `listEventFights` para retornar `slug`, `ufc_fighter_id`, `headshot_url` e `country` dos atletas.
- Atualizar `Fighter` em `src/types/index.ts` para incluir `slug?: string | null`.
- Reutilizar `isUsableHeadshotUrl` e `resolveUfcFighterMedia`.
- Cachear resolução de mídia quando ela for acionada pela home.
- Não alterar `images.unoptimized` nesta tarefa.

### Compatibilidade da API existente

`src/app/api/fighter-stats/[slug]/route.ts` deve delegar ao novo módulo e preservar o shape atualmente consumido por `FightStatsCompare`. Adicionar `firstRoundWins` de forma aditiva, sem remover campos existentes.

---

## 14. Dados de eventos anteriores

Adicionar em `src/server/repositories/event-scores.ts`:

```ts
export async function listEventScoresForUserAndEvents(
  client: DbClient,
  userId: string,
  eventIds: string[],
)
```

Selecionar:

```text
user_id, event_id, total_points, fights_scored, rank_position, perfect_picks
```

Adicionar em `src/server/repositories/picks.ts` uma query em lote por `user_id` e `.in("event_id", eventIds)`, selecionando somente os campos necessários.

### Mapeamento correto

```ts
const correctWinners = picks.filter((pick) => pick.points_winner > 0).length;
const participated = Boolean(score) || picks.length > 0;
```

- Não inferir acertos a partir de `fights_scored`.
- Não converter ausência de score em zero se não houve participação.
- Ordenar os eventos pela data mais recente, preservando a ordem retornada pelo repositório.

---

## 15. Dados da sugestão de rival

Criar `src/lib/challenge-suggestions.ts` como função pura. A função não acessa Supabase; recebe arrays e devolve candidatos ordenados. Isso torna o algoritmo testável.

Fontes possíveis já presentes no projeto:

- temporada atual por `getCurrentSeason`;
- ranking por `listGlobalSeasonStandings`;
- último evento concluído por `event_scores`;
- perfis por `findPublicProfilesByIds`;
- desafios por `listChallengesForUser` e checagens existentes.

### Segurança e autorização

A sugestão é apenas apresentação. O endpoint `POST /api/challenges` continua sendo a autoridade e deve revalidar:

- usuário autenticado e ativo;
- evento válido;
- rival diferente do próprio usuário;
- inexistência de desafio ativo duplicado;
- template permitido.

Nunca confiar no candidato enviado pelo Client Component sem a validação atual do servidor.

---

## 16. Arquivos a modificar/criar

### Modificar

- `src/app/home/page.tsx`
- `src/server/services/app.ts`
- `src/server/repositories/fights.ts`
- `src/server/repositories/event-scores.ts`
- `src/server/repositories/picks.ts`
- `src/app/api/fighter-stats/[slug]/route.ts`
- `src/types/index.ts`
- `src/types/api.ts`
- `src/components/challenges/HomeChallenges.tsx`
- `src/components/event/EventPicksClient.tsx` (somente o `id` de deep link no card da luta)
- `src/components/ui/LoadingSkeleton.tsx`
- `src/app/globals.css`

### Criar

- `src/components/home/HomeSummary.tsx`
- `src/components/home/CurrentEventHero.tsx`
- `src/components/home/MainEventComparison.tsx`
- `src/components/home/EventPosterFallback.tsx`
- `src/components/home/HorizontalEventRail.tsx`
- `src/components/home/UpcomingEventCard.tsx`
- `src/components/home/PreviousEventCard.tsx`
- `src/components/home/SuggestedChallengeCard.tsx`
- `src/lib/ufc-fighter-stats.ts`
- `src/lib/challenge-suggestions.ts`
- `src/lib/home-event-performance.ts`
- `tests/unit/ufc-fighter-stats.test.ts`
- `tests/unit/challenge-suggestions.test.ts`
- `tests/unit/home-event-performance.test.ts`
- `tests/e2e/home-redesign.spec.ts`

Não criar migration para esta fase.

O implementador pode consolidar componentes muito pequenos, mas deve manter as fronteiras Server/Client e a responsabilidade de cada unidade claras.

---

## 17. Plano de implementação para Luna

### Etapa 0 — segurança do workspace

- ler `AGENTS.md` e os guias Next 16 listados;
- inspecionar `git status`;
- preservar alterações do usuário;
- não apagar ou reformatar arquivos fora do escopo;
- confirmar as rotas históricas e o `id` atual dos cards de luta antes de criar links.

### Etapa 1 — tipos e funções puras

- adicionar os DTOs da home;
- extrair parser UFC e incluir primeiro round;
- implementar algoritmo de sugestão;
- implementar agregação de performance passada;
- escrever testes unitários antes de ligar a UI.

### Etapa 2 — repositórios e serviço

- ampliar select das lutas;
- criar queries em lote de scores e picks;
- retornar 6 próximos e 6 anteriores;
- reduzir desafios reais para 3;
- montar main event, performances e sugestões;
- garantir degradação com `Promise.allSettled` para fonte externa.

### Etapa 3 — shell visual da home

- ampliar container;
- implementar saudação e hero;
- atualizar skeleton;
- validar o objetivo acima da dobra em `390 × 844` antes de seguir.

### Etapa 4 — comparativo

- renderizar os dois atletas;
- implementar fallbacks independentes de imagem/dados;
- adicionar deep link para a luta;
- testar nomes e dados incompletos.

### Etapa 5 — desafios

- limitar lista;
- incluir sugestão como último item;
- implementar ciclo de 3 alternativas;
- implementar confirmação Radix e reutilizar API.

### Etapa 6 — trilhos de eventos

- criar componente de scroll snap;
- implementar próximos e anteriores;
- setas desktop e swipe nativo;
- fallback de poster em CSS;
- validar light/dark e viewports.

### Etapa 7 — motion e acabamento

- aplicar preset de motion somente depois do layout estável;
- garantir reduced motion;
- revisar focus, contraste, truncamento e skeleton;
- não adicionar motion para mascarar problemas de hierarquia.

### Etapa 8 — verificação

- executar testes unitários;
- lint;
- build de produção;
- Playwright autenticado em todos os viewports definidos;
- inspecionar screenshots em tema claro e escuro;
- verificar requests e ausência de N+1.

---

## 18. Testes e Definition of Done

### Unitários

#### Main event

- seleciona `main + fight_order 1`;
- não seleciona main order 2 se order 1 não existe;
- não usa preliminar como fallback;
- retorna `null` sem main event confirmado.

#### Parser UFC

- lê cartel PT/EN;
- lê KO/TKO;
- lê finalização `FIN` e `SUB`;
- lê primeiro round com `º`, `°` e inglês;
- retorna `null` em valor ausente;
- não transforma ausência em zero.

#### Rival sugerido

- exclui self, banido e rival já desafiado;
- prioriza posição imediatamente acima;
- usa pontuação semelhante como fallback;
- desempate é determinístico;
- retorna no máximo 3 e não repete.

#### Performance passada

- conta acertos por `points_winner > 0`;
- distingue zero pontos de não participação;
- mapeia rank e cravadas corretamente.

### Playwright

Criar cenários autenticados para:

- `320 × 568`;
- `360 × 800`;
- `390 × 844`;
- `430 × 932`;
- `768 × 1024`;
- `1024 × 768`;
- `1440 × 900`.

Validar:

- nenhum overflow horizontal da página;
- evento atual e CTA visíveis em `390 × 844`;
- hero inteiro abre a rota do evento;
- carrossel responde a swipe/scroll e setas;
- próximo card aparece parcialmente no mobile;
- 3 cards aparecem no desktop;
- sugestão troca sem repetir;
- primeiro clique em `Desafiar` apenas abre confirmação;
- envio só ocorre no botão do diálogo;
- comparativo some quando não há main event;
- falha de imagem mantém layout;
- temas claro e escuro;
- reduced motion.

### Acessibilidade

- um `h1` por página;
- seções com `h2` e `aria-labelledby`;
- links com nome acessível completo;
- setas do carrossel com `aria-label` e estado `disabled`;
- diálogo com título, descrição, foco inicial e retorno de foco;
- contraste WCAG AA para texto funcional;
- foco visível;
- ordem de tabulação igual à ordem visual;
- targets mínimos de `44px`;
- imagens decorativas com `alt=""`; imagens informativas com nome do atleta/evento;
- mudanças de sugestão não precisam live region; resultado do envio deve ter feedback acessível.

### Performance

- nenhuma dependência nova de carrossel;
- Client Components pequenos e localizados;
- nada de fetch externo no browser para montar a home;
- estatísticas cacheadas por 6 horas;
- queries anteriores em lote;
- imagens com `sizes` coerente;
- reservar dimensões para evitar CLS;
- hero pode ter `priority`; cards fora da dobra não;
- sem vídeo, WebGL ou textura raster pesada.

### Comandos de entrega

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Se o E2E autenticado depender de credenciais, registrar claramente as variáveis ausentes e ainda executar unit, lint e build. Não declarar a tarefa concluída sem relatar o que foi e não foi verificado.

### Definition of Done

- [ ] ordem fixa da home implementada;
- [ ] hero leva diretamente aos picks/card;
- [ ] progresso correto e CTA contextual;
- [ ] comparativo compacto com ambos os atletas e quatro métricas simétricas;
- [ ] sem odds na home;
- [ ] sugestão de rival explicada e confirmada antes do envio;
- [ ] até 6 próximos e 6 anteriores em carrosséis manuais;
- [ ] desempenho anterior calculado corretamente;
- [ ] fallbacks de banner, imagem e estatística;
- [ ] light/dark com acabamento equivalente;
- [ ] reduced motion;
- [ ] sem migration;
- [ ] sem dependência desnecessária;
- [ ] testes, lint e build reportados;
- [ ] screenshots responsivos revisados.

---

## 19. Direção futura — não implementar agora

### Acompanhamento ao vivo

- O card continua dominante.
- Substituir o painel atual por um scorebug superior sticky de `48–56px`.
- Nunca usar painel fixo ocupando 1/3 da web.
- Nunca abrir ou rolar automaticamente.
- Scorebug mostra luta atual + fase/round; pontos aparecem brevemente quando mudam.
- Mobile: toque abre bottom sheet em Radix Dialog.
- Desktop: toque abre drawer à direita.
- Conteúdo padrão `Agora`: luta atual, pick do usuário, resultado mais recente e próxima luta.
- Ranking e histórico ficam em abas secundárias.
- Resultado atualiza inline; sem modal grande ou toast intrusivo.
- Lutas encerradas permanecem no tamanho normal, com opção `Ocultar encerradas`.
- Ordem do card nunca muda.

### Picks

Aplicar exatamente o fluxo de rascunho local descrito na seção 3. O banco continua aceitando somente picks completos. O `EventPicksClient` precisará de um tipo separado de draft incompleto no `localStorage`; a API não muda para aceitar campos parciais.

### Sistema global

- home e evento: camada mais cinematográfica;
- ranking, ligas e desafios: editorial funcional;
- desktop: `Início`, `Evento`, `Ranking`, `Ligas`; demais itens em `Mais`;
- ranking: Top 3 editorial horizontal + tabela densa, sem pódio genérico de cards.

---

## 20. Prompt pronto para o GPT-5.6 Luna

Recomendação: usar **GPT-5.6 Luna** com reasoning effort **high** para a implementação completa. Se o ambiente dividir a execução em tarefas pequenas, `medium` é suficiente para etapas mecânicas. O modelo é adequado a trabalho de alto volume e custo controlado; o prompt deve continuar enxuto, com objetivo, contexto, restrições e critérios de sucesso explícitos. Consulte a [página do modelo GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) e o [guia oficial de prompting do GPT-5.6](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6).

Copiar o bloco abaixo como pedido de implementação:

```text
Implemente integralmente a especificação:
docs/superpowers/specs/2026-08-23-home-redesign-luna-implementation-spec.md

Objetivo: redesenhar somente a home autenticada para priorizar o evento atual e levar o usuário aos picks, com comparativo compacto da luta principal, desafios com rival sugerido e carrosséis manuais de próximos eventos e resultados anteriores.

Antes de codar:
1. Leia AGENTS.md.
2. Leia por completo a especificação acima.
3. Leia os guias locais do Next 16 indicados na seção 11.
4. Inspecione git status e preserve alterações existentes.
5. Inspecione as rotas e tipos atuais; não assuma APIs de versões antigas do Next.

Restrições duras:
- Não implemente as fases futuras de live, picks, ranking ou navegação.
- Não crie nem altere migrations.
- Não adicione bibliotecas sem demonstrar necessidade; use Motion, Radix e CSS scroll snap já disponíveis.
- Mantenha src/app/home/page.tsx como Server Component e minimize Client Components.
- Não faça fetch do próprio endpoint no Server Component.
- Não deixe falhas do UFC.com derrubarem a home.
- Não comprima picks concluídos e não crie modo edição; isso é apenas direção futura, não escopo desta entrega.
- Não altere arquivos fora do escopo e não destrua mudanças do usuário.

Autonomia:
- Pode criar/modificar os arquivos listados na seção 16.
- Pode ajustar nomes de componentes se mantiver as responsabilidades e contratos.
- Pode corrigir problemas diretamente necessários para lint, build e testes desta entrega.
- Pare e peça decisão somente se uma escolha mudar produto, schema ou escopo.

Critérios de sucesso:
- Todos os itens da Definition of Done da seção 18.
- Em 390×844, evento atual, progresso e CTA aparecem sem scroll.
- Ambos os atletas aparecem simultaneamente no mobile.
- Carrosséis são manuais, mostram o próximo card parcialmente no mobile e 3 cards no desktop.
- Desafio sugerido explica o motivo e exige confirmação.
- Sem N+1, sem migration e sem dependência nova de carrossel.
- Tema claro, tema escuro, foco visível e reduced motion verificados.

Processo:
- Trabalhe por etapas da seção 17.
- Após cada etapa relevante, execute os testes proporcionais.
- Ao terminar, rode npm test, npm run lint, npm run build e npm run test:e2e.
- Faça inspeção visual com Playwright nos viewports definidos.
- Entregue resumo de arquivos, decisões, testes executados, screenshots e qualquer limitação real.
```

---

## 21. Observações sobre o estado atual do código

Estas observações evitam redescoberta durante a implementação:

- `src/app/home/page.tsx` hoje usa `max-w-4xl` e listas verticais para próximos/anteriores.
- `getHomePageData()` hoje busca 10 próximos, 3 concluídos, até 5 desafios e não inclui lutas do evento atual.
- `listEventFights()` hoje não retorna mídia/slug completo dos atletas.
- `/api/fighter-stats/[slug]` já parseia cartel, KO/TKO e finalizações, mas não primeiro round.
- `src/lib/ufc-fighter-media.ts` já prioriza imagens full body oficiais.
- `next.config.mjs` desativa proxy de imagem propositalmente por 403 de CDN.
- `MotionProvider` já usa `LazyMotion` strict e reduced motion.
- `HomeChallenges` é Server Component; a confirmação sugerida deve ser uma ilha Client pequena.
- o endpoint de desafios, validação e toast já existem e devem ser reutilizados.
- `event_scores.fights_scored` não é sinônimo de acertos.
- `points_winner > 0` é a fonte correta para acertos de vencedor.
- o seed documenta `main + fight_order 1` como main event.
- o skeleton atual da home representa listas antigas e precisa acompanhar a nova geometria.
