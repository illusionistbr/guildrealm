// Testa um webhook do Discord localmente (sem deploy).
// Uso: node discord-bot/test-webhook.js <url-do-webhook>
const url = process.argv[2];

if (!url || !url.startsWith('https://discord.com/api/webhooks/')) {
  console.error('Uso: node discord-bot/test-webhook.js <url-do-webhook>');
  console.error('Ex.: node discord-bot/test-webhook.js https://discord.com/api/webhooks/123/abc');
  process.exit(1);
}

const embed = {
  color: 0x6d28d9,
  title: '✅ Conexão com o Discord funcionando!',
  description: 'Mensagem de teste enviada pelo ClanForge (script local).',
  fields: [
    { name: '📅 Exemplo', value: 'Evento criado', inline: true },
    { name: '✅ Exemplo', value: 'Presença confirmada', inline: true },
  ],
  timestamp: new Date().toISOString(),
  footer: { text: 'ClanForge · teste local' },
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ embeds: [embed] }),
})
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Discord respondeu ${res.status}: ${res.statusText}`);
    }
    console.log('✅ Mensagem de teste enviada ao canal!');
  })
  .catch((err) => {
    console.error('❌ Falha ao enviar:', err.message);
    process.exit(1);
  });