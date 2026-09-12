// ============ DISCORD: roteamento de canais + envio (helper compartilhado) ============
// Config em guilds/{guildId}/settings/discord:
//   { mode: 'single' | 'separate', webhookUrl, eventsUrl, lootUrl, noticesUrl }
// - single (padrão): tudo vai para webhookUrl (comportamento atual).
// - separate: Eventos -> eventsUrl, Loot -> lootUrl, Avisos -> noticesUrl.
// Este módulo não exporta Cloud Functions, apenas helpers usados por
// discord.js, loot.js e analyses.js.
const admin = require('firebase-admin');

const BASE_URL = process.env.CLANFORGE_BASE_URL || 'https://clanforge.app';
const WEBHOOK_PREFIX = 'https://discord.com/api/webhooks/';

function discordSettingsDoc(guildId) {
  return admin.firestore().doc(`guilds/${guildId}/settings/discord`);
}

function cleanWebhookUrl(url) {
  if (typeof url !== 'string') return '';
  const clean = url.trim().slice(0, 500);
  return clean.startsWith(WEBHOOK_PREFIX) ? clean : '';
}

// Resolve a URL de cada canal conforme o modo configurado.
// Retorna { events, loot, notices } (string ou null).
async function getChannelWebhooks(guildId) {
  const empty = { events: null, loot: null, notices: null };
  try {
    const snap = await discordSettingsDoc(guildId).get();
    if (!snap.exists) return empty;
    const data = snap.data() || {};
    if (data.mode === 'separate') {
      return {
        events: cleanWebhookUrl(data.eventsUrl) || null,
        loot: cleanWebhookUrl(data.lootUrl) || null,
        notices: cleanWebhookUrl(data.noticesUrl) || null,
      };
    }
    const single = cleanWebhookUrl(data.webhookUrl) || null;
    return { events: single, loot: single, notices: single };
  } catch {
    return empty;
  }
}

async function getGuildName(guildId) {
  try {
    const snap = await admin.firestore().doc(`guilds/${guildId}`).get();
    return snap.exists && snap.data().name ? String(snap.data().name) : null;
  } catch {
    return null;
  }
}

// Posta no canal resolvido. body: { content?, embeds? }. Nunca lança erro.
async function postToChannel(guildId, channel, body) {
  try {
    const webhooks = await getChannelWebhooks(guildId);
    const url = webhooks[channel];
    if (!url) return false;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Args via placeholders: o 1º argumento nunca contém dados
      // interpolados (evita format-string injection no util.format).
      console.warn('Discord [%s] webhook %s: %s', channel, res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Discord [%s] webhook error: %s', channel, err?.message);
    return false;
  }
}

function guildFooter(guildName) {
  return { text: guildName ? `${guildName} · ClanForge` : 'ClanForge' };
}

// "3h 20min" | "45min" | "2 dias" — para o "termina em X" do loot.
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'a qualquer momento';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'menos de 1 min';
  if (mins < 60) return mins === 1 ? '1 min' : `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    const rest = mins % 60;
    return rest ? `${hours}h ${rest}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 dia' : `${days} dias`;
}

module.exports = {
  BASE_URL,
  WEBHOOK_PREFIX,
  cleanWebhookUrl,
  getChannelWebhooks,
  getGuildName,
  postToChannel,
  guildFooter,
  formatDuration,
};
