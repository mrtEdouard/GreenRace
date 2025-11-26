# 🚀 Guide de déploiement Green Race

## Option 1 : Railway (Recommandé - Le plus simple)

### Étape 1 : Créer un compte
1. Va sur https://railway.app
2. Connecte-toi avec GitHub

### Étape 2 : Préparer le code
```bash
# Initialiser Git si pas déjà fait
git init
git add .
git commit -m "Initial commit"

# Créer un repo GitHub
# Va sur https://github.com/new et crée un nouveau repo
# Puis :
git remote add origin https://github.com/TON_USERNAME/green-race.git
git branch -M main
git push -u origin main
```

### Étape 3 : Déployer sur Railway
1. Sur Railway, clique "New Project"
2. Choisis "Deploy from GitHub repo"
3. Sélectionne ton repo `green-race`
4. Railway va automatiquement :
   - Détecter que c'est du Node.js
   - Installer les dépendances
   - Démarrer avec `npm start`

### Étape 4 : Configurer les variables d'environnement
Dans Railway, va dans Settings → Variables et ajoute :
```
NODE_ENV=production
PORT=3000
MAX_PLAYERS=4
```

### Étape 5 : Obtenir l'URL
Railway te donnera automatiquement une URL type :
`https://green-race-production.up.railway.app`

**C'est tout ! Ton jeu est en ligne avec HTTPS et WebSocket qui fonctionnent ! 🎉**

---

## Option 2 : Render (Alternative gratuite)

1. Va sur https://render.com
2. Connecte GitHub
3. "New" → "Web Service"
4. Sélectionne ton repo
5. Configure :
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Variables d'environnement :
   ```
   NODE_ENV=production
   ```

**Note** : Le plan gratuit de Render fait dormir l'app après 15min d'inactivité.

---

## Option 3 : VPS (Pour les utilisateurs avancés)

### Prérequis
- Un VPS (DigitalOcean, Linode, OVH...)
- Ubuntu 22.04

### Installation
```bash
# Connexion SSH
ssh root@TON_IP

# Installation Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Installation PM2 (process manager)
npm install -g pm2

# Installation nginx (reverse proxy)
apt-get install -y nginx

# Cloner le projet
git clone https://github.com/TON_USERNAME/green-race.git
cd green-race
npm install

# Créer .env
cp .env.example .env
nano .env  # Éditer les variables

# Lancer avec PM2
pm2 start server/index.js --name green-race
pm2 startup
pm2 save

# Configurer nginx (reverse proxy)
nano /etc/nginx/sites-available/green-race
```

Configuration nginx :
```nginx
server {
    listen 80;
    server_name ton-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activer le site
ln -s /etc/nginx/sites-available/green-race /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Installer SSL (Let's Encrypt)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d ton-domaine.com
```

---

## 🔒 Configuration de sécurité pour production

**IMPORTANT** : Avant de déployer en production, modifie `.env` :

```env
NODE_ENV=production
PORT=3000
MAX_PLAYERS=4
ALLOWED_ORIGINS=https://ton-url-railway.up.railway.app,https://www.ton-domaine.com
SESSION_SECRET=GENERE_UN_SECRET_ALEATOIRE_ICI
```

Pour générer un secret sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 Coûts estimés

| Solution | Prix | Avantages | Inconvénients |
|----------|------|-----------|---------------|
| **Railway** | $5/mois (gratuit les 500h) | ✅ Très simple, HTTPS auto, WebSocket OK | ❌ Payant après crédit |
| **Render** | Gratuit | ✅ Gratuit, HTTPS auto | ❌ App dort après 15min |
| **VPS** | $6-12/mois | ✅ Contrôle total, performances | ❌ Configuration manuelle |

---

## 🎯 Recommandation

**Pour débuter** : Utilise **Railway**
- Déploiement en 5 minutes
- HTTPS automatique
- WebSocket fonctionne parfaitement
- Pas besoin de gérer un serveur

**Pour du long terme** : Migre vers un VPS si tu dépasses 50 joueurs simultanés.
