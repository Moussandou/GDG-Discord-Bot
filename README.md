# 🚀 GDG Marseille — Bot de Veille Tech

Bot Discord de veille technologique automatisée pour le [GDG Marseille](https://gdg.community.dev/gdg-marseille/).

Il scanne automatiquement les blogs tech (Google, Hacker News, Dev.to, GitHub Trending...), génère des résumés en français via **Google Gemini AI**, et les publie dans des channels Discord catégorisés.

---

## ✨ Fonctionnalités

- 🕷️ **Scraping automatique** — 12+ sources RSS (Google prioritaire)
- 🤖 **Résumés IA** — Gemini génère titre, résumé, points clés, niveau technique
- 📤 **Publication planifiée** — 3x/jour (9h, 13h, 18h) avec max 5 news/jour
- 🏷️ **Catégorisation** — AI, Web, Mobile, Cloud, DevOps, Général
- 🔍 **Déduplication** — Aucun doublon grâce à la base SQLite
- 💬 **Commandes slash** — `/veille`, `/sources`, `/categorie`, `/help`, `/admin`
- 🔧 **Administration** — Ajouter/supprimer des sources, modifier les horaires

---

## 📋 Prérequis

- **Node.js** ≥ 20
- Un **bot Discord** créé sur le [Discord Developer Portal](https://discord.com/developers/applications)
- Une **clé API Google Gemini** depuis [Google AI Studio](https://aistudio.google.com/apikey)

---

## 🚀 Installation

### 1. Cloner le repo

```bash
git clone https://github.com/GDG-Marseille/GDG-Discord-Bot.git
cd GDG-Discord-Bot
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Remplir le fichier `.env` :

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Token du bot Discord |
| `DISCORD_CLIENT_ID` | ID de l'application Discord |
| `DISCORD_GUILD_ID` | ID du serveur Discord |
| `GEMINI_API_KEY` | Clé API Google Gemini |
| `PUBLISH_HOURS` | Heures de publication (ex: `9,13,18`) |
| `MAX_DAILY_NEWS` | Max news par jour (défaut: `5`) |
| `SCRAPE_INTERVAL_HOURS` | Intervalle de scan (défaut: `6`) |

### 4. Créer les channels Discord

Créez ces channels sur votre serveur Discord :

- `#google-news`
- `#ai-news`
- `#web-news`
- `#mobile-news`
- `#cloud-news`
- `#general-tech`

### 5. Enregistrer les commandes slash

```bash
npm run deploy-commands
```

### 6. Lancer le bot

```bash
npm start
```

Mode développement (auto-reload) :

```bash
npm run dev
```

---

## 🐳 Docker

```bash
# Build et lancer
docker compose up -d

# Voir les logs
docker compose logs -f veille-bot

# Arrêter
docker compose down
```

---

## 💬 Commandes

| Commande | Description |
|----------|-------------|
| `/veille [nombre]` | Affiche les N dernières news (défaut: 5) |
| `/sources` | Liste les sources RSS surveillées |
| `/categorie <nom>` | Filtre les news par catégorie |
| `/help` | Aide du bot |

### Commandes Admin (permission `Gérer le serveur`)

| Commande | Description |
|----------|-------------|
| `/admin status` | Statut du bot (uptime, stats) |
| `/admin force-scan` | Force un scan immédiat |
| `/admin add-source <nom> <url> <catégorie>` | Ajoute une source RSS |
| `/admin remove-source <nom>` | Supprime une source custom |
| `/admin set-schedule <heures>` | Modifie les heures de publication |

---

## 📡 Sources par défaut

### 🔥 Google (Priorité haute)

| Source | Catégorie |
|--------|-----------|
| Google Developers Blog | Général |
| Google AI Blog | AI |
| Android Developers Blog | Mobile |
| Chrome Developers Blog | Web |
| Firebase Blog | Cloud |
| Google Cloud Blog | Cloud |
| TensorFlow Blog | AI |
| Google Blog - AI | AI |

### 📰 Tech générale (Priorité moyenne)

| Source | Catégorie |
|--------|-----------|
| Hacker News (Best) | Général |
| Dev.to | Général |
| Product Hunt (Tech) | Général |
| GitHub Trending | Général |

---

## 🏗️ Architecture

```
src/
├── index.js                 # Point d'entrée
├── logger.js                # Winston logger
├── config/
│   ├── index.js             # Chargement .env
│   └── sources.js           # Sources RSS + catégories
├── database/
│   ├── index.js             # Init SQLite
│   └── articles.js          # CRUD articles
├── scraper/
│   ├── index.js             # Orchestrateur
│   └── rssFetcher.js        # Fetch RSS
├── summarizer/
│   ├── index.js             # Orchestrateur
│   └── geminiClient.js      # Client Gemini AI
├── discord/
│   ├── client.js            # Client Discord
│   ├── embeds.js            # Constructeur d'embeds
│   ├── channelMapper.js     # Mapping catégorie → channel
│   └── commands/
│       ├── veille.js        # /veille
│       ├── sources.js       # /sources
│       ├── categorie.js     # /categorie
│       ├── help.js          # /help
│       └── admin.js         # /admin
└── scheduler/
    └── index.js             # Cron jobs
```

---

## 🔧 Configuration du bot Discord

1. Aller sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Créer une nouvelle application
3. Aller dans **Bot** → Créer un bot
4. Copier le **Token** → mettre dans `.env`
5. Activer les intents **SERVER MEMBERS** et **MESSAGE CONTENT** (si nécessaire)
6. Aller dans **OAuth2** → URL Generator :
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
7. Copier l'URL générée et inviter le bot sur votre serveur

---

## 📄 Licence

MIT — GDG Marseille
