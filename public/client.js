// public/client.js

//Map avatars :
const avatarButtonIcon = document.getElementById("avatarButtonIcon");

const avatarMeta = {
  avatarCat: {
    label: "Laughing Cat",
    emoji: "😹",
    lottie:
      "avatars/Cat laughing loudly. HahahahLOL emojisticker animation.json",
  },
  avatarPanda: {
    label: "Sleepy Panda",
    emoji: "🐼",
    lottie: "avatars/Cute little panda sleeping.json",
  },
  avatarOwl: {
    label: "Cute Owl",
    emoji: "🦉",
    lottie: "avatars/Cute Owl.json",
  },
  avatarDog: {
    label: "Happy Dog",
    emoji: "🐶",
    lottie: "avatars/Happy Dog.json",
  },
  avatarEmoji: {
    label: "Kawaii Emoji",
    emoji: "😊",
    lottie: "avatars/Kawaii emoji saying hi.json",
  },
  avatarSnake: {
    label: "Friendly Snake",
    emoji: "🐍",
    lottie: "avatars/Snake.json",
  },
};
// Socket connection
const socket = io();

// ---------------------
// Local state
// ---------------------
let mySlot = null;
let playerCount = 0;
let currentAvatar = "avatarCat";
let hasJoinedWaitingRoom = false;
let isSpectator = false;

// Check if we have saved session data
const savedSession = localStorage.getItem('greenRaceSession');
if (savedSession) {
  try {
    const session = JSON.parse(savedSession);
    if (session.username && session.avatar) {
      currentAvatar = session.avatar;
      // Auto-rejoin after connection
      socket.on('connect', () => {
        if (!hasJoinedWaitingRoom) {
          socket.emit('joinWaitingRoom', {
            username: session.username,
            avatar: session.avatar
          });
        }
      });
    }
  } catch (e) {
    console.error('Error loading saved session:', e);
  }
}

// Avatar metadata (for labels & emojis)

// ---------------------
// DOM elements
// ---------------------

// Sections
const preLobbySection = document.getElementById("preLobby");
const waitingRoomSection = document.getElementById("waitingRoom");
const gameScreenSection = document.getElementById("gameScreen");

// Pre-lobby
const preUsernameInput = document.getElementById("preUsernameInput");
const preAvatarButton = document.getElementById("preAvatarButton");
const preSelectedAvatarSpan = document.getElementById("preSelectedAvatar");
const enterLobbyButton = document.getElementById("enterLobbyButton");

// Waiting room
const mySlotSpan = document.getElementById("mySlot");
const usernameInput = document.getElementById("usernameInput");
const playerCountSpan = document.getElementById("playerCount");
const playerGrid = document.getElementById("playerGrid");
const startGameButton = document.getElementById("startGameButton");
const errorMessageP = document.getElementById("errorMessage");
const difficultySelector = document.getElementById("difficultySelector");
const endGameButton = document.getElementById("endGameButton");

// Modal
const openAvatarModalButton = document.getElementById("openAvatarModalButton");
const avatarModal = document.getElementById("avatarModal");
const closeAvatarModalButton = document.getElementById(
  "closeAvatarModalButton"
);
const avatarCards = document.querySelectorAll(".avatar-card");

// Save game modal
const saveGameModal = document.getElementById("saveGameModal");
const gameSummaryPreview = document.getElementById("gameSummaryPreview");
const gameNameInput = document.getElementById("gameNameInput");
const saveGameBtn = document.getElementById("saveGameBtn");
const skipSaveBtn = document.getElementById("skipSaveBtn");

// History modal
const historyModal = document.getElementById("historyModal");
const historyList = document.getElementById("historyList");
const historyButton = document.getElementById("historyButton");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");

// RGPD modal
const rgpdModal = document.getElementById("rgpdModal");
const openRgpdLink = document.getElementById("openRgpdLink");
const closeRgpdBtn = document.getElementById("closeRgpdBtn");

let currentGameSummary = null;

// ---------------------
// Socket.IO handlers
// ---------------------

// Called after we emit joinWaitingRoom
socket.on("playerAssigned", (data) => {
  hasJoinedWaitingRoom = true;

  mySlot = data.slot;
  mySlotSpan.textContent = mySlot;

  usernameInput.value = data.username;
  currentAvatar = data.avatar || "avatarCat";
  updateCurrentAvatarLabel();

  // Save session to localStorage
  localStorage.setItem('greenRaceSession', JSON.stringify({
    username: data.username,
    avatar: currentAvatar
  }));

  console.log(`Player assigned: slot ${mySlot}, username ${data.username}`);

  // Switch UI
  preLobbySection.classList.add("hidden");
  waitingRoomSection.classList.remove("hidden");
});

// Called when our slot is reassigned (e.g., when player 1 disconnects)
socket.on("slotReassigned", (data) => {
  mySlot = data.slot;
  mySlotSpan.textContent = mySlot;
  updateStartButtonState();
  console.log("Slot reassigned to:", mySlot);
});

