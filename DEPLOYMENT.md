# 🚀 Green Race - Guide de Déploiement

Ce guide vous explique comment déployer Green Race sur internet de manière sécurisée.

## 📋 Prérequis

- [ ] Compte GitHub (pour versionner le code)
- [ ] Node.js 18+ installé localement
- [ ] Toutes les dépendances installées (`npm install`)
- [ ] Logo optimisé (<1MB recommandé)

## 🔐 Sécurité implémentée

✅ **Headers HTTP sécurisés** (Helmet)
✅ **CORS configuré** (whitelist des origines)
✅ **Rate limiting** HTTP et WebSocket
✅ **Compression gzip** des assets
✅ **Validation** des entrées utilisateur
✅ **Variables d'environnement** pour secrets

## 🎯 Option 1: Déploiement sur Railway (Recommandé)

Railway est la solution la plus simple et moderne pour héberger Green Race.

### Avantages
- ✅ Déploiement en 5 minutes
- ✅ HTTPS automatique
- ✅ WebSocket support natif
- ✅ $5 de crédit gratuit/mois
- ✅ Pas de sleep sur plan gratuit

### Étapes de déploiement

#### 1. Créer un repository GitHub

```bash
git init
git add .
git commit -m "Initial commit - Green Race ready for deployment"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/green-race.git
git push -u origin main
```

#### 2. Créer un compte Railway

