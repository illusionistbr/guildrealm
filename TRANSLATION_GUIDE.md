# Internacionalização obrigatória

O ClanForge usa `next-intl`. Todo conteúdo de interface precisa existir em `messages/pt-BR.json`, `messages/en.json`, `messages/es.json`, `messages/ko.json`, `messages/ja.json`, `messages/ru.json` e `messages/zh.json`.

## Regra

Não escreva texto visível diretamente em componentes. Use `useTranslations` em componentes cliente ou `getTranslations` em componentes de servidor.

## Conteúdo estruturado

Para cards, planos, jogos, filtros e listas, mantenha arrays dentro do namespace da página no catálogo e leia-os com `t.raw(...)`. Os componentes recebem dados já traduzidos via props.

## Checklist de PR

- Todos os botões, labels, placeholders e estados vazios foram traduzidos.
- Cards e dados mockados foram traduzidos.
- As sete mensagens contêm a mesma estrutura de chaves.
- O idioma não usa fallback em português fora de `pt-BR`.