// Full waiting room state (only once joined)
socket.on("waitingRoomState", (state) => {
  if (!hasJoinedWaitingRoom) return;

  playerCount = state.playerCount || 0;
  playerCountSpan.textContent = playerCount;

  const players = (state.players || []).slice().sort((a, b) => a.slot - b.slot);

  playerGrid.innerHTML = "";

  players.forEach((player) => {
    const meta = avatarMeta[player.avatar] || {
      label: player.avatar,
      emoji: "🌱",
      lottie: null,
    };

    const card = document.createElement("div");
    card.classList.add("player-card");
    if (player.slot === mySlot) card.classList.add("me");

    // 👉 OPTI PERF :
    // - Pour MOI : Lottie animé (plus gros, visible)
    // - Pour les AUTRES : simple emoji (ultra léger)
    const useLottie = player.slot === mySlot && !!meta.lottie;

    const avatarContent = useLottie
      ? `<lottie-player
         src="${meta.lottie}"
         background="transparent"
         speed="1"
         loop
         autoplay
       ></lottie-player>`
      : meta.emoji;

    card.innerHTML = `
    <div class="player-avatar-circle">
      ${avatarContent}
    </div>
    <div class="player-info">
      <div class="player-slot">PLAYER ${player.slot}</div>
      <div class="player-name">${player.username}</div>
      <div class="player-avatar-label">${meta.label}</div>
    </div>
  `;

    playerGrid.appendChild(card);
  });

  updateStartButtonState();
});

// Handler gameStarted déplacé dans la section HEARTBEAT SYSTEM ci-dessus

