// ─── Configuration Loader ────────────────────────────────────────────────────
// Charge et valide les variables d'environnement depuis .env
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';

const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID', 'GEMINI_API_KEY'];

// Validate required env vars
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    console.error(`   Copie .env.example vers .env et remplis les valeurs.`);
    process.exit(1);
  }
}

function parseHours(str) {
  return str
    .split(',')
    .map((h) => parseInt(h.trim(), 10))
    .filter((h) => !isNaN(h) && h >= 0 && h <= 23);
}

const config = {
  // Discord
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
  },

  // Gemini AI
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },

  // Scheduling
  schedule: {
    publishHours: parseHours(process.env.PUBLISH_HOURS || '9,13,18'),
    scrapeIntervalHours: parseInt(process.env.SCRAPE_INTERVAL_HOURS || '6', 10),
    maxDailyNews: parseInt(process.env.MAX_DAILY_NEWS || '5', 10),
    timezone: process.env.TIMEZONE || 'Europe/Paris',
  },

  // Options
  summaryLanguage: process.env.SUMMARY_LANGUAGE || 'fr',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Paths
  dbPath: process.env.DB_PATH || './data/veille.db',
};

export default config;
