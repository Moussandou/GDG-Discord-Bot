#!/bin/bash
# Script de configuration automatique pour le GDG Veille Bot

echo "🚀 Début de la configuration de la VM..."

# 1. Mise à jour du système
sudo apt-get update && sudo apt-get upgrade -y

# 2. Installation de Docker et Git
echo "📦 Installation de Docker et Docker-Compose..."
sudo apt-get install -y docker.io docker-compose git

# 3. Démarrage de Docker
sudo systemctl enable docker
sudo systemctl start docker

# 4. Permissions pour l'utilisateur actuel
sudo usermod -aG docker $USER
echo "✅ Docker est prêt. (Déconnecte-toi et reconnecte-toi en SSH pour les permissions)."

# 5. Récupération du code (Si non présent)
if [ ! -d "GDG-Discord-Bot" ]; then
    echo "📥 Récupération du code..."
    # L'adresse GitHub du GDG sera ici
fi

# 6. Vérification du .env
if [ ! -f ".env" ]; then
  echo "⚠️ Crée ton fichier .env avec 'nano .env' et colle tes clés."
fi

echo "✨ Configuration terminée !"
