// ─── /veille Command ─────────────────────────────────────────────────────────
// Affiche les dernières news postées.
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import { getRecentArticles } from '../../database/articles.js';
import { buildCompactEmbed } from '../embeds.js';
import { buildArticleActionRow } from '../components.js';

export const data = new SlashCommandBuilder()
  .setName('veille')
  .setDescription('Affiche les dernières news tech')
  .addIntegerOption((option) =>
    option
      .setName('nombre')
      .setDescription('Nombre de news à afficher (1-10)')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(false)
  );

export async function execute(interaction) {
  const count = interaction.options.getInteger('nombre') || 5;
  const articles = getRecentArticles(count);

  if (articles.length === 0) {
    await interaction.reply({
      content: '📭 Aucune news à afficher pour le moment. Le prochain scan arrive bientôt !',
      ephemeral: true,
    });
    return;
  }

  const response = [];
  
  // Limité à 5 pour pouvoir avoir les boutons (max 5 rows par message)
  const displayCount = Math.min(articles.length, 5);
  
  for (let i = 0; i < displayCount; i++) {
    const article = articles[i];
    const embed = buildCompactEmbed(article, i);
    const row = buildArticleActionRow(article);
    response.push({ embed, row });
  }

  await interaction.reply({
    content: `📰 **Les ${displayCount} dernières news tech :**`,
    embeds: response.map(r => r.embed),
    components: response.map(r => r.row)
  });
}
