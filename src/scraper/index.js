// ─── Scraper Orchestrator ────────────────────────────────────────────────────
// Scanne toutes les sources RSS, déduplique, sauvegarde les nouveaux articles.
// ─────────────────────────────────────────────────────────────────────────────

import { defaultSources } from '../config/sources.js';
import { getCustomSources } from '../database/articles.js';
import { articleExists, saveArticle } from '../database/articles.js';
import { fetchRSSFeed } from './rssFetcher.js';
import logger from '../logger.js';

/**
 * Scanne toutes les sources (default + custom) et sauvegarde les nouveaux articles.
 * @returns {Promise<{scanned: number, newArticles: number, errors: number}>}
 */
export async function scanAllSources() {
  logger.info('🔍 ════════════════════════════════════════════════════════');
  logger.info('🔍 Début du scan de toutes les sources...');

  // Merge default sources + custom sources from DB
  const customSources = getCustomSources().map((s) => ({
    name: s.name,
    url: s.url,
    category: s.category,
    priority: s.priority,
    enabled: s.enabled === 1,
    isGoogle: s.is_google === 1,
  }));

  const allSources = [...defaultSources, ...customSources].filter((s) => s.enabled);

  let totalNew = 0;
  let totalErrors = 0;

  for (const source of allSources) {
    try {
      const items = await fetchRSSFeed(source);

      let newCount = 0;
      for (const item of items) {
        if (!item.url || articleExists(item.url)) continue;

        const id = saveArticle({
          url: item.url,
          title: item.title,
          sourceName: item.sourceName,
          category: source.category,
          priority: source.priority,
          isGoogle: source.isGoogle,
          rawContent: item.content,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
        });

        if (id) newCount++;
      }

      if (newCount > 0) {
        logger.info(`📥 ${source.name}: ${newCount} nouveaux articles sauvegardés`);
      }
      totalNew += newCount;
    } catch (error) {
      logger.error(`❌ Erreur scan source ${source.name}: ${error.message}`);
      totalErrors++;
    }

    // Small delay between sources to be polite
    await sleep(1000);
  }

  logger.info(`🔍 Scan terminé: ${totalNew} nouveaux articles, ${totalErrors} erreurs`);
  logger.info('🔍 ════════════════════════════════════════════════════════');

  return { scanned: allSources.length, newArticles: totalNew, errors: totalErrors };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
