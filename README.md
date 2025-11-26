# 🌱 Green Race - Multiplayer Eco Quiz Game

Un jeu de quiz multijoueur en temps réel sur l'écologie avec WebSocket. Jusqu'à 4 joueurs s'affrontent dans une course éco-responsable avec questions, mini-jeux et cartes physiques !

## ✨ Fonctionnalités

### 🎮 Gameplay
- **Jeu de plateau multijoueur** : 45 cases, 4 joueurs max
- **100 questions écologiques** : 3 niveaux de difficulté (facile/moyen/difficile)
- **7 modes de difficulté** : Easy, Medium, Hard, ou combinaisons mixtes
- **Cases spéciales** : Questions (5 questions consécutives), Cartes physiques, Good Luck (+2), Bad Luck (-2)
- **Système de scoring avancé** : Statistiques détaillées par joueur (dés, précision, mouvements)
- **Historique des parties** : Sauvegarde et consultation des parties précédentes

### 🎨 Interface
- **Avatars Lottie animés** : 6 avatars 3D éco-friendly
- **Design Kahoot-style** : Interface colorée et dynamique
- **100% Responsive** : Optimisé mobile, tablette et desktop
- **Mode spectateur** : Rejoignez une partie en cours pour observer
- **Statut de connexion temps réel** : Système de heartbeat (5s)

### 🔐 Sécurité (Production-ready)
- **Headers HTTP sécurisés** (Helmet avec CSP)
- **CORS configuré** (whitelist des origines)
- **Rate limiting** (HTTP + WebSocket)
- **Compression gzip** des assets
- **Validation stricte** des entrées utilisateur
- **Protection RGPD** : Modal d'information complète

## 📋 Prérequis

- Node.js (version 14 ou supérieure)
- npm ou yarn

## 🚀 Installation

1. Clonez le projet et accédez au dossier :
```bash
cd GreenRace
```

2. Installez les dépendances :
```bash
npm install
```

## ▶️ Lancement

Démarrez le serveur :
```bash
npm start
```

Le serveur sera accessible à l'adresse : `http://localhost:3000`

## 🎮 Utilisation

1. Ouvrez plusieurs onglets/fenêtres sur `http://localhost:3000`
2. Entrez votre pseudo et choisissez un avatar
3. Rejoignez le salon d'attente
4. Le joueur 1 peut lancer la partie quand au moins 2 joueurs sont connectés

## 📁 Structure du projet

```
GreenRace/
├── public/
│   ├── avatars/         # Fichiers JSON Lottie des avatars
│   ├── client.js        # Logique client WebSocket
│   ├── index.html       # Interface utilisateur
│   └── style.css        # Styles CSS
├── server/
│   └── index.js         # Serveur Express + Socket.IO
├── package.json         # Dépendances et scripts
└── README.md
```

## 🔧 Technologies utilisées

- **Backend** : Node.js, Express, Socket.IO
- **Frontend** : HTML5, CSS3, JavaScript (vanilla)
- **Animations** : Lottie Player

## 📝 Notes de développement

- Le serveur utilise le port 3000 par défaut (configurable via `PORT`)
- Les avatars sont des animations Lottie pour optimiser les performances
- Système de heartbeat WebSocket (5s timeout)
- Validation stricte des entrées avec `validator`
- Compression gzip automatique en production

## 🚀 Déploiement en production

Voir le fichier **[DEPLOYMENT.md](./DEPLOYMENT.md)** pour un guide complet de déploiement sécurisé.

### Options recommandées
1. **Railway** (le plus simple) - HTTPS + WebSocket automatique
2. **Render** - Plan gratuit généreux
3. **VPS** (DigitalOcean) - Contrôle total

### Configuration rapide
```bash
# 1. Copier .env.example vers .env
cp .env.example .env

# 2. Générer SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Mettre à jour .env avec vos valeurs
# 4. Déployer sur Railway/Render ou VPS
```

## 🐛 Problèmes connus

Aucun problème critique connu. Voir [GitHub Issues](https://github.com/VOTRE-USERNAME/green-race/issues) pour rapporter des bugs.

## 📄 Licence

MIT License - Ce projet est à usage éducatif et open-source.
