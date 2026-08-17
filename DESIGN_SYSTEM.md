# ClanForge — Guia de Design

Este documento é a referência obrigatória para qualquer tela ou componente novo do ClanForge. Preserve o sistema abaixo antes de criar estilos locais.

## Direção visual

- Tema: dark fantasy premium para comunidades de MMORPG.
- Atmosfera: imersiva, elegante, misteriosa; nunca infantil ou excessivamente brilhante.
- Fundo base: `#050912`, com camadas azul-marinho e gradientes sutis.
- Cor de ação: roxo. Use `#6D28D9` no estado padrão e `#8B5CF6` no hover.
- Texto principal: `#F7F7FB`; texto secundário: `#A7AFC2`; bordas: `rgba(155,170,205,.14)`.

## Tipografia e espaçamento

- Use `Outfit` para títulos, números e marca; `DM Sans` para textos de interface e corpo.
- Títulos possuem peso 700–800, tracking levemente negativo e frases objetivas.
- O container padrão é `.shell`, com largura máxima de 1384px e margem lateral mínima de 36px (18px em mobile).
- Prefira bordas de 7–10px e espaçamento generoso. Evite sombras pretas pesadas.

## Componentes reutilizáveis

- Use `PrimaryButton` para toda ação primária roxa. Não replique sua animação em componentes novos.
- Use `SiteHeader` como navegação global fixa; a faixa do cabeçalho deve ocupar 100% da viewport, com `backdrop-filter` e fundo translúcido.
- Use `StatCard` para números, métricas e KPIs; mantenha a animação de entrada em `y: 20 → 0` e `opacity: 0 → 1`, com delay de 100ms por item.
- Use `FeatureCard` para recursos de produto: ícone roxo, título curto e descrição de uma ou duas linhas. No hover, eleve 4px, aplique glow roxo discreto e gire o ícone até 8°.
- Cards de conteúdo informativo, como dores de líderes, devem usar a mesma entrada suave e interação visual de `FeatureCard`.

## Interações

- Botões primários: hover `scale(1.04)`, glow roxo de 20px e cor `#8B5CF6`; click `scale(0.97)` com retorno spring.
- Ícones de `StatCard` podem girar até 8° no hover, mas os cards não devem elevar, ganhar glow ou mudar de fundo.
- Animações de entrada devem ser curtas (350–550ms), com `easeOut`, e usar `whileInView` quando o elemento nasce abaixo da dobra.
- Respeite `prefers-reduced-motion` ao criar animações que não sejam essenciais.

## Imagens e superfícies

- Imagens de fantasia devem ter espaço negativo para conteúdo e receber sobreposição azul-marinho para legibilidade.
- Ao encerrar um hero com imagem, use fade vertical em gradiente para `#050912`; nunca uma linha de corte dura.
- Cards usam gradiente azul-marinho discreto e borda translúcida. Não use branco sólido em superfícies.

## Implementação

- Crie componentes pequenos em `components/ui`, `components/cards`, `components/layout` ou `components/sections` conforme a responsabilidade.
- Dados repetidos devem ficar em arrays tipados e ser renderizados por componentes, não duplicados no JSX.
- Valide estruturas de conteúdo com Zod quando vierem de CMS, Firebase ou API.
- Use classes globais existentes antes de adicionar novos tokens ou estilos.
- Todo texto novo deve ser incluído nos catálogos `messages/*.json` e acessado com `next-intl`; nunca introduza texto de interface fixo em componentes.
- Consulte `TRANSLATION_GUIDE.md` antes de criar ou alterar qualquer interface com texto.
