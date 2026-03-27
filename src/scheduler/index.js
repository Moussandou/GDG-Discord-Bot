// ─── Scheduler ───────────────────────────────────────────────────────────────
// Planification des tâches de scraping et publication via node-cron.
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import config from '../config/index.js';
import { scanAllSources } from '../scraper/index.js';
import { getUnpostedArticles, getTodayPostedCount } from '../database/articles.js';
import { publishArticle } from '../discord/client.js';
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
        if (scanResult.newArticles > 0) {
          await publishPendingArticles();
        }
      } catch (error) {
        logger.error(`❌ [CRON] Erreur scan automatique: ${error.message}`);
      }
    },
    { timezone, name: 'scrape-job' }
  );
  scheduledJobs.push(scrapeJob);
  logger.info(`⏰ Cron scraping configuré: toutes les ${scrapeIntervalHours}h (${scrapeExpression})`);

  // ─── Publication Jobs ────────────────────────────────────────────────
  // Un cron job par heure de publication configurée
  for (const hour of publishHours) {
    const publishExpression = `0 ${hour} * * *`;

    const publishJob = cron.schedule(
      publishExpression,
      async () => {
        logger.info(`⏰ [CRON] Publication automatique à ${hour}h...`);
        try {
          await publishPendingArticles(maxDailyNews);
        } catch (error) {
          logger.error(`❌ [CRON] Erreur publication: ${error.message}`);
        }
      },
      { timezone, name: `publish-${hour}h` }
    );
    scheduledJobs.push(publishJob);
    logger.info(`⏰ Cron publication configuré: ${hour}h (${publishExpression})`);
  }

  // ─── Initial scan on startup (delayed 10s to let Discord connect) ──
  setTimeout(async () => {
    logger.info('🚀 Scan initial au démarrage...');
    try {
      const scanResult = await scanAllSources();
      if (scanResult.newArticles > 0) {
        await publishPendingArticles(20);
      }
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
