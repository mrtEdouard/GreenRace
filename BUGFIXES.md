# 🐛 Corrections de bugs - Green Race

## Bug #1 : Freeze quand un joueur atteint la case 45 depuis les questions ❌ → ✅

### **Problème**
Quand un joueur répondait aux questions et atteignait exactement la case 45 (victoire), le jeu se figeait. Le message "X gagne +1 pts" s'affichait mais le modal de victoire n'apparaissait jamais.

### **Cause**
Dans le code de gestion des questions (ligne ~912), quand `player.position >= TOTAL_CELLS`, le jeu appelait `endGame('won')` et `return` **sans délai**. Le client n'avait pas le temps de recevoir et afficher les événements dans le bon ordre.

### **Solution**
Ajout d'un `setTimeout` de 2 secondes avant d'émettre `gameWon` et d'appeler `endGame()`, permettant au client de traiter l'animation de mouvement avant la victoire.

```javascript
// AVANT (buggé)
if (player.position >= TOTAL_CELLS) {
  io.emit("gameWon", {...});
  endGame('won');
  return;
}

// APRÈS (corrigé)
if (player.position >= TOTAL_CELLS) {
  setTimeout(() => {
    io.emit("gameWon", {...});
    endGame('won');
  }, 2000);
  return;
}
```

---

## Bug #2 : Pas de cumul des cases spéciales 🔄 → ✅

### **Problème**
Quand un joueur tombait sur une case "Good Luck" (+2 cases) ou "Bad Luck" (-2 cases), et que ces +2/-2 le faisaient tomber sur **une autre case spéciale**, cette deuxième case n'était **pas déclenchée**.

**Exemple :**
- Joueur à la case 5 (case Question)
- Tombe sur case 7 (Good Luck) → +2 → case 9
- Case 9 est une case "Card" mais elle n'est pas déclenchée ❌

### **Cause**
Le code de gestion des cases spéciales (lignes ~713-825) traitait la case Good/Bad Luck, puis **passait directement au tour suivant** sans vérifier si la nouvelle position était aussi une case spéciale.

### **Solution**
Création d'une **fonction récursive `handleSpecialCell()`** qui :
1. Vérifie le type de case actuelle
2. Applique l'effet (good luck, bad luck, question, card)
3. **Si c'était good/bad luck**, rappelle `handleSpecialCell()` pour vérifier la nouvelle position
4. Continue jusqu'à tomber sur une case normale, question, ou card

```javascript
function handleSpecialCell(player, delayBeforeCheck = 0) {
  setTimeout(() => {
    const cellType = getCellType(player.position);
    
    if (cellType === 'goodluck') {
      // Appliquer +2
      player.position = Math.min(player.position + 2, TOTAL_CELLS);
      io.emit("luckEvent", {...});
      
      // RÉCURSION : vérifier la nouvelle position
      handleSpecialCell(player, 3000);
      
    } else if (cellType === 'badluck') {
      // Appliquer -2
      player.position = Math.max(player.position - 2, 0);
      io.emit("luckEvent", {...});
      
      // RÉCURSION : vérifier la nouvelle position
      handleSpecialCell(player, 3000);
      
    } else if (cellType === 'question' || cellType === 'card') {
      // Déclencher la question ou la carte
      // ...
    } else {
      // Case normale → tour suivant
      nextTurn();
    }
  }, delayBeforeCheck);
}
```

### **Scénarios maintenant supportés :**
✅ Good Luck → Good Luck → Good Luck (cumul de +6)
✅ Good Luck → Question (la question se déclenche)
✅ Good Luck → Case 45 (victoire immédiate)
✅ Bad Luck → Bad Luck → recul de 4 cases
✅ Questions → Good Luck (si le mouvement des questions tombe sur good luck)

---

## 🎮 Comment tester

### Test #1 : Victoire à la case 45 depuis les questions
1. Positionne un joueur à la case 40
2. Fais-le tomber sur une case Question (ex: case 40)
3. Réponds correctement à 5/5 questions → +5 cells → case 45
4. ✅ Le modal de victoire doit s'afficher normalement

### Test #2 : Cumul de cases spéciales
1. Positionne un joueur à la case 5
2. Fais-le tomber sur case 7 (Good Luck)
3. Good Luck donne +2 → case 9 (Card)
4. ✅ Le système de carte physique doit se déclencher

### Test #3 : Cumul multiple
1. Place un joueur sur case 5
2. Lance le dé pour tomber sur case 7 (Good Luck)
3. +2 → case 9 (Card si configuré, ou Good Luck si modifié)
4. Continue jusqu'à tomber sur une case normale ou question
5. ✅ Toutes les cases spéciales doivent se déclencher en chaîne

---

## 📝 Notes techniques

### Pourquoi une fonction récursive ?
- ✅ **Élégant** : Évite la duplication de code
- ✅ **Maintenable** : Un seul endroit pour gérer toutes les cases spéciales
- ✅ **Flexible** : Facile d'ajouter de nouveaux types de cases
- ✅ **Délais gérés** : Chaque case a son propre délai d'animation

### Limites actuelles
- Maximum 15 cases spéciales en chaîne (impossible dans la pratique vu la disposition)
- Les cases "Question" et "Card" arrêtent la chaîne (comportement attendu)

---

## 🚀 Déploiement

Pour déployer ces corrections sur Render :

```bash
git add .
git commit -m "Fix: Victoire à case 45 + Cumul des cases spéciales"
git push
```

Render redéploiera automatiquement en 2-3 minutes.

---

## ✅ Statut
- [x] Bug #1 : Freeze à case 45 **CORRIGÉ**
- [x] Bug #2 : Cumul cases spéciales **CORRIGÉ**
- [x] Testé localement
- [ ] À déployer sur Render

---

**Date** : 26 novembre 2025
**Version** : 1.1.0
