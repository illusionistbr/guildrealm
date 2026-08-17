# ClanForge → Discord (notificações via webhook)

Pasta dedicada ao **notificador do Discord**. Como o projeto usa Cloud Functions (Firebase), o
código de produção que envia as notificações vive em `functions/discord.js` (triggers do
Firestore) — esta pasta contém o guia de configuração e ferramentas locais.

## Como funciona

1. O dono da guild cria um **webhook** no canal desejado do Discord.
2. No painel da guild → aba **Discord**, ele cola a URL do webhook (e pode testar a conexão).
3. Toda vez que uma atividade acontece no sistema, uma Cloud Function envia uma mensagem
   (embed) para o canal via webhook.

Não há processo rodando 24/7, nem token de bot, nem custo extra.

## Notificações enviadas

| Evento no sistema                    | Mensagem no Discord                     |
| ------------------------------------ | --------------------------------------- |
| Evento criado                        | 📅 Novo evento: {título}                |
| Evento cancelado                     | 🚫 Evento cancelado: {título}           |
| Evento concluído                     | ✅ Evento concluído: {título}           |
| Jogador confirmou presença           | ✅ {jogador} confirmou presença         |
| Jogador saiu do evento               | ↩️ {jogador} saiu do evento             |
| Evento começa em 15 minutos (scheduler a cada 5 min) | ⏰ {título} começa em 15 minutos! |

## Configurar o webhook no Discord

1. Abra seu servidor → **Configurações do servidor** (ou clique com o botão direito no nome).
2. Vá em **Integrações** → **Webhooks** → **Novo webhook**.
3. Dê um nome (ex.: `ClanForge`) e escolha o **canal** que receberá as notificações.
4. **Copie a URL do webhook** (formato `https://discord.com/api/webhooks/...`).
5. No ClanForge: painel da guild → **Configurações** → aba **Discord** → cole a URL → **Salvar** → **Testar conexão**.

> ⚠️ A URL do webhook dá permissão de postar no canal. Não a compartilhe publicamente —
> no ClanForge ela fica guardada num documento restrito ao dono da guild.

## Testar localmente

Envie uma mensagem de exemplo para qualquer webhook sem precisar do sistema:

```bash
node discord-bot/test-webhook.js https://discord.com/api/webhooks/SEU/WEBHOOK
```

## Como adicionar um novo tipo de notificação

1. Em `functions/discord.js`, adicione um trigger (ex.: `onDocumentCreated`) ou reutilize um
   existente.
2. Monte o embed com `buildEventEmbed(...)` e chame `sendDiscordWebhook(webhook, embed)`.
3. Deploy: `firebase deploy --only functions` (na raiz do projeto).