// Mode spectateur
socket.on("spectatorMode", (data) => {
  console.log('Spectator mode enabled:', data.message);
  isSpectator = true;
  
  // Afficher un message de spectateur
  preLobbySection.classList.add("hidden");
  waitingRoomSection.classList.add("hidden");
  gameScreenSection.classList.remove("hidden");
  
  // Ajouter un bandeau de spectateur
  const spectatorBanner = document.createElement('div');
  spectatorBanner.id = 'spectatorBanner';
  spectatorBanner.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 900;
    font-size: 14px;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  `;
  spectatorBanner.textContent = '👁️ SPECTATOR MODE - You are watching the game';
  document.body.appendChild(spectatorBanner);
  
  // Cacher les boutons de contrôle
  endGameButton.classList.add('hidden');
});

// Retour au lobby (déclenché par le serveur)
socket.on("returnToLobby", () => {
  console.log('returnToLobby event received');
  
  // Réinitialiser l'état
  gameActive = false;
  isSpectator = false;
  stopHeartbeat();
  window.onbeforeunload = null;
  currentGameSummary = null;
  
  // Fermer tous les modaux
  saveGameModal.classList.add('hidden');
  historyModal.classList.add('hidden');
  
  // Supprimer le bandeau spectateur s'il existe
  const spectatorBanner = document.getElementById('spectatorBanner');
  if (spectatorBanner) {
    spectatorBanner.remove();
  }
  
  // IMPORTANT: Retourner au waiting room
  gameScreenSection.classList.add("hidden");
  waitingRoomSection.classList.remove("hidden");
  preLobbySection.classList.add("hidden");
  
  // Cacher le bouton End Game
  endGameButton.classList.add('hidden');
  
  console.log('UI switched to waiting room');
  
  // Message de notification
  showError('Game ended. You are back in the waiting room.');
  setTimeout(() => hideError(), 3000);
});

socket.on("errorMessage", (payload) => {
  showError(payload.message || "Unknown error");
});

socket.on("connect", () => {
  console.log("Connected to server with socket id:", socket.id);
  hideError();
  
  // Si on était déjà dans un jeu, redemander l'état
  if (gameActive) {
    console.log("Reconnecting to active game...");
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  showError("Disconnected from server");
});

// ---------------------
// DOM listeners
// ---------------------

// Pre-lobby username → update button state
preUsernameInput.addEventListener("input", () => {
  updateEnterLobbyButtonState();
});

// Pre-lobby avatar button → open modal
preAvatarButton.addEventListener("click", () => {
  openAvatarModal();
});

// Join game (pre-lobby)
enterLobbyButton.addEventListener("click", () => {
  const username = preUsernameInput.value.trim();
  if (!username) return;

  // Save session before joining
  localStorage.setItem('greenRaceSession', JSON.stringify({
    username: username,
    avatar: currentAvatar
  }));

  socket.emit("joinWaitingRoom", {
    username,
    avatar: currentAvatar,
  });
});

// Waiting room username → update profile
usernameInput.addEventListener("input", () => {
  sendProfileUpdateDebounced();
});

// Waiting room change avatar
openAvatarModalButton.addEventListener("click", () => {
  openAvatarModal();
});

// Start game
startGameButton.addEventListener("click", () => {
  // Récupérer la difficulté sélectionnée
  const selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
  
  socket.emit("startGame", { difficulty: selectedDifficulty });
});

// Modal close button
closeAvatarModalButton.addEventListener("click", () => {
  closeAvatarModal();
});

// Modal backdrop click
avatarModal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    closeAvatarModal();
  }
});

// Escape closes modal
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAvatarModal();
  }
});

// End game button (Player 1 only)
endGameButton.addEventListener("click", () => {
  if (mySlot !== 1) return;
  
  const confirmed = confirm('⚠️ Are you sure you want to end the game prematurely?\n\nThis will:\n- End the game for all players\n- Return everyone to the waiting room\n- You can choose to save the game or skip\n\nThis action cannot be undone.');
  if (confirmed) {
    socket.emit('endGameManually');
  }
});

// Avatar selection
avatarCards.forEach((card) => {
  card.addEventListener("click", () => {
    const avatarId = card.dataset.avatarId; // <-- uses the ID from HTML
    currentAvatar = avatarId; // <-- update local state
    updateCurrentAvatarLabel(); // <-- refresh text in UI

    if (hasJoinedWaitingRoom) {
      sendProfileUpdate(); // <-- notify server
    }

    closeAvatarModal();
  });
});

// ---------------------
// Helper functions
// ---------------------

let profileUpdateTimeout = null;

function sendProfileUpdate() {
  if (!hasJoinedWaitingRoom) return;

  const username = usernameInput.value;
  socket.emit("updateProfile", {
    username,
    avatar: currentAvatar,
  });
  
  // Update saved session
  localStorage.setItem('greenRaceSession', JSON.stringify({
    username: username,
    avatar: currentAvatar
  }));
}

function sendProfileUpdateDebounced() {
  if (profileUpdateTimeout) {
    clearTimeout(profileUpdateTimeout);
  }
  profileUpdateTimeout = setTimeout(() => {
    sendProfileUpdate();
  }, 300);
}

function updateStartButtonState() {
  const isPlayerOne = mySlot === 1;
  const enoughPlayers = playerCount >= 2;
  startGameButton.disabled = !(isPlayerOne && enoughPlayers);
  
  // Afficher le sélecteur de difficulté uniquement pour le joueur 1
  if (isPlayerOne) {
    difficultySelector.classList.remove("hidden");
  } else {
    difficultySelector.classList.add("hidden");
  }
}

function updateCurrentAvatarLabel() {
  const meta = avatarMeta[currentAvatar] || {
    emoji: "🌱",
    label: currentAvatar,
    lottie: null,
  };

  const text = `${meta.emoji} ${meta.label}`;

  // Pre-lobby text (under "Choose avatar" button)
  preSelectedAvatarSpan.textContent = text;

  // Icon inside the "Change avatar" button in the waiting room
  if (avatarButtonIcon) {
    const iconHtml = meta.lottie
      ? `<lottie-player
           src="${meta.lottie}"
           background="transparent"
           speed="1"
           loop
           autoplay
         ></lottie-player>`
      : meta.emoji;

    avatarButtonIcon.innerHTML = iconHtml;
  }

  updateEnterLobbyButtonState();
}

function updateEnterLobbyButtonState() {
  const hasName = preUsernameInput.value.trim().length > 0;
  enterLobbyButton.disabled = !hasName;
}

function openAvatarModal() {
  avatarModal.classList.remove("hidden");
}

function closeAvatarModal() {
  avatarModal.classList.add("hidden");
}

function showError(message) {
  errorMessageP.textContent = message;
  errorMessageP.classList.remove("hidden");
}

function hideError() {
  errorMessageP.textContent = "";
  errorMessageP.classList.add("hidden");
}

// Init UI
updateEnterLobbyButtonState();
updateCurrentAvatarLabel();

// =====================================
// HEARTBEAT SYSTEM
// =====================================

let heartbeatInterval = null;

// Envoyer un heartbeat toutes les 2 secondes quand le jeu est actif
function startHeartbeat() {
  if (heartbeatInterval) return; // Déjà lancé
  
  heartbeatInterval = setInterval(() => {
    if (gameActive && !document.hidden) {
      socket.emit('heartbeat');
      console.log('Heartbeat sent');
    }
  }, 2000); // Heartbeat toutes les 2 secondes
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Démarrer le heartbeat quand le jeu commence
socket.on("gameStarted", (data) => {
  waitingRoomSection.classList.add("hidden");
  gameScreenSection.classList.remove("hidden");
  
  // Afficher le bouton "End Game" si joueur 1
  if (mySlot === 1) {
    endGameButton.classList.remove("hidden");
  }
  
  startHeartbeat();
  
  // Block page refresh during game
  window.onbeforeunload = function(e) {
    e.preventDefault();
    e.returnValue = '';
    return 'Game in progress! Are you sure you want to leave?';
  };
});

// Détecter quand la page devient invisible (mobile en arrière-plan)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden - stopping heartbeat');
    stopHeartbeat();
  } else {
    console.log('Page visible - resuming heartbeat');
    if (gameActive) {
      startHeartbeat();
      // Envoyer un heartbeat immédiatement
      socket.emit('heartbeat');
    }
  }
});

// =====================================
// GAME LOGIC
// =====================================

let gameActive = false;
let currentGameTurn = null;
let currentGamePhase = null;
let gamePlayers = [];
let isDiceAnimationPlaying = false; // Flag to prevent phase changes during animation
let isSpecialCellMessageDisplaying = false; // Flag to prevent phase changes during special cell messages

// Game DOM elements
const turnText = document.getElementById("turnText");
const playerPositions = document.getElementById("playerPositions");
const gameArea = document.getElementById("gameArea");

const rollingPhase = document.getElementById("rollingPhase");
const rollDiceButton = document.getElementById("rollDiceButton");
const diceAnimation = document.getElementById("diceAnimation");
const diceResult = document.getElementById("diceResult");

const waitingPhase = document.getElementById("waitingPhase");
const waitingText = document.getElementById("waitingText");

const questionPhase = document.getElementById("questionPhase");
const questionProgress = document.getElementById("questionProgress");
const questionDifficulty = document.getElementById("questionDifficulty");
const questionText = document.getElementById("questionText");
const questionOptions = document.getElementById("questionOptions");
const questionResult = document.getElementById("questionResult");
const resultIcon = document.getElementById("resultIcon");
const resultText = document.getElementById("resultText");
const resultExplanation = document.getElementById("resultExplanation");
const questionScore = document.getElementById("questionScore");

// Game event listeners
rollDiceButton.addEventListener("click", () => {
  if (isSpectator) return; // Bloquer les spectateurs
  socket.emit("rollDice");
  rollDiceButton.disabled = true;
});

// Game socket handlers
socket.on("gameStateUpdate", (state) => {
  console.log("%c[GAME STATE UPDATE]", "color: blue; font-weight: bold");
  console.log("  - Active:", state.active);
  console.log("  - Current turn (slot):", state.currentTurn);
  console.log("  - Phase:", state.phase);
  console.log("  - My slot:", mySlot);
  console.log("  - Is my turn:", state.currentTurn === mySlot);
  console.log("  - Dice animation playing:", isDiceAnimationPlaying);
  console.log("  - Special message displaying:", isSpecialCellMessageDisplaying);
  
  gameActive = state.active;
  currentGameTurn = state.currentTurn;
  currentGamePhase = state.phase;
  gamePlayers = state.players;

  // Forcer la mise à jour de l'UI seulement si l'animation du dé ou un message spécial n'est pas en cours
  if (gameActive && !isDiceAnimationPlaying && !isSpecialCellMessageDisplaying) {
    console.log("  → Calling updateGameUI()");
    updateGameUI();
  } else {
    console.log("  → Skipping updateGameUI (blocked by animation or message)");
  }
});

socket.on("diceRolled", (data) => {
  const { slot, result, newPosition } = data;
  
  // Block phase changes during dice animation
  isDiceAnimationPlaying = true;
  
  // Update local player position immediately for visual feedback
  const player = gamePlayers.find(p => p.slot === slot);
  if (player) {
    player.position = newPosition;
    // Update only the position display without changing the phase
    updatePlayerPositionsDisplay();
  }
  
  showDiceAnimation(data);
  
  // Allow phase changes after animation completes (2.5s for dice animation)
  setTimeout(() => {
    isDiceAnimationPlaying = false;
    // Now update UI with the correct phase
    updateGameUI();
  }, 2500);
});

// Question system handlers
let currentQuestionData = null;

socket.on("questionStart", (data) => {
  currentQuestionData = data;
  displayQuestion(data);
});

socket.on("questionResult", (data) => {
  showQuestionResult(data);
});

socket.on("questionSessionComplete", (data) => {
  showQuestionSessionComplete(data);
  
  setTimeout(() => {
    updateGameUI();
  }, 3000);
});

socket.on("luckEvent", (data) => {
  const { slot, type, event, oldPosition, newPosition, actualMovement } = data;
  const player = gamePlayers.find(p => p.slot === slot);
  const playerName = player ? player.username : `Player ${slot}`;
  const isMe = slot === mySlot;
  
  // Block UI updates during message display
  isSpecialCellMessageDisplaying = true;
  
  // Update player position immediately
  if (player) {
    player.position = newPosition;
    // Update only positions without changing phase
    updatePlayerPositionsDisplay();
  }
  
  // Affichage instantané pour les événements de chance
  waitingText.innerHTML = `
    ${type === 'good' ? '🍀' : '⚠️'} <strong>${event.message}</strong><br>
    ${isMe ? 'You' : playerName}: Cell ${oldPosition} → Cell ${newPosition}
    ${actualMovement !== 0 ? ` (${actualMovement > 0 ? '+' : ''}${actualMovement})` : ''}
  `;
  showPhase("waiting");
  
  // Allow UI updates after message has been displayed (3 seconds)
  setTimeout(() => {
    isSpecialCellMessageDisplaying = false;
  }, 3000);
});

socket.on("physicalCard", (data) => {
  const { slot, playerName } = data;
  
  if (slot === mySlot) {
    // Current player picks physical card
    showCardInput();
  } else {
    // Block UI updates during message display
    isSpecialCellMessageDisplaying = true;
    
    // Affichage instantané
    waitingText.innerHTML = `🎴 <strong>${playerName}</strong> is picking a card...`;
    showPhase("waiting");
    
    // Keep message visible until card result comes
  }
});

socket.on("cardResultApplied", (data) => {
  const { movements, players: updatedPositions } = data;
  
  // Block UI updates during message display
  isSpecialCellMessageDisplaying = true;
  
  // Update all affected player positions immediately
  if (updatedPositions) {
    updatedPositions.forEach(updated => {
      const player = gamePlayers.find(p => p.slot === updated.slot);
      if (player) {
        player.position = updated.position;
      }
    });
    // Update only positions without changing phase
    updatePlayerPositionsDisplay();
  }
  
  // Affichage instantané pour les résultats de cartes
  let message = '🎴 <strong>Card result:</strong><br><br>';
  movements.forEach(mov => {
    const player = gamePlayers.find(p => p.slot === mov.slot);
    const isMe = mov.slot === mySlot;
    const playerName = isMe ? 'You' : (player ? player.username : `Player ${mov.slot}`);
    message += `${playerName}: ${mov.movement > 0 ? '+' : ''}${mov.movement} cells<br>`;
  });
  
  waitingText.innerHTML = message;
  showPhase("waiting");
  
  setTimeout(() => {
    isSpecialCellMessageDisplaying = false;
    updateGameUI();
  }, 3000);
});


socket.on("gameWon", (data) => {
  const { winner } = data;
  const isMe = winner.slot === mySlot;
  const message = isMe 
    ? `🎉 <strong>You won the game!</strong> 🎉`
    : `🎉 <strong>${winner.username}</strong> won the game! 🎉`;
  // Affichage instantané pour la victoire
  waitingText.innerHTML = message;
  showPhase("waiting");
  gameActive = false;
  
  // Remove refresh block when game ends
  window.onbeforeunload = null;
});

// Game UI functions
let lastDisplayedTurn = null; // Track to avoid duplicate "is playing" messages

// Update only player positions display without changing phases
function updatePlayerPositionsDisplay() {
  playerPositions.innerHTML = "";
  gamePlayers.forEach((player) => {
    const posCard = document.createElement("div");
    posCard.classList.add("position-card");
    if (player.slot === currentGameTurn) {
      posCard.classList.add("is-current-turn");
    }
    
    if (player.connected === false) {
      posCard.classList.add("disconnected");
    }

    const meta = avatarMeta[player.avatar] || { emoji: "🌱", lottie: null };
    const avatarContent = meta.lottie 
      ? `<lottie-player src="${meta.lottie}" background="transparent" speed="1" loop autoplay></lottie-player>`
      : meta.emoji;

    const connectionStatus = player.connected === false 
      ? '<span class="connection-status offline">⚫ Offline</span>'
      : '<span class="connection-status online">🟢 Online</span>';

    posCard.innerHTML = `
      <div class="position-player-number">Player ${player.slot}</div>
      <div class="position-player-avatar">${avatarContent}</div>
      <span class="position-player-name">${player.username}</span>
      ${connectionStatus}
      <span class="position-value">Cell ${player.position}</span>
    `;

    playerPositions.appendChild(posCard);
  });
}

function updateGameUI() {
  if (!gameActive) {
    console.log("%c[updateGameUI] Game not active, returning", "color: gray");
    return;
  }
  
  console.log("%c[updateGameUI]", "color: green; font-weight: bold");
  console.log("  - Current turn:", currentGameTurn);
  console.log("  - Current phase:", currentGamePhase);
  console.log("  - My slot:", mySlot);
  console.log("  - Is my turn:", currentGameTurn === mySlot);

  // Update turn indicator
  const currentPlayer = gamePlayers.find((p) => p.slot === currentGameTurn);
  if (currentPlayer) {
    turnText.textContent =
      currentPlayer.slot === mySlot
        ? "Your turn!"
        : `${currentPlayer.username}'s turn`;
  }

  // Update player positions
  playerPositions.innerHTML = "";
  gamePlayers.forEach((player) => {
    const posCard = document.createElement("div");
    posCard.classList.add("position-card");
    if (player.slot === currentGameTurn) {
      posCard.classList.add("is-current-turn");
    }
    
    // Ajouter la classe disconnected si le joueur est déconnecté
    if (player.connected === false) {
      posCard.classList.add("disconnected");
    }

    // Get avatar metadata
    const meta = avatarMeta[player.avatar] || { emoji: "🌱", lottie: null };
    const avatarContent = meta.lottie 
      ? `<lottie-player src="${meta.lottie}" background="transparent" speed="1" loop autoplay></lottie-player>`
      : meta.emoji;

    // Indicateur de connexion
    const connectionStatus = player.connected === false 
      ? '<span class="connection-status offline">⚫ Offline</span>'
      : '<span class="connection-status online">🟢 Online</span>';

    posCard.innerHTML = `
      <div class="position-player-number">Player ${player.slot}</div>
      <div class="position-player-avatar">${avatarContent}</div>
      <span class="position-player-name">${player.username}</span>
      ${connectionStatus}
      <span class="position-value">Cell ${player.position}</span>
    `;

    playerPositions.appendChild(posCard);
  });

  // Show appropriate phase
  const isMyTurn = currentGameTurn === mySlot;

  if (!isMyTurn) {
    // Only show "is playing" if it's a new turn
    if (lastDisplayedTurn !== currentGameTurn) {
      lastDisplayedTurn = currentGameTurn;
      waitingText.textContent = `${currentPlayer.username} is playing...`;
    }
    showPhase("waiting");
    return;
  }

  // Reset when it's my turn
  lastDisplayedTurn = null;

  // My turn - show appropriate phase
  console.log(`My turn! Current phase: ${currentGamePhase}`);
  switch (currentGamePhase) {
    case "rolling":
      rollDiceButton.disabled = false;
      showPhase("rolling");
      console.log("Roll dice button enabled");
      break;
    case "moving":
      waitingText.textContent = "Moving...";
      showPhase("waiting");
      break;
    case "waiting":
      waitingText.textContent = "Next turn...";
      showPhase("waiting");
      break;
    case "question":
      answerQuestionButton.disabled = false;
      showPhase("question");
      break;
  }
}

