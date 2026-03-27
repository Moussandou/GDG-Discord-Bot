// ─── /categorie Command ──────────────────────────────────────────────────────
// Filtre les news par catégorie.
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import { getRecentArticles } from '../../database/articles.js';
import { buildCompactEmbed } from '../embeds.js';
import { categories } from '../../config/sources.js';

export const data = new SlashCommandBuilder()
  .setName('categorie')
  .setDescription('Affiche les dernières news par catégorie')
  .addStringOption((option) =>
    option
      .setName('nom')
      .setDescription('Catégorie à filtrer')
      .setRequired(true)
      .addChoices(
        { name: '🤖 Intelligence Artificielle', value: 'ai' },
        { name: '🌐 Web', value: 'web' },
        { name: '📱 Mobile', value: 'mobile' },
        { name: '☁️ Cloud', value: 'cloud' },
        { name: '⚙️ DevOps', value: 'devops' },
        { name: '💻 Général', value: 'general' }
      )
  );

export async function execute(interaction) {
  const category = interaction.options.getString('nom');
  const cat = categories[category];

  if (!cat) {
    await interaction.reply({
      content: '❌ Catégorie invalide.',
      ephemeral: true,
    });
    return;
  }

  const articles = getRecentArticles(5, category);

  if (articles.length === 0) {
    await interaction.reply({
      content: `📭 Aucune news dans la catégorie **${cat.emoji} ${cat.label}** pour le moment.`,
      ephemeral: true,
    });
    return;
  }

  const embeds = articles.map((article, i) => buildCompactEmbed(article, i));

  await interaction.reply({
    content: `${cat.emoji} **Dernières news — ${cat.label} :**`,
    embeds,
  });
}
