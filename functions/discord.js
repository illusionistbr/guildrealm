// ============ NOTIFICAÇÕES NO DISCORD (webhooks) ============
// Envia notificações automáticas da guild para o canal do Discord
// configurado em guilds/{guildId}/settings/discord.
// As mensagens usam webhooks (sem processo rodando 24/7).
const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentDeleted,
} = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const COLOR_ACCENT = 0x6d28d9; // roxo padrão do ClanForge
const COLOR_GREEN = 0x22c55e;
const COLOR_RED = 0xef4444;
const COLOR_ORANGE = 0xf97316;

const START_WINDOW_MINUTES = 15;

function discordSettingsDoc(guildId) {
  return admin.firestore().doc(`guilds/${guildId}/settings/discord`);
}

async function getGuildDiscordWebhook(guildId) {
  try {
    const snap = await discordSettingsDoc(guildId).get();
    const url = snap.exists ? snap.data().webhookUrl : null;
    return typeof url === 'string' && url ? url : null;
  } catch {
    return null;
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

// Timestamp dinâmico do Discord: renderiza na hora local de quem vê a
// mensagem (evita problema de fuso, pois as functions rodam em UTC).
function toDiscordTimestamp(value) {
  if (!value) return '';
  let ms;
  try {
    ms =
      value instanceof admin.firestore.Timestamp
        ? value.toMillis()
        : new Date(value).getTime();
  } catch {
    return '';
  }
  if (!Number.isFinite(ms)) return '';
  return `<t:${Math.floor(ms / 1000)}:F>`;
}

async function sendDiscordWebhook(webhookUrl, embed) {
  if (!webhookUrl) return;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) {
      console.warn(`Discord webhook ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.warn('Discord webhook error:', err.message);
  }
}

function buildEventEmbed(event, guildName, color, title, extraFields = []) {
  const fields = [];
  if (event.start) fields.push({ name: '📅 Início', value: toDiscordTimestamp(event.start), inline: true });
  if (event.end) fields.push({ name: '🏁 Fim', value: toDiscordTimestamp(event.end), inline: true });
  if (event.location) fields.push({ name: '📍 Local', value: String(event.location).slice(0, 100), inline: true });
  if (event.type) fields.push({ name: '🎯 Tipo', value: String(event.type).slice(0, 60), inline: true });
  if (typeof event.maxParticipants === 'number' && event.maxParticipants > 0) {
    fields.push({ name: '👥 Vagas', value: String(event.maxParticipants), inline: true });
  }
  fields.push(...extraFields);
  return {
    color,
    title: String(title).slice(0, 256),
    description: event.description
      ? String(event.description).slice(0, 1000)
      : undefined,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: guildName ? `${guildName} · ClanForge` : 'ClanForge' },
  };
}

async function countParticipants(eventId) {
  try {
    const snap = await admin
      .firestore()
      .collection(`guild_events/${eventId}/participants`)
      .count()
      .get();
    return snap.data().count;
  } catch {
    return null;
  }
}

async function loadEvent(eventId) {
  const snap = await admin.firestore().doc(`guild_events/${eventId}`).get();
  return snap.exists ? snap.data() : null;
}

// Novo evento criado na guild
exports.discordEventCreated = onDocumentCreated(
  'guild_events/{eventId}',
  async (event) => {
    const data = event.data.data();
    const guildId = data.guildId;
    if (!guildId) return;
    const webhook = await getGuildDiscordWebhook(guildId);
    if (!webhook) return;
    const guildName = await getGuildName(guildId);
    await sendDiscordWebhook(
      webhook,
      buildEventEmbed(
        data,
        guildName,
        COLOR_ACCENT,
        `📅 Novo evento: ${data.title ?? 'Evento'}`,
      ),
    );
  },
);

// Evento cancelado ou concluído
exports.discordEventStatusChanged = onDocumentUpdated(
  'guild_events/{eventId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after || before.status === after.status) return;
    const guildId = after.guildId;
    if (!guildId) return;
    const webhook = await getGuildDiscordWebhook(guildId);
    if (!webhook) return;

    let title = null;
    let color = COLOR_ACCENT;
    if (after.status === 'cancelled') {
      title = `🚫 Evento cancelado: ${after.title ?? 'Evento'}`;
      color = COLOR_RED;
    } else if (after.status === 'completed') {
      title = `✅ Evento concluído: ${after.title ?? 'Evento'}`;
      color = COLOR_GREEN;
    }
    if (!title) return;

    const guildName = await getGuildName(guildId);
    await sendDiscordWebhook(
      webhook,
      buildEventEmbed(after, guildName, color, title),
    );
  },
);

// Jogador confirmou presença no evento
exports.discordParticipantJoined = onDocumentCreated(
  'guild_events/{eventId}/participants/{userId}',
  async (event) => {
    const { eventId, userId } = event.params;
    const participant = event.data.data();
    const guildEvent = await loadEvent(eventId);
    if (!guildEvent || !guildEvent.guildId) return;
    const webhook = await getGuildDiscordWebhook(guildEvent.guildId);
    if (!webhook) return;
    const guildName = await getGuildName(guildEvent.guildId);
    const displayName = participant.displayName || userId;
    const count = await countParticipants(eventId);
    const extra = [];
    if (count !== null) {
      extra.push({ name: '👥 Confirmados', value: String(count), inline: true });
    }
    await sendDiscordWebhook(
      webhook,
      buildEventEmbed(
        guildEvent,
        guildName,
        COLOR_GREEN,
        `✅ ${displayName} confirmou presença`,
        extra,
      ),
    );
  },
);

// Jogador saiu do evento
exports.discordParticipantLeft = onDocumentDeleted(
  'guild_events/{eventId}/participants/{userId}',
  async (event) => {
    const { eventId, userId } = event.params;
    const participant = event.data.data();
    const guildEvent = await loadEvent(eventId);
    if (!guildEvent || !guildEvent.guildId) return;
    const webhook = await getGuildDiscordWebhook(guildEvent.guildId);
    if (!webhook) return;
    const guildName = await getGuildName(guildEvent.guildId);
    const displayName = participant ? participant.displayName || userId : userId;
    const count = await countParticipants(eventId);
    const extra = [];
    if (count !== null) {
      extra.push({ name: '👥 Confirmados', value: String(count), inline: true });
    }
    await sendDiscordWebhook(
      webhook,
      buildEventEmbed(
        guildEvent,
        guildName,
        COLOR_ORANGE,
        `↩️ ${displayName} saiu do evento`,
        extra,
      ),
    );
  },
);

// Lembrete: evento começa em 15 minutos (roda a cada 5 minutos)
exports.discordEventsStartingSoon = onSchedule('every 5 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const windowEnd = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + START_WINDOW_MINUTES * 60 * 1000,
  );
  let snap;
  try {
    snap = await admin
      .firestore()
      .collection('guild_events')
      .where('start', '>=', now)
      .where('start', '<=', windowEnd)
      .get();
  } catch (err) {
    console.warn('discordEventsStartingSoon query error:', err.message);
    return;
  }

  for (const doc of snap.docs) {
    const event = doc.data();
    if (event.status !== 'active' || event.startNotified === true) continue;
    const guildId = event.guildId;
    if (!guildId) continue;
    const webhook = await getGuildDiscordWebhook(guildId);
    if (!webhook) continue;
    const guildName = await getGuildName(guildId);
    await sendDiscordWebhook(
      webhook,
      buildEventEmbed(
        event,
        guildName,
        COLOR_ORANGE,
        `⏰ ${event.title ?? 'Evento'} começa em ${START_WINDOW_MINUTES} minutos!`,
      ),
    );
    await doc.ref.update({
      startNotified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});