// Card phase DOM elements
const cardTypePhase = document.getElementById("cardTypePhase");
const cardQuizPhase = document.getElementById("cardQuizPhase");
const cardGameTypePhase = document.getElementById("cardGameTypePhase");
const cardGameSoloPhase = document.getElementById("cardGameSoloPhase");
const cardGame1v1Phase = document.getElementById("cardGame1v1Phase");

function showPhase(phaseName) {
  // Hide all phases
  rollingPhase.classList.add("hidden");
  diceAnimation.classList.add("hidden");
  waitingPhase.classList.add("hidden");
  questionPhase.classList.add("hidden");
  if (cardTypePhase) cardTypePhase.classList.add("hidden");
  if (cardQuizPhase) cardQuizPhase.classList.add("hidden");
  if (cardGameTypePhase) cardGameTypePhase.classList.add("hidden");
  if (cardGameSoloPhase) cardGameSoloPhase.classList.add("hidden");
  if (cardGame1v1Phase) cardGame1v1Phase.classList.add("hidden");

  // Show requested phase
  switch (phaseName) {
    case "rolling":
      rollingPhase.classList.remove("hidden");
      break;
    case "dice":
      diceAnimation.classList.remove("hidden");
      break;
    case "waiting":
      waitingPhase.classList.remove("hidden");
      break;
    case "question":
      questionPhase.classList.remove("hidden");
      break;
    case "cardType":
      if (cardTypePhase) cardTypePhase.classList.remove("hidden");
      break;
    case "cardQuiz":
      if (cardQuizPhase) cardQuizPhase.classList.remove("hidden");
      break;
    case "cardGameType":
      if (cardGameTypePhase) cardGameTypePhase.classList.remove("hidden");
      break;
    case "cardGameSolo":
      if (cardGameSoloPhase) cardGameSoloPhase.classList.remove("hidden");
      break;
    case "cardGame1v1":
      if (cardGame1v1Phase) cardGame1v1Phase.classList.remove("hidden");
      break;
  }
}

