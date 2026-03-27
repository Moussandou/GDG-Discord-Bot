// ─── Discord Component Builder ──────────────────────────────────────────────────
// Création d'ActionRows et de Boutons interactifs pour les embeds.
// ─────────────────────────────────────────────────────────────────────────────

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Construit une rangée d'actions pour un article.
 * @param {Object} article - Article source
 * @returns {ActionRowBuilder}
 */
export function buildArticleActionRow(article) {
  const row = new ActionRowBuilder();

  // 1. Bouton Lu / Lire (Lien externe)
  const readButton = new ButtonBuilder()
    .setLabel("Lire l'article")
    .setURL(article.url)
    .setStyle(ButtonStyle.Link)
    .setEmoji('🔗');

  // 2. Bouton Discuter (ID personnalisé pour l'InteractionCreate)
  const discussButton = new ButtonBuilder()
    .setCustomId(`discuss_article:${article.id}`)
    .setLabel('Ouvrir une discussion')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('💬');

  row.addComponents(readButton, discussButton);
  return row;
}

/**
 * Construit un bouton de raccourci (Link) pour les listes.
 */
export function buildSimpleLinkButton(article) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Voir')
      .setURL(article.url)
      .setStyle(ButtonStyle.Link)
      .setEmoji('🔗')
  );
}
