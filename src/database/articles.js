// ─── Articles CRUD ───────────────────────────────────────────────────────────
// Opérations sur la table articles pour la déduplication et le suivi.
// ─────────────────────────────────────────────────────────────────────────────

import { getDb } from './index.js';

/**
 * Vérifie si un article existe déjà en base (par URL).
 */
export function articleExists(url) {
  const row = getDb().prepare('SELECT id FROM articles WHERE url = ?').get(url);
  return !!row;
}

/**
 * Sauvegarde un nouvel article (phase scraping).
 */
export function saveArticle({ url, title, sourceName, category, priority, isGoogle, rawContent, publishedAt, imageUrl }) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO articles (url, title, source_name, category, priority, is_google, raw_content, published_at, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(url, title, sourceName, category, priority, isGoogle ? 1 : 0, rawContent, publishedAt, imageUrl);
  return result.changes > 0 ? result.lastInsertRowid : null;
}

/**
 * Met à jour le résumé d'un article (phase summarization).
 */
export function updateArticleSummary(id, { title_fr, summary, keyPoints, techLevel, emoji, category }) {
  getDb()
    .prepare(
      `UPDATE articles
       SET title_fr = ?, summary = ?, key_points = ?, tech_level = ?, emoji = ?, category = ?, summarized_at = datetime('now')
       WHERE id = ?`
    )
    .run(title_fr, summary, JSON.stringify(keyPoints), techLevel, emoji, category, id);
}

/**
 * Marque un article comme publié sur Discord.
 */
export function markAsPosted(id, discordMessageId, channelId) {
  getDb()
    .prepare(
      `UPDATE articles SET posted_at = datetime('now'), discord_message_id = ?, channel_id = ? WHERE id = ?`
    )
    .run(discordMessageId, channelId, id);
}

/**
 * Récupère les articles non encore résumés.
 */
export function getUnsummarizedArticles(limit = 10) {
  return getDb()
    .prepare(
      `SELECT * FROM articles
       WHERE summarized_at IS NULL AND raw_content IS NOT NULL
       ORDER BY
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         ABS(RANDOM()) % 100,
         scraped_at DESC
       LIMIT ?`
    )
    .all(limit);
}

/**
 * Récupère les articles résumés mais non publiés, triés par priorité Google.
 */
export function getUnpostedArticles(limit = 5) {
  return getDb()
    .prepare(
      `SELECT * FROM articles
       WHERE posted_at IS NULL
       ORDER BY
         CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
         ABS(RANDOM()) % 100,
         published_at DESC
       LIMIT ?`
    )
    .all(limit);
}

/**
 * Compte les articles postés aujourd'hui (timezone-aware via JS).
 */
export function getTodayPostedCount() {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const row = getDb()
    .prepare('SELECT COUNT(*) as count FROM articles WHERE posted_at >= ?')
    .get(startOfDay);
  return row.count;
}

/**
 * Récupère les articles récents (pour /veille).
 */
export function getRecentArticles(limit = 5, category = null) {
  if (category) {
    return getDb()
      .prepare(
        `SELECT * FROM articles
         WHERE posted_at IS NOT NULL AND category = ?
         ORDER BY posted_at DESC
         LIMIT ?`
      )
      .all(category, limit);
  }
  return getDb()
    .prepare(
      `SELECT * FROM articles
       WHERE posted_at IS NOT NULL
       ORDER BY posted_at DESC
       LIMIT ?`
    )
    .all(limit);
}

/**
 * Récupère toutes les sources custom ajoutées par les admins.
 */
export function getCustomSources() {
  return getDb().prepare('SELECT * FROM custom_sources WHERE enabled = 1').all();
}

/**
 * Ajoute une source custom.
 */
export function addCustomSource({ name, url, category, priority, isGoogle }) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO custom_sources (name, url, category, priority, is_google)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(name, url, category, priority || 'medium', isGoogle ? 1 : 0);
}

/**
 * Supprime une source custom par nom.
 */
export function removeCustomSource(name) {
  return getDb().prepare('DELETE FROM custom_sources WHERE name = ?').run(name);
}

/**
 * Récupère/définit un paramètre du bot.
 */
export function getSetting(key, defaultValue = null) {
  const row = getDb().prepare('SELECT value FROM bot_settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  getDb()
    .prepare('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)')
    .run(key, String(value));
}

/**
 * Stats globales pour /admin status.
 */
export function getStats() {
  const db = getDb();
  const totalArticles = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
  const totalPosted = db.prepare('SELECT COUNT(*) as c FROM articles WHERE posted_at IS NOT NULL').get().c;
  const todayPosted = getTodayPostedCount();
  const pendingArticles = db
    .prepare('SELECT COUNT(*) as c FROM articles WHERE summary IS NOT NULL AND posted_at IS NULL')
    .get().c;
  const lastPosted = db
    .prepare('SELECT posted_at FROM articles WHERE posted_at IS NOT NULL ORDER BY posted_at DESC LIMIT 1')
    .get();
  return {
    totalArticles,
    totalPosted,
    todayPosted,
    pendingArticles,
    lastPostedAt: lastPosted?.posted_at || 'Jamais',
  };
}