function showDiceAnimation(data) {
  const { slot, result } = data;
  const isMe = slot === mySlot;
  const player = gamePlayers.find(p => p.slot === slot);
  const playerName = player ? player.username : `Player ${slot}`;
  
  diceResult.textContent = "";
  showPhase("dice");

  setTimeout(() => {
    const message = isMe 
      ? `You rolled a ${result}!` 
      : `${playerName} rolled a ${result}!`;
    
    diceResult.textContent = message;
  }, 1000);
}

function displayQuestion(data) {
  const { totalQuestions, currentIndex, question, options, difficulty } = data;
  
  // Update progress
  questionProgress.textContent = `Question ${currentIndex + 1}/${totalQuestions}`;
  
  // Update difficulty badge
  questionDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  questionDifficulty.className = `difficulty-badge difficulty-${difficulty}`;
  
  // Update question text
  questionText.textContent = question;
  
  // Clear and create option buttons
  questionOptions.innerHTML = "";
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.classList.add("option-button");
    button.textContent = option;
    button.addEventListener("click", () => {
      selectAnswer(index);
    });
    questionOptions.appendChild(button);
  });
  
  // Hide result, show question
  questionResult.classList.add("hidden");
  showPhase("question");
}

function selectAnswer(answerIndex) {
  if (isSpectator) return; // Bloquer les spectateurs
  // Disable all buttons
  const buttons = questionOptions.querySelectorAll(".option-button");
  buttons.forEach(btn => btn.disabled = true);
  
  // Send answer to server
  socket.emit("answerQuestion", { answerIndex });
}

