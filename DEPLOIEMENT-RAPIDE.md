# 🚀 Déploiement en 10 minutes sur Railway

## ✅ Ce qui est déjà prêt dans ton projet :
- ✅ `package.json` avec les scripts de démarrage
- ✅ `Procfile` pour Railway/Heroku
- ✅ `.gitignore` pour ne pas envoyer node_modules
- ✅ Configuration WebSocket fonctionnelle

## 📝 Étapes à suivre :

### 1. Créer un compte Railway (2 min)
1. Va sur **https://railway.app**
2. Clique sur "Login" en haut à droite
3. Connecte-toi avec ton compte **GitHub**
4. Accepte les permissions

### 2. Créer un repository GitHub (3 min)
```bash
# Ouvre PowerShell dans le dossier GreenRace et exécute :

# Initialiser Git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Premier déploiement Green Race"
```

Maintenant va sur **https://github.com/new** et :
- Nomme ton repo : `green-race`
- Laisse-le **Public** ou **Private** (selon ton choix)
- **NE COCHE PAS** "Add README" (tu en as déjà un)
- Clique "Create repository"

Ensuite, dans PowerShell :
```bash
# Remplace TON_USERNAME par ton nom d'utilisateur GitHub
git remote add origin https://github.com/TON_USERNAME/green-race.git
git branch -M main
git push -u origin main
```

### 3. Déployer sur Railway (2 min)
1. Retourne sur **https://railway.app**
2. Clique sur **"New Project"**
3. Sélectionne **"Deploy from GitHub repo"**
4. Choisis ton repo **green-race**
5. Railway va automatiquement :
   - ✅ Détecter Node.js
   - ✅ Installer les dépendances (`npm install`)
   - ✅ Démarrer le serveur (`npm start`)

### 4. Configurer (1 min)
Une fois déployé :
1. Clique sur ton projet
2. Va dans l'onglet **"Variables"**
3. Ajoute ces variables (clique "+ New Variable") :
   ```
   NODE_ENV = production
   PORT = 3000
   ```

### 5. Obtenir ton URL (1 min)
1. Va dans l'onglet **"Settings"**
2. Clique sur **"Generate Domain"**
3. Railway va te donner une URL comme :
   ```
   https://green-race-production-xxxx.up.railway.app
   ```

**🎉 C'EST TOUT ! Ton jeu est en ligne !**

## 🧪 Tester
- Ouvre l'URL depuis ton navigateur
- Ouvre l'URL depuis ton téléphone
- Le jeu devrait fonctionner exactement comme en local !

## 💰 Coût
- Railway offre **$5 de crédit gratuit par mois**
- Cela équivaut à environ **500 heures** de fonctionnement
- Si tu dépasses, tu payes seulement ce que tu utilises (~$5/mois pour usage normal)

## 🔧 Mises à jour futures
Pour mettre à jour ton jeu après des modifications :
```bash
git add .
git commit -m "Description de tes changements"
git push
```
Railway redéploiera automatiquement en 1-2 minutes !

## ❓ Problèmes courants

### Le CSS ne se charge pas
➡️ **Solution** : Efface le cache du navigateur (Ctrl+Shift+R ou cache du navigateur mobile)

### "This site can't be reached"
➡️ **Solution** : Attends 2-3 minutes, Railway est peut-être en train de déployer

### Le WebSocket ne se connecte pas
➡️ **Solution** : Vérifie que l'URL est bien en **HTTPS** (pas HTTP), Railway gère automatiquement le HTTPS

## 🆘 Besoin d'aide ?
- Documentation Railway : https://docs.railway.app
- Discord Railway : https://discord.gg/railway

---

**Alternative si Railway ne fonctionne pas :**

### Render (100% gratuit mais app dort après 15min)
1. Va sur **https://render.com**
2. Connecte GitHub
3. "New" → "Web Service"
4. Sélectionne ton repo
5. Configure :
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Clique "Create Web Service"

L'URL sera automatiquement générée avec HTTPS.
