// ─── Gemini Client ───────────────────────────────────────────────────────────
// Client Google Gemini pour la génération de résumés structurés en français.
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import logger from '../logger.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const model = genAI.getGenerativeModel({
  model: config.gemini.model,
  generationConfig: {
    temperature: 0.4,
    topP: 0.9,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  },
});

const SYSTEM_PROMPT = `Tu es un assistant de veille technologique pour le GDG Marseille (Google Developer Group).
Tu dois analyser des articles tech et produire des résumés clairs, concis et informatifs EN FRANÇAIS.

Pour chaque article, tu dois retourner un JSON avec exactement cette structure :
{
  "title_fr": "Titre traduit/adapté en français (court et accrocheur)",
  "summary": "Résumé de 3 à 5 lignes en français, clair et accessible",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "tech_level": "Débutant" | "Intermédiaire" | "Avancé",
  "category": "AI" | "Web" | "Mobile" | "Cloud" | "DevOps" | "General",
  "emoji": "Un emoji pertinent pour le sujet (ex: 🚀, 🤖, 🌐, 📱, ☁️, ⚡)"
}

Règles :
- Le résumé doit être professionnel mais accessible
- 3 à 5 points clés maximum, chacun en une phrase courte
- Choisis la catégorie la plus pertinente
- Le niveau technique doit refléter le contenu réel de l'article
- Si l'article est en anglais, traduis tout en français
- Garde un ton communautaire et engageant`;

/**
 * Génère un résumé structuré d'un article via Gemini.
 * @param {string} title - Titre original de l'article
 * @param {string} content - Contenu brut (texte)
 * @param {string} sourceName - Nom de la source
 * @returns {Promise<Object|null>} Résumé structuré ou null en cas d'erreur
 */
export async function generateSummary(title, content, sourceName) {
  const prompt = `Analyse cet article tech et produis un résumé structuré en JSON.

Source : ${sourceName}
Titre original : ${title}

Contenu de l'article :
${content.slice(0, 4000)}

Retourne UNIQUEMENT le JSON structuré, sans texte supplémentaire.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt },
      ]);

      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      // Validate required fields
      if (!parsed.title_fr || !parsed.summary || !parsed.key_points) {
        throw new Error('Champs obligatoires manquants dans la réponse Gemini');
      }

      // Normalize category
      parsed.category = normalizeCategory(parsed.category);

      logger.debug(`🤖 Résumé généré pour: ${title.slice(0, 60)}...`);
      return parsed;
    } catch (error) {
      logger.warn(
        `⚠️ Tentative ${attempt}/3 échouée pour "${title.slice(0, 40)}...": ${error.message}`
      );

      if (attempt < 3) {
        // Exponential backoff: 2s, 4s
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  logger.error(`❌ Échec définitif de résumé pour: ${title}`);
  return null;
}

/**
 * Normalise la catégorie retournée par Gemini.
 */
function normalizeCategory(category) {
  if (!category) return 'general';

  const mapping = {
    ai: 'ai',
    'intelligence artificielle': 'ai',
    ia: 'ai',
    web: 'web',
    mobile: 'mobile',
    android: 'mobile',
    ios: 'mobile',
    cloud: 'cloud',
    devops: 'devops',
    general: 'general',
  };

  return mapping[category.toLowerCase()] || 'general';
}