function showQuestionResult(data) {
  const { correct, explanation, currentScore, totalAnswered } = data;
  
  // Update score
  questionScore.textContent = `Score: ${currentScore}/${totalAnswered}`;
  
  // Show result
  resultIcon.textContent = correct ? "✅" : "❌";
  resultText.textContent = correct ? "Correct!" : "Wrong!";
  resultText.style.color = correct ? "#4CAF50" : "#f44336";
  resultExplanation.textContent = explanation;
  
  questionResult.classList.remove("hidden");
}

function showQuestionSessionComplete(data) {
  if (data.playerSlot && data.playerSlot !== mySlot) {
    // Other player finished - affichage instantané
    const player = gamePlayers.find(p => p.slot === data.playerSlot);
    if (player) {
      player.position = data.newPosition;
    }
    
    const message = `🌱 <strong>${data.playerName}</strong> answered ${data.correctCount}/5 correctly.<br>Movement: ${data.actualMovement > 0 ? '+' : ''}${data.actualMovement} cells`;
    waitingText.innerHTML = message;
    showPhase("waiting");
  } else {
    // Current player finished - affichage instantané
    const { correctCount, wrongCount, netMovement, actualMovement, newPosition } = data;
    
    // Update own position immediately
    const player = gamePlayers.find(p => p.slot === mySlot);
    if (player) {
      player.position = newPosition;
    }
    
    let message = `🌱 <strong>Quiz complete!</strong><br><br>`;
    message += `Correct: ${correctCount} (+${correctCount})<br>`;
    message += `Wrong: ${wrongCount} (-${wrongCount})<br>`;
    message += `Net movement: ${netMovement > 0 ? '+' : ''}${netMovement}<br>`;
    
    if (actualMovement !== netMovement) {
      message += `Actual movement: ${actualMovement > 0 ? '+' : ''}${actualMovement} (can't go below 0)<br>`;
    }
    
    message += `<br>New position: Cell ${newPosition}`;
    
    waitingText.innerHTML = message;
    showPhase("waiting");
  }
}


