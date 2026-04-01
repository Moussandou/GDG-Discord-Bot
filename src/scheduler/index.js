// ─── Scheduler ───────────────────────────────────────────────────────────────
// Planification des tâches de scraping et publication via node-cron.
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import config from '../config/index.js';
import { scanAllSources } from '../scraper/index.js';
import { getUnpostedArticles, getTodayPostedCount } from '../database/articles.js';
import { publishArticle, publishWeeklySummary } from '../discord/client.js';
import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import logger from '../logger.js';

const scheduledJobs = [];

/**
 * Démarre tous les cron jobs.
 */
export function startScheduler() {
  const { publishHours, scrapeIntervalHours, timezone, maxDailyNews } = config.schedule;

  // ─── Scraping Job ────────────────────────────────────────────────────
  // Toutes les N heures: scan + résumé
  const scrapeExpression = `0 */${scrapeIntervalHours} * * *`;

  const scrapeJob = cron.schedule(
    scrapeExpression,
    async () => {
      logger.info('⏰ [CRON] Démarrage du scan automatique...');
      try {
        const scanResult = await scanAllSources();
        // Individual automatic publishing is disabled as per new requirements
        /* 
        if (scanResult.newArticles > 0) {
          await publishPendingArticles();
        }
        */
      } catch (error) {
        logger.error(`❌ [CRON] Erreur scan automatique: ${error.message}`);
      }
    },
    { timezone, name: 'scrape-job' }
  );
  scheduledJobs.push(scrapeJob);
  logger.info(`⏰ Cron scraping configuré: toutes les ${scrapeIntervalHours}h (${scrapeExpression})`);

  // ─── Weekly Summary Job ──────────────────────────────────────────────
  // Chaque mercredi à 9h00 (0 9 * * 3)
  const weeklyExpression = '0 9 * * 3';
  const weeklyJob = cron.schedule(
    weeklyExpression,
    async () => {
      logger.info('⏰ [CRON] Génération du récapitulatif hebdomadaire...');
      try {
        await publishWeeklySummary();
      } catch (error) {
        logger.error(`❌ [CRON] Erreur récapitulatif hebdomadaire: ${error.message}`);
      }
    },
    { timezone, name: 'weekly-summary' }
  );
  scheduledJobs.push(weeklyJob);
  logger.info(`⏰ Cron récapitutalif hebdomadaire configuré: mercredi 09:00 (${weeklyExpression})`);
  
  // ─── Daily Backup Job ──────────────────────────────────────────────
  // Chaque jour à 04:00 (0 4 * * *)
  const backupExpression = '0 4 * * *';
  const backupJob = cron.schedule(
    backupExpression,
    async () => {
      logger.info('⏰ [CRON] Création de la sauvegarde quotidienne...');
      try {
        const backupDir = join(dirname(config.dbPath), 'backups');
        mkdirSync(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = join(backupDir, `veille-${timestamp}.db.bak`);
        
        copyFileSync(config.dbPath, backupPath);
        logger.info(`✅ Sauvegarde créée: ${backupPath}`);
        
        // Nettoyage des anciennes sauvegardes (garder les 7 dernières)
        const files = readdirSync(backupDir)
          .filter(f => f.endsWith('.db.bak'))
          .map(f => join(backupDir, f));
        
        if (files.length > 7) {
          // Sort by creation time (implicitly by name if timestamp format is YYYY-MM-DD...)
          files.sort();
          const toDelete = files.slice(0, files.length - 7);
          
          for (const file of toDelete) {
            unlinkSync(file);
            logger.info(`🗑️ Ancienne sauvegarde supprimée: ${file}`);
          }
        }
      } catch (error) {
        logger.error(`❌ [CRON] Erreur sauvegarde: ${error.message}`);
      }
    },
    { timezone, name: 'daily-backup' }
  );
  scheduledJobs.push(backupJob);
  logger.info(`⏰ Cron sauvegarde configuré: tous les jours à 04:00 (${backupExpression})`);

  // (L'ancien système de publication horaire individuelle est désactivé)

  // ─── Initial scan on startup (delayed 10s to let Discord connect) ──
  setTimeout(async () => {
    logger.info('🚀 Scan initial au démarrage...');
    try {
      const scanResult = await scanAllSources();
      // Individual automatic publishing is disabled as per new requirements
      /*
      if (scanResult.newArticles > 0) {
        await publishPendingArticles(20);
      }
      */
    } catch (error) {
      logger.error(`❌ Erreur scan initial: ${error.message}`);
    }
  }, 10000);
}

/**
 * Publie les articles en attente dans Discord.
 * Respecte le max quotidien.
 */
export async function publishPendingArticles(maxDaily = config.schedule.maxDailyNews) {
  const todayCount = getTodayPostedCount();
  const remaining = maxDaily - todayCount;

  if (remaining <= 0) {
    logger.info('📊 Limite quotidienne atteinte, publication reportée à demain.');
    return;
  }

  // Calculate how many to post per session
  // Distribute evenly across publication hours
  const publishHours = config.schedule.publishHours;
  const currentHour = new Date().getHours();
  const remainingSlots = publishHours.filter((h) => h >= currentHour).length || 1;
  const perSession = Math.max(1, Math.ceil(remaining / remainingSlots));

  const articles = getUnpostedArticles(perSession);

  if (articles.length === 0) {
    logger.debug('📭 Aucun article en attente de publication.');
    return;
  }

  logger.info(`📤 Publication de ${articles.length} article(s)...`);

  let published = 0;
  for (const article of articles) {
    const success = await publishArticle(article);
    if (success) published++;

    // Small delay between posts to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }

  logger.info(`📤 ${published}/${articles.length} article(s) publiés.`);
}

/**
 * Arrête tous les cron jobs.
 */
export function stopScheduler() {
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs.length = 0;
  logger.info('⏰ Scheduler arrêté.');
}
