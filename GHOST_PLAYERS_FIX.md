# Fix: Joueurs Fantômes (Ghost Players)

## Problèmes identifiés

### 1. Duplication de socket.id dans le waiting room
- Quand un joueur perd la connexion et se reconnecte, le `socket.id` change
- L'ancienne connexion peut rester dans `waitingRoom[]`
- Résultat : 2 entrées pour le même utilisateur

### 2. Pas de nettoyage au démarrage du jeu
- Quand le jeu démarre, `waitingRoom[]` n'est pas vidé
- Les joueurs restent dans les deux structures (waitingRoom + gameState.players)

### 3. Heartbeat non initialisé dès la connexion
- `lastHeartbeat` n'est défini que lors du premier heartbeat reçu
- Pendant les premières secondes, le joueur peut être considéré comme "timeout"

### 4. Reconnexion mal gérée
- Lors d'une reconnexion, on met à jour le `socketId` mais on ne vérifie pas s'il y a des doublons
- Un joueur peut avoir plusieurs `socketId` actifs simultanément

## Solutions à implémenter

### 1. Nettoyage strict des connexions dupliquées
```javascript
// Avant d'ajouter un joueur, vérifier et retirer les anciennes connexions
function cleanupDuplicateConnections(username, newSocketId) {
  // Retirer du waiting room toutes les anciennes connexions de cet utilisateur
  waitingRoom = waitingRoom.filter(p => p.username !== username);
  
  // Dans le game state, mettre à jour le socketId et déconnecter les anciens
  if (gameState.active) {
    gameState.players.forEach(p => {
      if (p.username === username && p.socketId !== newSocketId) {
        p.socketId = newSocketId;
        p.connected = true;
        p.lastHeartbeat = Date.now();
      }
    });
  }
}
```

### 2. Vider le waiting room au démarrage du jeu
```javascript
// Au moment du startGame
waitingRoom = []; // Vider complètement
```

### 3. Initialiser lastHeartbeat dès la connexion
```javascript
// Dans joinWaitingRoom et startGame
player.lastHeartbeat = Date.now();
player.connected = true;
```

### 4. Ping périodique du serveur vers les clients
```javascript
// Toutes les 30 secondes, demander aux clients de répondre
setInterval(() => {
  if (!gameState.active) {
    waitingRoom.forEach(player => {
      const socket = io.sockets.sockets.get(player.socketId);
      if (!socket || socket.disconnected) {
        console.log(`Removing ghost player: ${player.username}`);
        waitingRoom = waitingRoom.filter(p => p.socketId !== player.socketId);
      }
    });
    broadcastWaitingRoomState();
  }
}, 30000);
```

### 5. Vérification stricte des sockets existants
```javascript
// Helper pour vérifier si un socket existe réellement
function isSocketConnected(socketId) {
  const socket = io.sockets.sockets.get(socketId);
  return socket && socket.connected;
}
```

## Ordre d'implémentation

1. ✅ Ajouter la fonction `cleanupDuplicateConnections()`
2. ✅ Modifier `joinWaitingRoom` pour appeler le cleanup
3. ✅ Vider `waitingRoom` au démarrage du jeu
4. ✅ Initialiser `lastHeartbeat` partout
5. ✅ Ajouter l'intervalle de nettoyage périodique
6. ✅ Ajouter des logs détaillés pour le debug
