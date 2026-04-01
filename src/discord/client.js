// ─── Discord Client ──────────────────────────────────────────────────────────
// Initialisation du bot Discord, chargement des commandes, gestion d'events.
// ─────────────────────────────────────────────────────────────────────────────

import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import { buildArticleEmbed } from './embeds.js';
import { buildArticleActionRow } from './components.js';
import { resolveChannel, checkRequiredChannels } from './channelMapper.js';
import { markAsPosted } from '../database/articles.js';
import logger from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let client;

/**
 * Initialise et connecte le client Discord.
 */
export async function startDiscordBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // ─── Load Commands ─────────────────────────────────────────────────
  client.commands = new Collection();

  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = await import(join(commandsPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      logger.debug(`📦 Commande chargée: /${command.data.name}`);
    }
  }

  // ─── Event: Ready ──────────────────────────────────────────────────
  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`✅ Bot connecté en tant que ${readyClient.user.tag}`);
    logger.info(`📡 Serveurs connectés: ${readyClient.guilds.cache.size}`);

    // Check required channels for each guild
    readyClient.guilds.cache.forEach((guild) => {
      // If we limited guilds, only check those
      if (!config.discord.isAllGuilds && !config.discord.guildIds.includes(guild.id)) return;
      
      logger.info(`🔍 Vérification des salons sur : ${guild.name} (${guild.id})`);
      checkRequiredChannels(guild);
    });
  });

  // ─── Event: Interaction ────────────────────────────────────────────
  client.on(Events.InteractionCreate, async (interaction) => {
    // 1. Boutons
    if (interaction.isButton()) {
      return handleButtonInteraction(interaction);
    }

    // 2. Slash Commands
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`⚠️ Commande inconnue: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
      logger.info(`✅ Commande exécutée: /${interaction.commandName} par ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`❌ Erreur commande /${interaction.commandName}: ${error.message}`, error);
      
      const reply = {
        content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
        ephemeral: true,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch (replyError) {
        logger.error(`❌ Impossible d'envoyer le message d'erreur: ${replyError.message}`);
      }
    }
  });

  // ─── Login ─────────────────────────────────────────────────────────
  await client.login(config.discord.token);
  return client;
}

/**
 * Publie un article dans le channel Discord approprié.
 * @param {Object} article - Article avec résumé
 * @returns {Promise<boolean>} true si publié avec succès
 */
export async function publishArticle(article) {
  if (!client || !client.isReady()) {
    logger.error('❌ Client Discord non prêt');
    return false;
  }

  // Identify target guilds
  const targetGuilds = [];
  if (config.discord.isAllGuilds) {
    client.guilds.cache.forEach(g => targetGuilds.push(g));
  } else {
    for (const id of config.discord.guildIds) {
      const g = client.guilds.cache.get(id);
      if (g) targetGuilds.push(g);
      else logger.error(`❌ Guild non trouvé : ${id}`);
    }
  }

  if (targetGuilds.length === 0) {
    logger.error('❌ Aucun serveur cible trouvé pour la publication.');
    return false;
  }

  let successCount = 0;

  for (const guild of targetGuilds) {
    const channel = resolveChannel(guild, article);
    if (!channel) {
      logger.error(`❌ Aucun salon trouvé sur ${guild.name} pour : ${article.title}`);
      continue;
    }

    try {
      const embed = buildArticleEmbed(article);
      const row = buildArticleActionRow(article);
      
      const message = await channel.send({ 
        embeds: [embed],
        components: [row]
      });

      // Mark article as posted in DB (only once, we can store the first success's info or just mark as true)
      // Note: markAsPosted currently takes (id, messageId, channelId). 
      // If we post to multiple guilds, which one to store?
      // For now let's just mark it as posted using the first successful one.
      if (successCount === 0) {
        markAsPosted(article.id, message.id, channel.id);
      }

      logger.info(`📤 Publié dans #${channel.name} (${guild.name}): ${article.title.slice(0, 50)}...`);
      successCount++;
    } catch (error) {
      logger.error(`❌ Erreur sur ${guild.name} (#${channel.name}): ${error.message}`);
    }
  }

  return successCount > 0;
}

