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

// URL base pública do produto (usada nos links para o evento)
const BASE_URL = process.env.CLANFORGE_BASE_URL || 'https://clanforge.app';

const START_WINDOW_MINUTES = 5;
// Janela "iniciou": com o scheduler rodando a cada 1 minuto, um buffer de 3
// minutos cobre execuções perdidas sem notificar eventos que começaram há
// muito tempo.
const STARTED_WINDOW_MINUTES = 3;
const ENDED_WINDOW_MINUTES = 30;

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

function buildEventEmbed(
  event,
  guildId,
  eventId,
  guildName,
  color,
  title,
  extraFields = [],
  confirmLink = false,
) {
  const fields = [];
  if (event.start) fields.push({ name: '📅 Início', value: toDiscordTimestamp(event.start), inline: true });
  if (event.end) fields.push({ name: '🏁 Fim', value: toDiscordTimestamp(event.end), inline: true });
  if (event.location) fields.push({ name: '📍 Local', value: String(event.location).slice(0, 100), inline: true });
  if (event.type) fields.push({ name: '🎯 Tipo', value: String(event.type).slice(0, 60), inline: true });
  if (typeof event.maxParticipants === 'number' && event.maxParticipants > 0) {
    fields.push({ name: '👥 Vagas', value: String(event.maxParticipants), inline: true });
  }
  fields.push(...extraFields);
  const url = eventId ? `${BASE_URL}/guilds/${guildId}/events/${eventId}` : undefined;
  if (confirmLink && url) {
    fields.push({
      name: '✅ Confirme sua presença',
      value: `[Clique aqui para confirmar](<${url}>)`,
    });
  }
  return {
    color,
    title: String(title).slice(0, 256),
    url,
    description: event.description
      ? String(event.description).slice(0, 1000)
      : undefined,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: guildName ? `${guildName} · ClanForge` : 'ClanForge' },
  };
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
        guildId,
        event.params.eventId,
        guildName,
        COLOR_ACCENT,
        `📅 Novo evento: ${data.title ?? 'Evento'}`,
        [],
        true,
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
      buildEventEmbed(
        after,
        guildId,
        event.params.eventId,
        guildName,
        color,
        title,
      ),
    );
    if (after.status === 'completed') {
      await event.data.after.ref.update({
        endedNotified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (after.status === 'cancelled') {
      await event.data.after.ref.update({
        startNotified: false,
        startedNotified: false,
        endedNotified: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  },
);

// Jogador confirmou presença / saiu do evento: notificações removidas a
// pedido da equipe (poluíam o canal). A confirmação acontece na página
// pública do evento, linkada nas embeds.

// Lembrete de início (5 min antes), início do evento e término do evento.
// Roda a cada 1 minuto para minimizar o atraso (antes: 5 minutos, o que
// podia atrasar as notificações em até ~5 min); cada notificação dispara uma
// única vez por evento (flags startNotified / startedNotified / endedNotified
// no documento).
exports.discordEventsStartingSoon = onSchedule('every 1 minutes', async () => {
  const now = admin.firestore.Timestamp.now();
  const guildNameCache = new Map();

  async function queryEvents(startAfter, startBefore) {
    try {
      return await admin
        .firestore()
        .collection('guild_events')
        .where('start', '>=', startAfter)
        .where('start', '<=', startBefore)
        .get();
    } catch (err) {
      console.warn('discordEventsStartingSoon query error:', err.message);
      return null;
    }
  }

  async function queryEndedEvents(endAfter, endBefore) {
    try {
      return await admin
        .firestore()
        .collection('guild_events')
        .where('end', '>=', endAfter)
        .where('end', '<=', endBefore)
        .get();
    } catch (err) {
      console.warn('discordEventsEnded query error:', err.message);
      return null;
    }
  }

  async function markNotified(docRef, flag) {
    await docRef.update({
      [flag]: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 1) Lembrete: evento começa em 5 minutos
  const remindBefore = admin.firestore.Timestamp.fromMillis(
    now.toMillis() + START_WINDOW_MINUTES * 60 * 1000,
  );
  const upcoming = await queryEvents(now, remindBefore);
  if (upcoming) {
    for (const doc of upcoming.docs) {
      const event = doc.data();
      if (event.status !== 'active' || event.startNotified === true) continue;
      const guildId = event.guildId;
      if (!guildId) continue;
      const webhook = await getGuildDiscordWebhook(guildId);
      if (!webhook) continue;
      if (!guildNameCache.has(guildId)) guildNameCache.set(guildId, await getGuildName(guildId));
      await sendDiscordWebhook(
        webhook,
        buildEventEmbed(
          event,
          guildId,
          doc.id,
          guildNameCache.get(guildId),
          COLOR_ORANGE,
          `⏰ ${event.title ?? 'Evento'} começa em ${START_WINDOW_MINUTES} minutos!`,
          [],
          true,
        ),
      );
      await markNotified(doc.ref, 'startNotified');
    }
  }

  // 2) Evento iniciado (start nos últimos minutos; evita notificar eventos
  // antigos criados com data no passado)
  const startedAfter = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - STARTED_WINDOW_MINUTES * 60 * 1000,
  );
  const started = await queryEvents(startedAfter, now);
  if (started) {
    for (const doc of started.docs) {
      const event = doc.data();
      if (event.status !== 'active' || event.startedNotified === true) continue;
      const guildId = event.guildId;
      if (!guildId) continue;
      const webhook = await getGuildDiscordWebhook(guildId);
      if (!webhook) continue;
      if (!guildNameCache.has(guildId)) guildNameCache.set(guildId, await getGuildName(guildId));
      await sendDiscordWebhook(
        webhook,
        buildEventEmbed(
          event,
          guildId,
          doc.id,
          guildNameCache.get(guildId),
          COLOR_GREEN,
          `🚀 ${event.title ?? 'Evento'} iniciou!`,
        ),
      );
      await markNotified(doc.ref, 'startedNotified');
    }
  }

  // 3) Evento finalizado (fim do horário, ainda ativo no sistema)
  const endedAfter = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - ENDED_WINDOW_MINUTES * 60 * 1000,
  );
  const ended = await queryEndedEvents(endedAfter, now);
  if (ended) {
    for (const doc of ended.docs) {
      const event = doc.data();
      if (event.status !== 'active' || event.endedNotified === true) continue;
      const guildId = event.guildId;
      if (!guildId) continue;
      const webhook = await getGuildDiscordWebhook(guildId);
      if (!webhook) continue;
      if (!guildNameCache.has(guildId)) guildNameCache.set(guildId, await getGuildName(guildId));
      await sendDiscordWebhook(
        webhook,
        buildEventEmbed(
          event,
          guildId,
          doc.id,
          guildNameCache.get(guildId),
          COLOR_ACCENT,
          `🏁 ${event.title ?? 'Evento'} finalizou!`,
        ),
      );
      await markNotified(doc.ref, 'endedNotified');
    }
  }
});