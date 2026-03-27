// ─── /sources Command ────────────────────────────────────────────────────────
// Liste toutes les sources surveillées.
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import { defaultSources } from '../../config/sources.js';
import { getCustomSources } from '../../database/articles.js';
import { buildSourcesEmbed } from '../embeds.js';

export const data = new SlashCommandBuilder()
  .setName('sources')
  .setDescription('Liste les sources de veille surveillées');

export async function execute(interaction) {
  const customSources = getCustomSources().map((s) => ({
    name: s.name,
    category: s.category,
    priority: s.priority,
    enabled: true,
  }));

  const allSources = [
    ...defaultSources.filter((s) => s.enabled),
    ...customSources,
  ];

  const embed = buildSourcesEmbed(allSources);
  await interaction.reply({ embeds: [embed] });
}
