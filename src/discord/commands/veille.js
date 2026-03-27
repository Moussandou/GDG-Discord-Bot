// ─── /veille Command ─────────────────────────────────────────────────────────
// Affiche les dernières news postées.
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import { getRecentArticles } from '../../database/articles.js';
import { buildCompactEmbed } from '../embeds.js';

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

  const embeds = articles.map((article, i) => buildCompactEmbed(article, i));

  await interaction.reply({
    content: `📰 **Les ${articles.length} dernières news tech :**`,
    embeds: embeds.slice(0, 10), // Discord max 10 embeds
  });
}