function showCardInput() {
  // Show card type selection modal
  showPhase('cardType');
}

function selectCardType(type) {
  if (isSpectator) return; // Bloquer les spectateurs
  if (type === 'quiz') {
    // Question card
    showPhase('cardQuiz');
  } else if (type === 'game') {
    // Game card
    showPhase('cardGameType');
  }
}

function submitQuizCard() {
  if (isSpectator) return; // Bloquer les spectateurs
  const targetSlot = parseInt(document.getElementById('quizTargetPlayer').value);
  const correct = document.getElementById('quizCorrect').checked;
  
  // Validation: ne peut pas sélectionner son propre numéro
  if (targetSlot === mySlot) {
    alert('You cannot select yourself!');
    return;
  }
  
  // Validation: doit être un numéro valide
  if (isNaN(targetSlot) || targetSlot < 1 || targetSlot > 4) {
    alert('Please enter a valid player number (1-4)');
    return;
  }
  
  // Validation: doit sélectionner une réponse
  if (!document.getElementById('quizCorrect').checked && !document.getElementById('quizWrong').checked) {
    alert('Please select if the answer was correct or wrong');
    return;
  }
  
  // Si l'adversaire répond correctement: adversaire +1, moi -1
  // Si l'adversaire répond faux: moi +1, adversaire -1
  const movements = [
    { slot: mySlot, movement: correct ? -1 : 1 },
    { slot: targetSlot, movement: correct ? 1 : -1 }
  ];
  
  socket.emit('submitCardResult', { movements });
  document.getElementById('quizTargetPlayer').value = '';
  document.getElementById('quizCorrect').checked = false;
  document.getElementById('quizWrong').checked = false;
}

function selectGameType(type) {
  if (isSpectator) return; // Bloquer les spectateurs
  if (type === 'solo') {
    showPhase('cardGameSolo');
  } else if (type === '1v1') {
    showPhase('cardGame1v1');
  }
}

function submitSoloGame(won) {
  if (isSpectator) return; // Bloquer les spectateurs
  const movements = [{ slot: mySlot, movement: won ? 2 : -2 }];
  socket.emit('submitCardResult', { movements });
}

// =====================================
// SAVE GAME & HISTORY
// =====================================

// Handler quand le jeu se termine
socket.on('gameEnded', (gameSummary) => {
  console.log('Game ended:', gameSummary);
  currentGameSummary = gameSummary;
  gameActive = false;
  
  // Cacher le bouton End Game
  endGameButton.classList.add('hidden');
  
  // Arrêter le heartbeat
  stopHeartbeat();
  
  // Remove refresh block
  window.onbeforeunload = null;
  
  // Afficher le modal de sauvegarde (uniquement si terminée normalement)
  if (gameSummary.reason === 'won' || gameSummary.reason === 'manual') {
    showSaveGameModal(gameSummary);
  }
});

function showSaveGameModal(summary) {
  // Générer le résumé de la partie
  const duration = Math.floor(summary.duration / 1000 / 60); // en minutes
  const winner = summary.players.find(p => p.finalPosition >= 45);
  
  let summaryHTML = `
    <p><strong>Duration:</strong> ${duration} minutes</p>
    <p><strong>Total Turns:</strong> ${summary.totalTurns}</p>
    <p><strong>Difficulty:</strong> ${summary.difficulty}</p>
  `;
  
  if (winner) {
    summaryHTML += `<p><strong>🏆 Winner:</strong> ${winner.username}</p>`;
  }
  
  summaryHTML += '<p style="margin-top: 10px;"><strong>Players:</strong></p><ul style="margin-left: 20px;">';
  summary.players.forEach(p => {
    summaryHTML += `<li>${p.username} - Cell ${p.finalPosition}</li>`;
  });
  summaryHTML += '</ul>';
  
  gameSummaryPreview.innerHTML = summaryHTML;
  
  // Si joueur 1 (host) : montrer les contrôles
  const hostControls = document.getElementById('hostControls');
  const waitingForHost = document.getElementById('waitingForHost');
  const saveModalSubtitle = document.getElementById('saveModalSubtitle');
  
  if (mySlot === 1) {
    // Host voit les contrôles
    hostControls.classList.remove('hidden');
    waitingForHost.classList.add('hidden');
    saveModalSubtitle.textContent = 'Would you like to save this game to history?';
    gameNameInput.value = `Game ${new Date().toLocaleDateString()}`;
  } else {
    // Autres joueurs voient le message d'attente
    hostControls.classList.add('hidden');
    waitingForHost.classList.remove('hidden');
    saveModalSubtitle.textContent = 'Game Summary';
  }
  
  saveGameModal.classList.remove('hidden');
}

