// ─── Channel Mapper ──────────────────────────────────────────────────────────
// Mappe les catégories d'articles aux channels Discord.
// ─────────────────────────────────────────────────────────────────────────────

import { ChannelType } from 'discord.js';
import { categoryChannels, googleChannel } from '../config/sources.js';
import logger from '../logger.js';

/**
 * Résout le channel Discord cible pour un article.
 * Les articles Google vont dans #google-news en priorité.
 * @param {import('discord.js').Guild} guild
 * @param {Object} article
 * @returns {import('discord.js').TextChannel|null}
 */
export function resolveChannel(guild, article) {
  // Google sources → #google-news
  if (article.is_google) {
    const channel = findChannelByName(guild, googleChannel);
    if (channel) return channel;
  }

  // Category → specific channel
  const channelName = categoryChannels[article.category] || categoryChannels.general;
  const channel = findChannelByName(guild, channelName);

  if (!channel) {
    // Fallback to #general-tech
    const fallback = findChannelByName(guild, 'general-tech');
    if (fallback) return fallback;

    logger.warn(`⚠️ Aucun channel trouvé pour la catégorie: ${article.category}`);
    return null;
  }

  return channel;
}

/**
 * Trouve un channel textuel par nom dans un guild.
 */
function findChannelByName(guild, name) {
  return guild.channels.cache.find(
    (ch) => ch.name === name && (ch.type === 0 || ch.type === 5) // GUILD_TEXT or GUILD_ANNOUNCEMENT
  );
}

/**
 * Vérifie que tous les channels requis existent dans le guild.
 * @param {import('discord.js').Guild} guild
 * @returns {Object} Report des channels manquants
 */
export function checkRequiredChannels(guild) {
  const required = [...new Set([googleChannel, ...Object.values(categoryChannels), 'general-tech'])];
  const existing = [];
  const missing = [];

  for (const name of required) {
    if (findChannelByName(guild, name)) {
      existing.push(name);
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    logger.warn(`⚠️ Channels Discord manquants: ${missing.map((n) => `#${n}`).join(', ')}`);
    logger.warn('   Créez ces channels ou utilisez /admin setup-channels');
  }

  return { existing, missing };
}

/**
 * Crée la catégorie et les salons manquants pour le bot.
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<Object>} Rapport de création
 */
export async function setupGuildChannels(guild) {
  const categoryName = '🗞️ GDG TECH NEWS';
  const required = [...new Set([googleChannel, ...Object.values(categoryChannels), 'general-tech'])];
  
  let category = guild.channels.cache.find(
    (c) => c.name === categoryName && c.type === ChannelType.GuildCategory
  );

  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
    });
    logger.info(`📁 Catégorie créée: ${categoryName}`);
  }

  const created = [];
  const alreadyExists = [];

  for (const name of required) {
    const existing = findChannelByName(guild, name);
    if (!existing) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Veille technologique automatisée - ${name}`,
      });
      created.push(name);
      logger.info(`🆕 Salon créé: #${name}`);
    } else {
      alreadyExists.push(name);
    }
  }

  return { category: categoryName, created, alreadyExists };
}
