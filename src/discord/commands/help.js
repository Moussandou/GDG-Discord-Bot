// ─── /help Command ───────────────────────────────────────────────────────────
// Affiche l'aide du bot.
// ─────────────────────────────────────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import { buildHelpEmbed } from '../embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Affiche l'aide et les commandes disponibles");

export async function execute(interaction) {
  const embed = buildHelpEmbed();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