/**
 * Publie le récapitulatif hebdomadaire.
 */
export async function publishWeeklySummary() {
  if (!client || !client.isReady()) {
    logger.error('❌ Client Discord non prêt');
    return false;
  }

  const { getWeeklyArticles, getSetting } = await import('../database/articles.js');
  const articles = getWeeklyArticles(10);

  if (articles.length === 0) {
    logger.info('📊 Aucun article trouvé pour le récapitulatif hebdomadaire.');
    return false;
  }

  const channelId = getSetting('weekly_report_channel');
  
  // Target guilds
  const targetGuilds = [];
  if (config.discord.isAllGuilds) {
    client.guilds.cache.forEach(g => targetGuilds.push(g));
  } else {
    for (const id of config.discord.guildIds) {
      const g = client.guilds.cache.get(id);
      if (g) targetGuilds.push(g);
    }
  }

  let fullSuccess = true;

  for (const guild of targetGuilds) {
    let targetChannel;

    if (channelId) {
      targetChannel = guild.channels.cache.get(channelId);
    }

    // Fallback if channel not found or not set
    if (!targetChannel) {
      targetChannel = resolveChannel(guild, { category: 'general' });
    }

    if (!targetChannel) {
      logger.error(`❌ Aucun salon trouvé sur ${guild.name} pour le récapitulatif hebdomadaire.`);
      fullSuccess = false;
      continue;
    }

    try {
      let messageContent = `📅 **Voici les news de la semaine :**\n\n`;

      for (const article of articles) {
        const title = article.title_fr || article.title;
        // Use summary if available, else short version of title
        const brief = article.summary ? (article.summary.length > 150 ? article.summary.slice(0, 150) + '...' : article.summary) : title;
        
        messageContent += `🔹 **${title}** : ${brief} [En savoir plus](${article.url})\n`;
      }

      messageContent += `\n📢 *Rejoins notre salon #google-news pour en savoir plus*`;

      await targetChannel.send({ content: messageContent });
      logger.info(`📤 Récapitulatif hebdomadaire envoyé dans #${targetChannel.name} (${guild.name})`);
    } catch (error) {
      logger.error(`❌ Erreur envoi récapitulatif sur ${guild.name}: ${error.message}`);
      fullSuccess = false;
    }
  }

  return fullSuccess;
}

/**
 * Retourne le client Discord (pour le scheduler).
 */
export function getClient() {
  return client;
}

/**
 * Gère les interactions avec les boutons des articles.
 */
async function handleButtonInteraction(interaction) {
  const { customId, message } = interaction;

  // Format: discuss_article:ARTICLE_ID
  if (customId.startsWith('discuss_article:')) {
    try {
      // 1. Check if thread already exists
      if (message.thread) {
        return interaction.reply({
          content: `💬 Une discussion est déjà en cours ici : <#${message.thread.id}>`,
          ephemeral: true,
        });
      }

      // 2. Create the thread
      const threadName = message.embeds[0]?.title?.slice(0, 100) || 'Discussion Article';
      const thread = await message.startThread({
        name: `💬 ${threadName}`,
        autoArchiveDuration: 1440, // 24h
        reason: `Discussion lancée par ${interaction.user.tag}`,
      });

      // 3. Welcome message
      await thread.send({
        content: `👋 Bienvenue dans l'espace de discussion sur cet article !\n\nPartagée par <@${interaction.user.id}>. Qu'en pensez-vous ?`,
      });

      return interaction.reply({
        content: `✅ fil de discussion créé : <#${thread.id}>`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`❌ Erreur création thread: ${error.message}`);
      return interaction.reply({
        content: "❌ Impossible d'ouvrir la discussion pour le moment.",
        ephemeral: true,
      });
    }
  }
}
