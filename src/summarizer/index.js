// ─── Summarizer Orchestrator ─────────────────────────────────────────────────
// Résume les articles non encore traités via Gemini AI.
// ─────────────────────────────────────────────────────────────────────────────

import { getUnsummarizedArticles, updateArticleSummary } from '../database/articles.js';
import { generateSummary } from './geminiClient.js';
import logger from '../logger.js';

// Rate limiting: max 10 requests per minute for Gemini free tier
const DELAY_BETWEEN_REQUESTS_MS = 6500;

/**
 * Traite tous les articles non résumés.
 * @param {number} limit - Nombre maximum d'articles à résumer
 * @returns {Promise<{processed: number, succeeded: number, failed: number}>}
 */
export async function summarizeNewArticles(limit = 10) {
  const articles = getUnsummarizedArticles(limit);

  if (articles.length === 0) {
    logger.debug('📝 Aucun article à résumer.');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  logger.info(`📝 Résumé de ${articles.length} articles en cours...`);

  let succeeded = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const summary = await generateSummary(article.title, article.raw_content || '', article.source_name);

      if (summary) {
        updateArticleSummary(article.id, {
          title_fr: summary.title_fr,
          summary: summary.summary,
          keyPoints: summary.key_points,
          techLevel: summary.tech_level,
          emoji: summary.emoji || '📰',
          category: summary.category || article.category,
        });
        succeeded++;
        logger.info(`✅ Résumé: ${article.title.slice(0, 60)}...`);
      } else {
        // Fallback: create a basic summary from the raw content
        const fallbackSummary = createFallbackSummary(article);
        updateArticleSummary(article.id, fallbackSummary);
        succeeded++;
        logger.warn(`⚠️ Résumé de secours utilisé pour: ${article.title.slice(0, 60)}...`);
      }
    } catch (error) {
      logger.error(`❌ Erreur résumé article #${article.id}: ${error.message}`);
      failed++;
    }

    // Rate limiting between Gemini API calls
    if (articles.indexOf(article) < articles.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    }
  }

  logger.info(`📝 Résumés terminés: ${succeeded} réussis, ${failed} échoués`);
  return { processed: articles.length, succeeded, failed };
}

/**
 * Crée un résumé basique quand Gemini échoue.
 */
function createFallbackSummary(article) {
  const content = article.raw_content || '';
  const truncated = content.slice(0, 300).trim();

  return {
    summary: truncated ? `${truncated}...` : article.title,
    keyPoints: [article.title],
    techLevel: 'Intermédiaire',
    emoji: '📰',
    category: article.category,
  };
}
