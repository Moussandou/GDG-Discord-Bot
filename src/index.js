// ─── GDG Marseille — Bot de Veille Tech ──────────────────────────────────────
// Point d'entrée principal du bot.
// ─────────────────────────────────────────────────────────────────────────────

import { initDatabase } from './database/index.js';
import { startDiscordBot } from './discord/client.js';
import { startScheduler, stopScheduler } from './scheduler/index.js';
import logger from './logger.js';

async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   🚀 GDG Marseille — Bot de Veille Tech');
  logger.info('═══════════════════════════════════════════════════════════');

  try {
    // 1. Initialize database
    logger.info('📦 Initialisation de la base de données...');
    initDatabase();

    // 2. Start Discord bot
    logger.info('🤖 Connexion à Discord...');
    await startDiscordBot();

    // 3. Start scheduler
    logger.info('⏰ Démarrage du scheduler...');
    startScheduler();

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('   ✅ Bot opérationnel !');
    logger.info('═══════════════════════════════════════════════════════════');
  } catch (error) {
    logger.error(`❌ Erreur fatale au démarrage: ${error.message}`, error);
    process.exit(1);
  }
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`\n🛑 ${signal} reçu, arrêt du bot...`);
  stopScheduler();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

main();
