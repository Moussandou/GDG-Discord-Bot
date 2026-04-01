// ─── /admin Command ──────────────────────────────────────────────────────────
// Commandes d'administration du bot (permission MANAGE_GUILD requise).
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getStats, addCustomSource, removeCustomSource, setSetting } from '../../database/articles.js';
import { buildStatusEmbed } from '../embeds.js';
import { scanAllSources } from '../../scraper/index.js';
import { summarizeNewArticles } from '../../summarizer/index.js';
import { setupGuildChannels } from '../channelMapper.js';
import { publishPendingArticles } from '../../scheduler/index.js';
import logger from '../../logger.js';

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Commandes d\'administration du bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub.setName('force-weekly-summary').setDescription('Déclenche manuellement le récapitulatif hebdomadaire')
  )
  .addSubcommand((sub) =>
    sub.setName('force-scan').setDescription('Force un scan immédiat de toutes les sources')
  )
  .addSubcommand((sub) =>
    sub
      .setName('add-source')
      .setDescription('Ajoute une source RSS personnalisée')
      .addStringOption((opt) => opt.setName('name').setDescription('Nom de la source').setRequired(true))
      .addStringOption((opt) => opt.setName('url').setDescription('URL du flux RSS').setRequired(true))
      .addStringOption((opt) =>
        opt
          .setName('category')
          .setDescription('Catégorie')
          .setRequired(true)
          .addChoices(
            { name: 'AI', value: 'ai' },
            { name: 'Web', value: 'web' },
            { name: 'Mobile', value: 'mobile' },
            { name: 'Cloud', value: 'cloud' },
            { name: 'DevOps', value: 'devops' },
            { name: 'Général', value: 'general' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove-source')
      .setDescription('Supprime une source RSS personnalisée')
      .addStringOption((opt) => opt.setName('name').setDescription('Nom de la source').setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName('set-schedule')
      .setDescription('Modifie les heures de publication')
      .addStringOption((opt) =>
        opt
          .setName('hours')
          .setDescription('Heures de publication (ex: 9,13,18)')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('set-weekly-channel')
      .setDescription('Définit le salon cible pour le récapitulatif hebdomadaire')
      .addChannelOption((opt) => 
        opt.setName('channel')
          .setDescription('Salon textuel')
          .setRequired(true)
          .addChannelTypes(0, 5) // GUILD_TEXT and GUILD_ANNOUNCEMENT
      )
  )
  .addSubcommand((sub) =>
    sub.setName('setup-channels').setDescription('Crée automatiquement les salons requis')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'status': {
      await interaction.deferReply({ ephemeral: true });
      try {
        const stats = getStats();
        const uptime = process.uptime() * 1000;
        const embed = buildStatusEmbed(stats, uptime);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        logger.error(`❌ Erreur status: ${error.message}`, error);
        await interaction.editReply("❌ Impossible de générer le statut pour le moment.");
      }
      break;
    }

    case 'force-scan': {
      await interaction.deferReply({ ephemeral: true });

      try {
        logger.info('🔄 Scan forcé initié par un admin');

        // Phase 1: Scraping
        const scanResult = await scanAllSources();

        let summarized = 0;
        let failedSummaries = 0;

        if (scanResult.newArticles > 0) {
          const res = await summarizeNewArticles(scanResult.newArticles);
          summarized = res.succeeded;
          failedSummaries = res.failed;
        }

        // Publication immédiate de TOUS les articles en attente (même anciens)
        await publishPendingArticles();

        await interaction.editReply(
          `✅ **Scan forcé et publication terminés !**\n` +
          `📡 Sources scannées : ${scanResult.scanned}\n` +
          `📥 Nouveaux articles : ${scanResult.newArticles}\n` +
          `📝 Résumés générés : ${summarized}\n` +
          `❌ Erreurs : ${scanResult.errors.length + failedSummaries}`
        );
      } catch (error) {
        logger.error(`❌ Erreur scan forcé: ${error.message}`);
        await interaction.editReply(`❌ Erreur durant le scan : ${error.message}`);
      }
      break;
    }

    case 'force-weekly-summary': {
      await interaction.deferReply({ ephemeral: true });
      try {
        const { publishWeeklySummary } = await import('../client.js');
        const success = await publishWeeklySummary();
        
        if (success) {
          await interaction.editReply("✅ Récapitulatif hebdomadaire envoyé avec succès !");
        } else {
          await interaction.editReply("⚠️ Le récapitulatif a été généré mais aucun article n'a été trouvé ou une erreur est survenue (consultez les logs).");
        }
      } catch (error) {
        logger.error(`❌ Erreur force-weekly-summary: ${error.message}`);
        await interaction.editReply(`❌ Erreur lors de l'envoi du récapitulatif : ${error.message}`);
      }
      break;
    }

    case 'add-source': {
      const name = interaction.options.getString('name');
      const url = interaction.options.getString('url');
      const category = interaction.options.getString('category');

      try {
        const result = addCustomSource({ name, url, category, priority: 'medium', isGoogle: false });
        if (result.changes > 0) {
          await interaction.reply({
            content: `✅ Source **${name}** ajoutée avec succès ! (${category})`,
            ephemeral: true,
          });
          logger.info(`➕ Source ajoutée: ${name} (${url})`);
        } else {
          await interaction.reply({
            content: `⚠️ La source **${name}** existe déjà.`,
            ephemeral: true,
          });
        }
      } catch (error) {
        await interaction.reply({
          content: `❌ Erreur : ${error.message}`,
          ephemeral: true,
        });
      }
      break;
    }

    case 'remove-source': {
      const name = interaction.options.getString('name');
      const result = removeCustomSource(name);

      if (result.changes > 0) {
        await interaction.reply({
          content: `🗑️ Source **${name}** supprimée.`,
          ephemeral: true,
        });
        logger.info(`➖ Source supprimée: ${name}`);
      } else {
        await interaction.reply({
          content: `⚠️ Source **${name}** non trouvée (seules les sources custom peuvent être supprimées).`,
          ephemeral: true,
        });
      }
      break;
    }

    case 'set-schedule': {
      const hours = interaction.options.getString('hours');
      // Validate format
      const parsed = hours
        .split(',')
        .map((h) => parseInt(h.trim(), 10))
        .filter((h) => !isNaN(h) && h >= 0 && h <= 23);

      if (parsed.length === 0) {
        await interaction.reply({
          content: '❌ Format invalide. Utilisez des heures séparées par des virgules (ex: `9,13,18`).',
          ephemeral: true,
        });
        return;
      }

      setSetting('publish_hours', parsed.join(','));
      await interaction.reply({
        content: `✅ Horaires de publication mis à jour : **${parsed.map((h) => `${h}h`).join(', ')}**\n⚠️ Redémarrez le bot pour appliquer les changements.`,
        ephemeral: true,
      });
      logger.info(`⏰ Horaires modifiés: ${parsed.join(',')}`);
      break;
    }

    case 'set-weekly-channel': {
      const channel = interaction.options.getChannel('channel');
      setSetting('weekly_report_channel', channel.id);
      
      await interaction.reply({
        content: `✅ Le récapitulatif hebdomadaire sera désormais posté dans <#${channel.id}>.`,
        ephemeral: true,
      });
      logger.info(`📍 Salon hebdomadaire défini: #${channel.name} (${channel.id})`);
      break;
    }

    case 'setup-channels': {
      await interaction.deferReply({ ephemeral: true });

      try {
        const result = await setupGuildChannels(interaction.guild);
        
        let message = `✅ **Configuration terminée !**\n📂 Catégorie : \`${result.category}\`\n`;
        
        if (result.created.length > 0) {
          message += `🆕 Salons créés : ${result.created.map(n => `#${n}`).join(', ')}\n`;
        }
        
        if (result.alreadyExists.length > 0) {
          message += `ℹ️ Salons déjà existants : ${result.alreadyExists.map(n => `#${n}`).join(', ')}\n`;
        }

        await interaction.editReply(message);
      } catch (error) {
        logger.error(`❌ Erreur setup-channels: ${error.message}`);
        await interaction.editReply(`❌ Erreur lors de la création des salons : ${error.message}`);
      }
      break;
    }
  }
}
