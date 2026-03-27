// ─── Database Initialization ─────────────────────────────────────────────────
// SQLite via better-sqlite3 — stockage local des articles et sources custom.
// ─────────────────────────────────────────────────────────────────────────────

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from '../config/index.js';
import logger from '../logger.js';

let db;

export function initDatabase() {
  // Ensure data directory exists
  mkdirSync(dirname(config.dbPath), { recursive: true });

  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      source_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      priority TEXT NOT NULL DEFAULT 'medium',
      is_google INTEGER NOT NULL DEFAULT 0,
      raw_content TEXT,
      summary TEXT,
      key_points TEXT,
      tech_level TEXT,
      emoji TEXT DEFAULT '📰',
      published_at TEXT,
      scraped_at TEXT DEFAULT (datetime('now')),
      summarized_at TEXT,
      posted_at TEXT,
      discord_message_id TEXT,
      channel_id TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      url TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      priority TEXT NOT NULL DEFAULT 'medium',
      is_google INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_articles_url ON articles(url);
    CREATE INDEX IF NOT EXISTS idx_articles_posted ON articles(posted_at);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_scraped ON articles(scraped_at);
  `);

  logger.info('✅ Base de données initialisée');
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export default { initDatabase, getDb };
