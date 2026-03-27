// ─── RSS Fetcher ─────────────────────────────────────────────────────────────
// Fetch et parse des flux RSS avec gestion des erreurs et timeout.
// ─────────────────────────────────────────────────────────────────────────────

import RSSParser from 'rss-parser';
import logger from '../logger.js';

const parser = new RSSParser({
  timeout: 15000, // 15s timeout
  headers: {
    'User-Agent': 'GDG-Marseille-VeilleBot/1.0',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
    ],
  },
});

/**
 * Fetch un flux RSS et retourne les items normalisés.
 * @param {import('../config/sources.js').Source} source
 * @returns {Promise<Array<{title: string, url: string, content: string, publishedAt: string, sourceName: string}>>}
 */
export async function fetchRSSFeed(source) {
  try {
    logger.debug(`📡 Fetching RSS: ${source.name} (${source.url})`);
    const feed = await parser.parseURL(source.url);

    if (!feed.items || feed.items.length === 0) {
      logger.warn(`⚠️ Aucun item trouvé dans le flux: ${source.name}`);
      return [];
    }

    const items = feed.items.map((item) => ({
      title: cleanText(item.title || 'Sans titre'),
      url: normalizeUrl(item.link || item.guid || ''),
      content: extractContent(item),
      imageUrl: extractImage(item),
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      sourceName: source.name,
    }));

    logger.info(`✅ ${source.name}: ${items.length} articles trouvés`);
    return items;
  } catch (error) {
    logger.error(`❌ Erreur fetch RSS ${source.name}: ${error.message}`);
    return [];
  }
}

/**
 * Extrait le contenu le plus riche d'un item RSS.
 */
function extractContent(item) {
  // Priorité : content:encoded > content > summary > description
  const raw =
    item.contentEncoded ||
    item['content:encoded'] ||
    item.content ||
    item.summary ||
    item.contentSnippet ||
    item.description ||
    '';

  return cleanHtml(raw);
}

/**
 * Extrait l'image la plus pertinente d'un item RSS.
 */
function extractImage(item) {
  // 1. media:content (obj ou array)
  if (item.mediaContent) {
    const media = Array.isArray(item.mediaContent) ? item.mediaContent[0] : item.mediaContent;
    if (media && media.$ && media.$.url) return media.$.url;
    if (media && media.url) return media.url;
  }

  // 2. enclosure
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }

  // 3. Image dans le contenu HTML (fallback)
  const content = item.contentEncoded || item.content || item.description || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
  if (imgMatch) return imgMatch[1];

  return null;
}

/**
 * Nettoie le HTML basique et retourne du texte brut.
 */
function cleanHtml(html) {
  if (!html) return '';

  return (
    html
      // Remove HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Truncate to ~5000 chars for Gemini input
      .slice(0, 5000)
  );
}

/**
 * Nettoie le texte des caractères de contrôle.
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Normalise les URLs (supprime les paramètres de tracking courants).
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove common tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((p) =>
      parsed.searchParams.delete(p)
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