1. Allez sur [railway.app](https://railway.app)
2. Connectez-vous avec GitHub
3. Cliquez sur "New Project"
4. Sélectionnez "Deploy from GitHub repo"
5. Choisissez votre repository `green-race`

#### 3. Configurer les variables d'environnement

Dans Railway, allez dans l'onglet "Variables" et ajoutez :

```
NODE_ENV=production
PORT=3000
MAX_PLAYERS=4
MAX_GAME_HISTORY=100
ALLOWED_ORIGINS=https://votre-app.railway.app
SESSION_SECRET=GÉNÉRER_UNE_CLEF_ALÉATOIRE_ICI
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Important**: Pour `SESSION_SECRET`, générez une clef aléatoire :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. Déployer

Railway détecte automatiquement votre `Procfile` et déploie l'application !

#### 5. Obtenir votre URL

1. Dans Railway, copiez l'URL générée (ex: `https://green-race-production.up.railway.app`)
2. Mettez à jour `ALLOWED_ORIGINS` avec cette URL
3. Partagez l'URL avec vos joueurs !

### Domaine personnalisé (optionnel)

1. Achetez un domaine sur Namecheap/GoDaddy (~10$/an)
2. Dans Railway, allez dans "Settings" → "Domains"
3. Ajoutez votre domaine et configurez les DNS
4. Mettez à jour `ALLOWED_ORIGINS` avec votre domaine

---

## 🎯 Option 2: Déploiement sur Render

### Avantages
- ✅ Plan gratuit généreux
- ✅ HTTPS automatique
- ⚠️ App dort après 15min d'inactivité (plan gratuit)

### Étapes

1. Créez un compte sur [render.com](https://render.com)
2. "New" → "Web Service"
3. Connectez votre repo GitHub
4. Configuration :
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free ou Starter ($7/mois)
5. Ajoutez les variables d'environnement (même liste que Railway)
6. Déployez !

---

## 🎯 Option 3: VPS (DigitalOcean, Linode, etc.)

Pour plus de contrôle et de performances.

### Prérequis
- VPS avec Ubuntu 22.04 LTS
- Accès SSH
- Domaine pointant vers le VPS

### Installation complète

#### 1. Connexion SSH

```bash
ssh root@VOTRE_IP
```

#### 2. Installer Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Vérifier >= 18.x
```

#### 3. Installer PM2

```bash
sudo npm install -g pm2
```

#### 4. Cloner le projet

```bash
cd /var/www
git clone https://github.com/VOTRE-USERNAME/green-race.git
cd green-race
npm install --production
```

#### 5. Configurer les variables d'environnement

```bash
nano .env
```

Copiez le contenu de `.env.example` et remplissez les valeurs.

#### 6. Lancer avec PM2

```bash
pm2 start server/index.js --name green-race
pm2 save
pm2 startup
```

#### 7. Installer Nginx (reverse proxy)

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/green-race
```

Configuration Nginx:

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activez le site:

```bash
sudo ln -s /etc/nginx/sites-available/green-race /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Installer SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

Certbot configure automatiquement HTTPS ! 🎉

#### 9. Configurer le firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## 📊 Monitoring et Maintenance

### Uptime Robot (Monitoring gratuit)

1. Créez un compte sur [uptimerobot.com](https://uptimerobot.com)
2. Ajoutez un monitor HTTP(s) avec votre URL
3. Configurez les alertes email

### Logs (PM2)

```bash
pm2 logs green-race
pm2 logs green-race --lines 100
```

### Redémarrer l'application

```bash
pm2 restart green-race
```

### Mettre à jour

```bash
cd /var/www/green-race
git pull origin main
npm install --production
pm2 restart green-race
```

---

## 🔒 Checklist de sécurité finale

Avant de rendre votre application publique :

- [ ] `NODE_ENV=production` configuré
- [ ] `SESSION_SECRET` aléatoire et secret
- [ ] `ALLOWED_ORIGINS` contient uniquement vos domaines
- [ ] HTTPS actif (certificat SSL valide)
- [ ] Firewall configuré (si VPS)
- [ ] `.env` dans `.gitignore` (secrets non versionnés)
- [ ] `game_history.json` dans `.gitignore`
- [ ] Logo optimisé (<1MB)
- [ ] Monitoring actif (UptimeRobot)
- [ ] Backups configurés

---

## 📦 Optimisation du logo

Votre logo actuel fait 3.9MB, ce qui est trop lourd. Compressez-le :

### Méthode 1: En ligne (gratuit)
1. Allez sur [squoosh.app](https://squoosh.app)
2. Uploadez `public/images/Logo Green Race.png`
3. Choisissez format WebP ou PNG optimisé
4. Réduisez la qualité jusqu'à ~200KB
5. Téléchargez et remplacez

### Méthode 2: Avec sharp (Node.js)

```bash
npm install --save-dev sharp
```

```js
const sharp = require('sharp');

sharp('public/images/Logo Green Race.png')
  .resize(800) // width
  .webp({ quality: 80 })
  .toFile('public/images/logo-optimized.webp');
```

---

## 🆘 Problèmes courants

### WebSocket ne fonctionne pas

Vérifiez que:
- Le port est bien ouvert
- Nginx passe bien les headers WebSocket (voir config ci-dessus)
- `ALLOWED_ORIGINS` contient votre domaine

### App inaccessible

```bash
# Vérifier que l'app tourne
pm2 status

# Vérifier les logs
pm2 logs green-race --lines 50

# Vérifier nginx
sudo nginx -t
sudo systemctl status nginx
```

### CORS errors

Mettez à jour `ALLOWED_ORIGINS` dans les variables d'environnement avec votre domaine exact.

---

## 💰 Estimation des coûts

### Configuration gratuite
- Railway: $5 crédit/mois ≈ 500MB RAM
- Render Free: Illimité mais app dort après 15min
- **Total: $0/mois**

### Configuration recommandée
- Railway Starter: $5-10/mois
- Domaine: ~$10/an
- **Total: ~$6-12/mois**

### Configuration pro
- VPS DigitalOcean: $12/mois (2GB RAM)
- Domaine: $10/an
- **Total: ~$13/mois**

---

## 📞 Support

- GitHub Issues: [Votre repo]/issues
- Documentation: README.md
- Plan de sécurité: [ID du plan créé]

---

**🎉 Votre application Green Race est maintenant prête pour le déploiement !**
