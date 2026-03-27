// ─── Discord Embed Builder ───────────────────────────────────────────────────
// Construction d'embeds Discord riches pour les articles tech.
// ─────────────────────────────────────────────────────────────────────────────

import { EmbedBuilder } from 'discord.js';
import { categories } from '../config/sources.js';

/**
 * Construit un embed Discord riche pour un article.
 * @param {Object} article - Article avec résumé
 * @returns {EmbedBuilder}
 */
export function buildArticleEmbed(article) {
  const cat = categories[article.category] || categories.general;
  const keyPoints = parseKeyPoints(article.key_points);
  const emoji = article.emoji || cat.emoji;

  const embed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(`${emoji} ${article.summary ? getTitleFromArticle(article) : article.title}`)
    .setURL(article.url)
    .setTimestamp(new Date())
    .setFooter({
      text: `${article.is_google ? '💙 Google • ' : ''}GDG Marseille • ${article.source_name} • ${cat.label}`,
    });

  // Summary
  if (article.summary) {
    embed.setDescription(article.summary);
  } else if (article.raw_content) {
    // Basic snippet for direct RSS mode
    const snippet = article.raw_content
      .replace(/<[^>]*>/g, '') // Remove HTML
      .slice(0, 300)
      .trim();
    embed.setDescription(snippet ? `${snippet}...` : 'Cliquez sur le lien pour lire l\'article complet.');
  }

  // Large illustrative image
  if (article.image_url) {
    embed.setImage(article.image_url);
  }

  // Key Points
  if (keyPoints.length > 0) {
    const pointsText = keyPoints.map((p) => `• ${p}`).join('\n');
    embed.addFields({
      name: '📌 Points clés',
      value: pointsText,
      inline: false,
    });
  }

  // Metadata row
  const metaFields = [];

  if (article.tech_level) {
    const levelEmoji = {
      Débutant: '🟢',
      Intermédiaire: '🟡',
      Avancé: '🔴',
    };
    metaFields.push({
      name: '📊 Niveau',
      value: `${levelEmoji[article.tech_level] || '⚪'} ${article.tech_level}`,
      inline: true,
    });
  }

  metaFields.push({
    name: '🏷️ Catégorie',
    value: `${cat.emoji} ${cat.label}`,
    inline: true,
  });

  metaFields.push({
    name: '🔗 Source',
    value: `[Lire l'article](${article.url})`,
    inline: true,
  });

  embed.addFields(metaFields);

  return embed;
}

/**
 * Construit un embed compact pour les listes (/veille).
 */
export function buildCompactEmbed(article, index) {
  const cat = categories[article.category] || categories.general;
  const emoji = article.emoji || cat.emoji;

  return new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(`${emoji} ${getTitleFromArticle(article)}`)
    .setURL(article.url)
    .setDescription(article.summary ? article.summary.slice(0, 200) : article.title)
    .setFooter({
      text: `${article.source_name} • ${cat.label} • ${formatDate(article.posted_at)}`,
    });
}

/**
 * Construit un embed pour la liste des sources.
 */
export function buildSourcesEmbed(sources) {
  const embed = new EmbedBuilder()
    .setColor(0x4285F4) // Google Blue
    .setTitle('📡 Sources de veille active')
    .setDescription('Voici toutes les sources surveillées par le bot.')
    .setTimestamp()
    .setFooter({ text: 'GDG Marseille — Veille Tech' });

  // Group by priority
  const highPriority = sources.filter((s) => s.priority === 'high');
  const mediumPriority = sources.filter((s) => s.priority === 'medium');

  if (highPriority.length > 0) {
    embed.addFields({
      name: '🔥 Priorité haute (Google)',
      value: highPriority.map((s) => `• **${s.name}** — ${getCategoryEmoji(s.category)} ${s.category}`).join('\n'),
      inline: false,
    });
  }

  if (mediumPriority.length > 0) {
    embed.addFields({
      name: '📰 Priorité moyenne',
      value: mediumPriority.map((s) => `• **${s.name}** — ${getCategoryEmoji(s.category)} ${s.category}`).join('\n'),
      inline: false,
    });
  }

  return embed;
}

/**
 * Construit un embed de statut pour /admin status.
 */
export function buildStatusEmbed(stats, uptime) {
  return new EmbedBuilder()
    .setColor(0x34A853) // Google Green
    .setTitle('📊 Statut du bot')
    .addFields(
      { name: '📰 Articles totaux', value: String(stats.totalArticles), inline: true },
      { name: '✅ Publiés', value: String(stats.totalPosted), inline: true },
      { name: '📅 Publiés aujourd\'hui', value: `${stats.todayPosted}`, inline: true },
      { name: '⏳ En attente', value: String(stats.pendingArticles), inline: true },
      { name: '🕐 Dernier post', value: stats.lastPostedAt, inline: true },
      { name: '⏱️ Uptime', value: formatUptime(uptime), inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'GDG Marseille — Veille Tech' });
}

/**
 * Embed d'aide pour /help.
 */
export function buildHelpEmbed() {
  return new EmbedBuilder()
    .setColor(0x4285F4)
    .setTitle('🤖 Bot de Veille Tech — GDG Marseille')
    .setDescription(
      'Je suis le bot de veille technologique du **GDG Marseille**.\n' +
      "Je scanne automatiquement les blogs tech, génère des résumés en français, et les poste dans les channels dédiés."
    )
    .addFields(
      {
        name: '🤖 Intelligence Artificielle (Optionnel)',
        value: 
          "Le bot peut fonctionner en mode direct ou avec assistance IA.\n" +
          "• Traduction automatique (si activée).\n" +
          "• Synthèse des points clés techniques.\n" +
          "• Classification par thématique tech.",
        inline: false,
      },
      {
        name: '📋 Commandes Publiques',
        value: [
          '`/veille [nombre]` — Voir les dernières news',
          '`/sources` — Liste des blogs surveillés',
          '`/categorie` — Filtrer par sujet',
          '`/help` — Afficher ce message',
        ].join('\n'),
        inline: true,
      },
      {
        name: '🛡️ Commandes Admin',
        value: [
          '`/admin status` — État du bot',
          '`/admin force-scan` — Lancer un scan',
          '`/admin setup-channels` — Créer les salons',
          '`/admin add-source` — Nouveau flux RSS',
        ].join('\n'),
        inline: true,
      },
      {
        name: '❓ Permissions',
        value: "Les commandes `/admin` sont visibles uniquement par les membres ayant la permission **Gérer le serveur**.",
        inline: false,
      }
    )
    .setTimestamp()
    .setFooter({ text: 'GDG Marseille — Veille Tech' });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTitleFromArticle(article) {
  // Use the Gemini-generated French title if we stored it, else original
  return article.title_fr || article.title;
}

function parseKeyPoints(keyPointsRaw) {
  if (!keyPointsRaw) return [];
  if (Array.isArray(keyPointsRaw)) return keyPointsRaw;
  try {
    const parsed = JSON.parse(keyPointsRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCategoryEmoji(category) {
  return (categories[category] || categories.general).emoji;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}
