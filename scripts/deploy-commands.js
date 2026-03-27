// ─── Deploy Slash Commands ───────────────────────────────────────────────────
// Enregistre les commandes slash auprès de l'API Discord.
// À exécuter une fois ou après modification des commandes.
// Usage: npm run deploy-commands
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  console.error('❌ Variables manquantes: DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID');
  process.exit(1);
}

async function deployCommands() {
  const commands = [];
  const commandsPath = join(__dirname, '..', 'src', 'discord', 'commands');
  const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = await import(join(commandsPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`📦 Commande trouvée: /${command.data.name}`);
    }
  }

  const rest = new REST().setToken(DISCORD_TOKEN);

  try {
    console.log(`\n🔄 Enregistrement de ${commands.length} commande(s)...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
      { body: commands }
    );

    console.log(`✅ ${data.length} commande(s) enregistrée(s) avec succès !`);
    console.log('\nCommandes déployées:');
    data.forEach((cmd) => console.log(`  /${cmd.name} — ${cmd.description}`));
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

deployCommands();