// Save game button
saveGameBtn.addEventListener('click', () => {
  const gameName = gameNameInput.value.trim();
  
  if (!gameName) {
    alert('Please enter a name for the game!');
    return;
  }
  
  if (!currentGameSummary) {
    alert('No game data to save!');
    return;
  }
  
  socket.emit('saveGameToHistory', {
    gameName: gameName,
    gameSummary: currentGameSummary,
  });
  
  // Le serveur enverra returnToLobby à tous si c'est une fin manuelle
  saveGameModal.classList.add('hidden');
  currentGameSummary = null;
});

// Skip save button
skipSaveBtn.addEventListener('click', () => {
  // Notifier le serveur qu'on a skipé (il enverra returnToLobby à tous)
  if (currentGameSummary && currentGameSummary.reason === 'manual') {
    socket.emit('skipSaveGame');
  }
  
  saveGameModal.classList.add('hidden');
  currentGameSummary = null;
});

// History button
historyButton.addEventListener('click', () => {
  socket.emit('getGameHistory');
  historyModal.classList.remove('hidden');
});

// Close history button
closeHistoryBtn.addEventListener('click', () => {
  historyModal.classList.add('hidden');
});

// RGPD link
openRgpdLink.addEventListener('click', () => {
  rgpdModal.classList.remove('hidden');
});

// Close RGPD modal
closeRgpdBtn.addEventListener('click', () => {
  rgpdModal.classList.add('hidden');
});

// Close RGPD modal on backdrop click
rgpdModal.addEventListener('click', (event) => {
  if (event.target.classList.contains('modal-backdrop')) {
    rgpdModal.classList.add('hidden');
  }
});

// Receive game history
socket.on('gameHistory', (history) => {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No saved games yet.</p>';
    return;
  }
  
  let historyHTML = '';
  
  // Trier par date (plus récent en premier)
  history.sort((a, b) => b.savedAt - a.savedAt);
  
  history.forEach(game => {
    const duration = Math.floor(game.duration / 1000 / 60);
    const date = new Date(game.savedAt).toLocaleString();
    const winner = game.players.find(p => p.finalPosition >= 45);
    
    historyHTML += `
      <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 3px solid #ecf0f1;">
        <h4 style="color: var(--primary); margin-bottom: 8px;">🎮 ${game.name}</h4>
        <p style="font-size: 13px; color: #7f8c8d; margin-bottom: 12px;">📅 ${date}</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
          <p><strong>Duration:</strong> ${duration} min</p>
          <p><strong>Turns:</strong> ${game.totalTurns}</p>
          <p><strong>Difficulty:</strong> ${game.difficulty}</p>
          <p><strong>Players:</strong> ${game.players.length}</p>
        </div>
        ${winner ? `<p style="background: rgba(46, 204, 113, 0.2); padding: 8px; border-radius: 8px;"><strong>🏆 Winner:</strong> ${winner.username}</p>` : ''}
        <details style="margin-top: 12px;">
          <summary style="cursor: pointer; font-weight: 700; color: var(--primary);">View Player Stats</summary>
          <div style="margin-top: 12px;">
            ${game.players.map(p => `
              <div style="background: white; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
                <p style="font-weight: 700; color: var(--dark);">${p.username} - Cell ${p.finalPosition}</p>
                <p style="font-size: 13px;">Dice Rolls: ${p.stats.diceRolls.length} (avg: ${(p.stats.diceRolls.reduce((a, b) => a + b, 0) / p.stats.diceRolls.length || 0).toFixed(1)})</p>
                <p style="font-size: 13px;">Questions: ${p.stats.questionsCorrect}/${p.stats.questionsAnswered} correct</p>
                <p style="font-size: 13px;">Total Movement: ${p.stats.totalMovement} cells</p>
                <p style="font-size: 13px;">Good Luck: ${p.stats.goodLuckHits} | Bad Luck: ${p.stats.badLuckHits}</p>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;
  });
  
  historyList.innerHTML = historyHTML;
});

// =====================================
// GAME FUNCTIONS CONTINUED
// =====================================

function submit1v1Game() {
  if (isSpectator) return; // Bloquer les spectateurs
  const opponentSlot = parseInt(document.getElementById('gameOpponent').value);
  const youWon = document.getElementById('gameWon').checked;
  
  // Validation: ne peut pas sélectionner son propre numéro
  if (opponentSlot === mySlot) {
    alert('You cannot select yourself!');
    return;
  }
  
  // Validation: doit être un numéro valide
  if (isNaN(opponentSlot) || opponentSlot < 1 || opponentSlot > 4) {
    alert('Please enter a valid opponent number (1-4)');
    return;
  }
  
  // Validation: doit sélectionner un résultat
  if (!document.getElementById('gameWon').checked && !document.getElementById('gameLost').checked) {
    alert('Please select if you won or lost');
    return;
  }
  
  const movements = [
    { slot: mySlot, movement: youWon ? 1 : -1 },
    { slot: opponentSlot, movement: youWon ? -1 : 1 }
  ];
  
  socket.emit('submitCardResult', { movements });
  document.getElementById('gameOpponent').value = '';
  document.getElementById('gameWon').checked = false;
  document.getElementById('gameLost').checked = false;
}

