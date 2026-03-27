// ─── Gemini Client ───────────────────────────────────────────────────────────
// Client Google Gemini pour la génération de résumés structurés en français.
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/index.js';
import logger from '../logger.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const SYSTEM_PROMPT = `Tu es un expert en veille technologique pour le GDG Marseille.
Ton rôle est de transformer des articles techniques (souvent en anglais) en pépites d'information claires et actionnables EN FRANÇAIS.

Pour chaque article, tu dois retourner un JSON avec EXACTEMENT cette structure :
{
  "title_fr": "Titre traduit et synthétique (ex: 'Sortie de Flutter 4.0' au lieu du titre original long)",
  "summary": "Une synthèse de 3 à 5 lignes qui explique POURQUOI c'est important. Ne te contente pas de décrire, analyse l'intérêt pour un développeur.",
  "key_points": ["Point technique majeur 1", "Bénéfice concret 2", "Changement important 3"],
  "tech_level": "Débutant" | "Intermédiaire" | "Avancé",
  "category": "ai" | "web" | "mobile" | "cloud" | "devops" | "general",
  "emoji": "L'emoji tech le plus précis (pas de 📰 si tu peux trouver mieux)"
}

Règles de rédaction STRICTES :
1. INTERDICTION DE L'ANGLAIS : Le titre ("title_fr") et le résumé ("summary") doivent être à 100% en français. Traduis les noms de fonctionnalités si nécessaire (ex: "Hooks" peut rester tel quel, mais "What's new in React" DOIT devenir "Nouveautés de React").
2. SYNTHÈSE : Rentre directement dans le vif du sujet. Pas de "Cet article explique...".
3. TON : Communautaire, enthousiaste et professionnel.`;

const model = genAI.getGenerativeModel({
  model: config.gemini.model,
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    temperature: 0.4,
    topP: 0.9,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
  },
});

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
      const result = await model.generateContent(prompt);

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
