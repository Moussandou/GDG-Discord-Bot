// ─── Source Configuration ────────────────────────────────────────────────────
// Chaque source est définie avec son flux RSS, sa catégorie et sa priorité.
// Les sources Google sont en priorité haute pour le GDG Marseille.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'ai'|'web'|'mobile'|'cloud'|'devops'|'general'} Category
 * @typedef {'high'|'medium'|'low'} Priority
 *
 * @typedef {Object} Source
 * @property {string} name
 * @property {string} url
 * @property {Category} category
 * @property {Priority} priority
 * @property {boolean} enabled
 * @property {boolean} isGoogle
 */

/** @type {Source[]} */
export const defaultSources = [
  // ─── Google Sources (Priorité Haute) ────────────────────────────────
  {
    name: 'Google Developers Blog',
    url: 'https://developers.googleblog.com/feeds/posts/default',
    category: 'general',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Google AI Blog',
    url: 'https://ai.googleblog.com/feeds/posts/default',
    category: 'ai',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Android Developers Blog',
    url: 'https://feeds.feedburner.com/blogspot/AndroidDevelopersBlog',
    category: 'mobile',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Chrome Developers Blog',
    url: 'https://developer.chrome.com/static/blog/feed.xml',
    category: 'web',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Firebase Blog',
    url: 'https://firebase.blog/feed',
    category: 'cloud',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Google Cloud Blog',
    url: 'https://cloudblog.withgoogle.com/rss',
    category: 'cloud',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'TensorFlow Blog',
    url: 'https://blog.tensorflow.org/feeds/posts/default',
    category: 'ai',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },
  {
    name: 'Google Blog - AI',
    url: 'https://blog.google/technology/ai/feed/',
    category: 'ai',
    priority: 'high',
    enabled: true,
    isGoogle: true,
  },

  // ─── Sources Tech Diversifiées (Moyenne/Basse) ─────────────────────
  {
    name: 'The Verge - Tech',
    url: 'https://www.theverge.com/tech/rss/index.xml',
    category: 'general',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    category: 'general',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'Vercel Blog',
    url: 'https://vercel.com/blog/feed',
    category: 'web',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'AWS News Blog',
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    category: 'cloud',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'HashiCorp Blog',
    url: 'https://www.hashicorp.com/blog/feed.xml',
    category: 'devops',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'React Blog',
    url: 'https://reactjs.org/feed.xml',
    category: 'web',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'GitHub Blog',
    url: 'https://github.blog/feed/',
    category: 'general',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'Docker Blog',
    url: 'https://www.docker.com/blog/feed/',
    category: 'devops',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'Hacker News (Best)',
    url: 'https://hnrss.org/best',
    category: 'general',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
  {
    name: 'Dev.to',
    url: 'https://dev.to/feed',
    category: 'general',
    priority: 'medium',
    enabled: true,
    isGoogle: false,
  },
];

// ─── Catégories disponibles ──────────────────────────────────────────────────
export const categories = {
  ai: { label: 'Intelligence Artificielle', emoji: '🤖', color: 0x7C3AED },
  web: { label: 'Web', emoji: '🌐', color: 0x2563EB },
  mobile: { label: 'Mobile', emoji: '📱', color: 0x059669 },
  cloud: { label: 'Cloud', emoji: '☁️', color: 0xEA580C },
  devops: { label: 'DevOps', emoji: '⚙️', color: 0xDC2626 },
  general: { label: 'Général', emoji: '💻', color: 0x6B7280 },
};

// ─── Mapping catégorie → channel Discord ─────────────────────────────────────
export const categoryChannels = {
  ai: 'ai-news',
  web: 'web-news',
  mobile: 'mobile-news',
  cloud: 'cloud-news',
  devops: 'devops-news', // Ajout de devops-news
  general: 'general-tech',
};

// Channel dédié pour les sources Google
export const googleChannel = 'google-news';
