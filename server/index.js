// server/index.js

// Load environment variables first
require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const validator = require("validator");

const app = express();
const server = http.createServer(app);

// -------------------------
// Security Configuration
// -------------------------

// Helmet for security headers - DÉSACTIVÉ pour permettre l'accès réseau local
// app.use(helmet());

// CORS configuration - Permissif pour développement local
app.use(cors());

// Socket.IO with CORS - Permissif pour développement
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Rate limiting DÉSACTIVÉ pour développement
// const limiter = rateLimit({...});
// app.use(limiter);

// Compression middleware
app.use(compression());

// Serve static files
app.use(express.static("public", {
  maxAge: '0', // No caching during development
  etag: false,
  setHeaders: (res, path) => {
    // Force no cache for CSS files
    if (path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Load questions database
let questionsDB = { questions: [] };
try {
  const questionsPath = path.join(__dirname, "questions.json");
  const questionsData = fs.readFileSync(questionsPath, "utf8");
  questionsDB = JSON.parse(questionsData);
  console.log(`Loaded ${questionsDB.questions.length} questions from database`);
} catch (error) {
  console.error("Error loading questions database:", error);
}

// -------------------------
// Waiting room state
// -------------------------

/**
 * waitingRoom = [
 *   {
 *     socketId: string,
 *     username: string,
 *     avatar: string,
 *     slot: number,
 *     joinedAt: number
 *   }
 * ]
 */
let waitingRoom = [];

// -------------------------
// Game state
// -------------------------

// Cell type distribution (total 45 cells)
const QUESTION_CELLS = [5, 12, 19, 26, 33, 40];      // 6 cells - Quiz questions (5 questions)
const BAD_LUCK_CELLS = [3, 10, 17, 24, 31, 38];      // 6 cells - Malchance (negative events only)
const GOOD_LUCK_CELLS = [7, 14, 21, 28, 35, 42];     // 6 cells - Chance (positive events only)
const CARD_CELLS = [9, 16, 23, 30, 37, 44];          // 6 cells - Single card question (+2/-2)
const TOTAL_CELLS = 45;

let gameState = {
  active: false,
  currentTurn: 1, // slot number
  phase: 'rolling', // 'rolling', 'moving', 'question', 'card', 'waiting'
  players: [], // { slot, socketId, username, avatar, position, connected: true, lastHeartbeat: timestamp, stats: {...} }
  questionSession: null, // { playerSlot, questions: [], answers: [], currentIndex: 0, score: 0 }
  cardInProgress: null, // { playerSlot }
  difficulty: 'mixed', // 'easy', 'medium', 'hard', 'easy-medium', 'medium-hard', 'easy-hard', 'mixed'
  startedAt: null, // Timestamp de début de partie
  lastActivityAt: null, // Timestamp de dernière activité
  totalTurns: 0, // Nombre total de tours
};

// Heartbeat timeout (5 secondes)
const HEARTBEAT_TIMEOUT = 5000;
// Timeout d'inactivité totale (10 minutes)
const TOTAL_INACTIVITY_TIMEOUT = 10 * 60 * 1000;

// -------------------------
// Validation functions
// -------------------------

const ALLOWED_AVATARS = [
  'avatarCat',
  'avatarPanda',
  'avatarOwl',
  'avatarDog',
  'avatarEmoji',
  'avatarSnake'
];

function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') {
    return null;
  }
  
  // Remove any HTML/script tags
  const cleaned = validator.escape(username.trim());
  
  // Check length (3-20 characters)
  if (cleaned.length < 3 || cleaned.length > 20) {
    return null;
  }
  
  // Only allow alphanumeric + spaces + common punctuation
  if (!/^[a-zA-Z0-9\s._-]+$/.test(cleaned)) {
    return null;
  }
  
  return cleaned;
}

function validateAvatar(avatar) {
  return avatar && ALLOWED_AVATARS.includes(avatar);
}

function sanitizeGameName(gameName) {
  if (!gameName || typeof gameName !== 'string') {
    return null;
  }
  
  const cleaned = validator.escape(gameName.trim());
  
  // Check length (3-50 characters)
  if (cleaned.length < 3 || cleaned.length > 50) {
    return null;
  }
  
  return cleaned;
}

function validateSlot(slot) {
  const maxPlayers = parseInt(process.env.MAX_PLAYERS) || 4;
  return Number.isInteger(slot) && slot >= 1 && slot <= maxPlayers;
}

// -------------------------
// Helper functions
// -------------------------

function getNextAvailableSlot() {
  const usedSlots = waitingRoom.map((p) => p.slot).sort((a, b) => a - b);
  let slot = 1;
  for (const used of usedSlots) {
    if (used === slot) {
      slot++;
    } else if (used > slot) {
      break;
    }
  }
  return slot;
}

function reindexSlots() {
  waitingRoom.sort((a, b) => a.slot - b.slot);
  waitingRoom.forEach((player, index) => {
    const newSlot = index + 1;
    if (player.slot !== newSlot) {
      player.slot = newSlot;
      // Notify the player of their new slot
      io.to(player.socketId).emit("slotReassigned", {
        slot: player.slot,
      });
    }
  });
}

function broadcastWaitingRoomState() {
  const payload = {
    players: waitingRoom
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({
        slot: p.slot,
        username: p.username,
        avatar: p.avatar,
      })),
    playerCount: waitingRoom.length,
  };

  io.emit("waitingRoomState", payload);
}

function getCellType(position) {
  if (QUESTION_CELLS.includes(position)) return 'question';
  if (BAD_LUCK_CELLS.includes(position)) return 'badluck';
  if (GOOD_LUCK_CELLS.includes(position)) return 'goodluck';
  if (CARD_CELLS.includes(position)) return 'card';
  return 'normal';
}

// Weighted dice roll: 1-6 but 6 is less frequent
function rollWeightedDice() {
  // Probabilities: 1=20%, 2=20%, 3=20%, 4=20%, 5=15%, 6=5%
  const rand = Math.random() * 100;
  if (rand < 20) return 1;
  if (rand < 40) return 2;
  if (rand < 60) return 3;
  if (rand < 80) return 4;
  if (rand < 95) return 5;
  return 6;
}

// Good luck is always +2
function getGoodLuckEvent() {
  return { type: 'forward', value: 2, message: '🍀 Good luck! +2 cells' };
}

// Bad luck is always -2
function getBadLuckEvent() {
  return { type: 'backward', value: 2, message: '⚠️ Bad luck! -2 cells' };
}

function getPlayerBySlot(slot) {
  return gameState.players.find(p => p.slot === slot);
}

function getPlayerBySocketId(socketId) {
  return gameState.players.find(p => p.socketId === socketId);
}

function nextTurn() {
  const sortedPlayers = gameState.players.slice().sort((a, b) => a.slot - b.slot);
  const currentIndex = sortedPlayers.findIndex(p => p.slot === gameState.currentTurn);
  const nextIndex = (currentIndex + 1) % sortedPlayers.length;
  gameState.currentTurn = sortedPlayers[nextIndex].slot;
  gameState.phase = 'rolling';
  gameState.totalTurns++;
  gameState.lastActivityAt = Date.now();
}

function endGame(reason = 'won') {
  if (!gameState.active) return;
  
  console.log(`Game ending. Reason: ${reason}`);
  
  // Calculer la durée de la partie
  const duration = Date.now() - gameState.startedAt;
  
  // Créer le résumé de la partie
  const gameSummary = {
    startedAt: gameState.startedAt,
    endedAt: Date.now(),
    duration: duration,
    totalTurns: gameState.totalTurns,
    difficulty: gameState.difficulty,
    reason: reason, // 'won', 'inactivity', 'manual'
    players: gameState.players.map(p => ({
      slot: p.slot,
      username: p.username,
      avatar: p.avatar,
      finalPosition: p.position,
      stats: p.stats,
    })),
  };
  
  // Envoyer le résumé aux clients
  io.emit('gameEnded', gameSummary);
  
  // Si fin manuelle, préparer le retour au lobby (mais attendre que les joueurs ferment le modal)
  if (reason === 'manual') {
    // Remettre les joueurs dans le waiting room
    waitingRoom = gameState.players.map(p => ({
      socketId: p.socketId,
      username: p.username,
      avatar: p.avatar,
      slot: p.slot,
      joinedAt: Date.now(),
    }));
    
    // Le returnToLobby sera envoyé après que les joueurs ferment le modal (voir gameEnded handler côté client)
  }
  
  // Réinitialiser l'état du jeu
  gameState.active = false;
  gameState.players = [];
  gameState.startedAt = null;
  gameState.lastActivityAt = null;
  gameState.totalTurns = 0;
}

function broadcastGameState() {
  const payload = {
    active: gameState.active,
    currentTurn: gameState.currentTurn,
    phase: gameState.phase,
    players: gameState.players.map(p => ({
      slot: p.slot,
      username: p.username,
      avatar: p.avatar,
      position: p.position,
      connected: p.connected !== false, // true par défaut
    })),
  };
  io.emit("gameStateUpdate", payload);
}

function getRandomQuestions(count = 5) {
  // Filtrer les questions selon la difficulté sélectionnée
  let filteredQuestions = [];
  
  switch (gameState.difficulty) {
    case 'easy':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'easy');
      break;
    case 'medium':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'medium');
      break;
    case 'hard':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'hard');
      break;
    case 'easy-medium':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium');
      break;
    case 'medium-hard':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'medium' || q.difficulty === 'hard');
      break;
    case 'easy-hard':
      filteredQuestions = questionsDB.questions.filter(q => q.difficulty === 'easy' || q.difficulty === 'hard');
      break;
    case 'mixed':
    default:
      filteredQuestions = [...questionsDB.questions];
      break;
  }
  
  // Sélectionner aléatoirement parmi les questions filtrées
  const selected = [];
  const available = [...filteredQuestions];
  
  for (let i = 0; i < count && available.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  
  console.log(`Selected ${selected.length} questions with difficulty: ${gameState.difficulty}`);
  return selected;
}

// -------------------------
// Socket.IO handlers
// -------------------------

// Vérifier les heartbeats toutes les 2 secondes
setInterval(() => {
  if (!gameState.active) return;
  
  const now = Date.now();
  let stateChanged = false;
  
  // Vérifier les heartbeats individuels
  gameState.players.forEach(player => {
    if (player.connected && player.lastHeartbeat) {
      const timeSinceLastHeartbeat = now - player.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        console.log(`Player ${player.username} (slot ${player.slot}) timed out (${timeSinceLastHeartbeat}ms since last heartbeat)`);
        player.connected = false;
        stateChanged = true;
      }
    }
  });
  
  // Vérifier si tous les joueurs sont déconnectés
  const allDisconnected = gameState.players.every(p => !p.connected);
  
  if (allDisconnected && gameState.lastActivityAt) {
    const timeSinceActivity = now - gameState.lastActivityAt;
    
    if (timeSinceActivity > TOTAL_INACTIVITY_TIMEOUT) {
      console.log('All players disconnected for 10+ minutes. Ending game.');
      endGame('inactivity');
      return;
    }
  } else if (!allDisconnected) {
    // Au moins un joueur connecté, mettre à jour lastActivityAt
    gameState.lastActivityAt = now;
  }
  
  if (stateChanged) {
    broadcastGameState();
  }
}, 2000); // Vérification toutes les 2 secondes

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Check if there's an active game and reconnect player
  if (gameState.active) {
    socket.emit("gameStarted", { startedAt: Date.now() });
    // Envoyer l'état du jeu immédiatement au joueur qui se reconnecte
    socket.emit("gameStateUpdate", {
      active: gameState.active,
      currentTurn: gameState.currentTurn,
      phase: gameState.phase,
      players: gameState.players.map(p => ({
        slot: p.slot,
        username: p.username,
        avatar: p.avatar,
        position: p.position,
        connected: p.connected !== false,
      })),
    });
  }

  // Player explicitly joins the waiting room
  socket.on("joinWaitingRoom", (data = {}) => {
    // Check if game is active, if so find existing player by username
    if (gameState.active && data.username) {
      const existingPlayer = gameState.players.find(
        p => p.username === data.username.trim()
      );
      
      if (existingPlayer) {
        // Reconnect existing player - IMPORTANT: mettre à jour le socketId
        console.log(`Player ${existingPlayer.username} reconnecting with new socket ID: ${socket.id}`);
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true; // Marquer comme reconnecté
        existingPlayer.lastHeartbeat = Date.now(); // Réinitialiser heartbeat
        
        socket.emit("playerAssigned", {
          slot: existingPlayer.slot,
          username: existingPlayer.username,
          avatar: existingPlayer.avatar,
        });
        
        // Send them to game screen
        socket.emit("gameStarted", { startedAt: Date.now() });
        
        // Broadcast l'état du jeu à TOUS pour synchroniser
        broadcastGameState();
        
        // Si c'est le tour du joueur et qu'il y a une question en cours
        if (gameState.questionSession && gameState.questionSession.playerSlot === existingPlayer.slot) {
          const session = gameState.questionSession;
          if (session.currentIndex < session.questions.length) {
            const currentQuestion = session.questions[session.currentIndex];
            setTimeout(() => {
              socket.emit("questionStart", {
                totalQuestions: 5,
                currentIndex: session.currentIndex,
                question: currentQuestion.question,
                options: currentQuestion.options,
                difficulty: currentQuestion.difficulty
              });
            }, 500);
          }
        }
        
        // Si c'est le tour du joueur et qu'il est en phase de carte
        if (gameState.cardInProgress && gameState.cardInProgress.playerSlot === existingPlayer.slot) {
          setTimeout(() => {
            socket.emit("physicalCard", {
              slot: existingPlayer.slot,
              playerName: existingPlayer.username
            });
          }, 500);
        }
        
        return;
      } else {
        // Nouveau joueur essaie de rejoindre pendant une partie en cours → Mode spectateur
        console.log(`New player trying to join during active game. Enabling spectator mode for ${socket.id}`);
        
        let username = typeof data.username === "string" ? data.username.trim() : "";
        if (!username) {
          username = `Spectator`;
        }
        username = username.slice(0, 20);
        
        // Assigner comme spectateur
        socket.emit("spectatorMode", {
          username: username,
          message: "A game is currently in progress. You are in spectator mode."
        });
        
        // Envoyer l'état du jeu actuel
        socket.emit("gameStarted", { startedAt: gameState.startedAt });
        socket.emit("gameStateUpdate", {
          active: gameState.active,
          currentTurn: gameState.currentTurn,
          phase: gameState.phase,
          players: gameState.players.map(p => ({
            slot: p.slot,
            username: p.username,
            avatar: p.avatar,
            position: p.position,
            connected: p.connected !== false,
          })),
        });
        
        return;
      }
    }
    
    // If already in waiting room, ignore (or update)
    if (waitingRoom.some((p) => p.socketId === socket.id)) {
      return;
    }

    const slot = getNextAvailableSlot();

    let username =
      typeof data.username === "string" ? data.username.trim() : "";
    if (!username) {
      username = `Player ${slot}`;
    }
    username = username.slice(0, 20); // max length 20 chars

    const avatar =
      typeof data.avatar === "string" && data.avatar.trim()
        ? data.avatar.trim()
        : "avatarCat";

    const newPlayer = {
      socketId: socket.id,
      username,
      avatar,
      slot,
      joinedAt: Date.now(),
    };

    waitingRoom.push(newPlayer);

    // Tell this client who they are
    socket.emit("playerAssigned", {
      slot: newPlayer.slot,
      username: newPlayer.username,
      avatar: newPlayer.avatar,
    });

    // Notify everyone
    broadcastWaitingRoomState();
  });

  // Update username / avatar while in waiting room
  socket.on("updateProfile", (data = {}) => {
    const player = waitingRoom.find((p) => p.socketId === socket.id);
    if (!player) return; // not in the waiting room yet

    const { username, avatar } = data;

    if (typeof username === "string" && username.trim() !== "") {
      player.username = username.trim().slice(0, 20);
    }

    if (typeof avatar === "string" && avatar.trim() !== "") {
      player.avatar = avatar.trim();
    }

    broadcastWaitingRoomState();
  });

  // Start game (only Player 1 + at least 2 players)
  socket.on("startGame", (data = {}) => {
    const player = waitingRoom.find((p) => p.socketId === socket.id);
    if (!player) return;

    if (player.slot !== 1) {
      socket.emit("errorMessage", {
        message: "Only Player 1 can start the game.",
      });
      return;
    }

    if (waitingRoom.length < 2) {
      socket.emit("errorMessage", {
        message: "At least 2 players are required to start.",
      });
      return;
    }

    // Définir la difficulté des questions
    const difficulty = data.difficulty || 'mixed';
    gameState.difficulty = difficulty;
    console.log(`Game started by Player 1 with difficulty: ${difficulty}`);
    
    // Initialize game state
    gameState.active = true;
    gameState.currentTurn = 1;
    gameState.phase = 'rolling';
    gameState.startedAt = Date.now();
    gameState.lastActivityAt = Date.now();
    gameState.totalTurns = 0;
    gameState.players = waitingRoom.map(p => ({
      slot: p.slot,
      socketId: p.socketId,
      username: p.username,
      avatar: p.avatar,
      position: 0, // starting position
      connected: true, // tous connectés au départ
      lastHeartbeat: Date.now(),
      stats: {
        diceRolls: [],
        questionsAnswered: 0,
        questionsCorrect: 0,
        cardsPlayed: 0,
        totalMovement: 0,
        goodLuckHits: 0,
        badLuckHits: 0,
      },
    }));
    
    io.emit("gameStarted", { startedAt: Date.now() });
    broadcastGameState();
  });

  // Dice roll
  socket.on("rollDice", () => {
    if (!gameState.active) {
      console.log("Cannot roll dice: game not active");
      return;
    }
    
    const player = getPlayerBySocketId(socket.id);
    if (!player) {
      console.log(`Cannot roll dice: player not found for socket ${socket.id}`);
      console.log("Current players:", gameState.players.map(p => ({ slot: p.slot, username: p.username, socketId: p.socketId })));
      return;
    }
    
    if (player.slot !== gameState.currentTurn) {
      socket.emit("errorMessage", { message: "It's not your turn!" });
      return;
    }
    
    if (gameState.phase !== 'rolling') {
      socket.emit("errorMessage", { message: "Cannot roll dice now." });
      return;
    }
    
    const diceResult = rollWeightedDice();
    const oldPosition = player.position;
    player.position = Math.min(player.position + diceResult, TOTAL_CELLS);
    
    // Tracker le lancer de dé
    player.stats.diceRolls.push(diceResult);
    player.stats.totalMovement += (player.position - oldPosition);
    gameState.lastActivityAt = Date.now();
    
    gameState.phase = 'moving';
    
    io.emit("diceRolled", {
      slot: player.slot,
      result: diceResult,
      newPosition: player.position,
    });
    
    // Check for win condition
    if (player.position >= TOTAL_CELLS) {
      io.emit("gameWon", {
        winner: {
          slot: player.slot,
          username: player.username,
          avatar: player.avatar,
        },
      });
      endGame('won');
      return;
    }
    
    // Check cell type
    const cellType = getCellType(player.position);
    
    // Délai de 2.5 secondes pour que les joueurs voient le résultat du dé
    setTimeout(() => {
      if (cellType === 'normal') {
        gameState.phase = 'waiting';
        broadcastGameState();
        
        setTimeout(() => {
          nextTurn();
          broadcastGameState();
        }, 2000);
      } else if (cellType === 'goodluck') {
        gameState.phase = 'goodluck';
        const luckEvent = getGoodLuckEvent();
        
        const oldPosition = player.position;
        player.position = Math.min(player.position + luckEvent.value, TOTAL_CELLS);
        const actualMovement = player.position - oldPosition;
        
        // Tracker good luck
        player.stats.goodLuckHits++;
        player.stats.totalMovement += actualMovement;
        
        io.emit("luckEvent", {
          slot: player.slot,
          type: 'good',
          event: luckEvent,
          oldPosition: oldPosition,
          newPosition: player.position,
          actualMovement: actualMovement
        });
        
        if (player.position >= TOTAL_CELLS) {
          io.emit("gameWon", {
            winner: {
              slot: player.slot,
              username: player.username,
              avatar: player.avatar,
            },
          });
          endGame('won');
          return;
        }
        
        broadcastGameState();
        
        setTimeout(() => {
          nextTurn();
          broadcastGameState();
        }, 3000);
      } else if (cellType === 'badluck') {
        gameState.phase = 'badluck';
        const luckEvent = getBadLuckEvent();
        
        const oldPosition = player.position;
        player.position = Math.max(player.position - luckEvent.value, 0);
        const actualMovement = player.position - oldPosition;
        
        // Tracker bad luck
        player.stats.badLuckHits++;
        player.stats.totalMovement += actualMovement;
        
        io.emit("luckEvent", {
          slot: player.slot,
          type: 'bad',
          event: luckEvent,
          oldPosition: oldPosition,
          newPosition: player.position,
          actualMovement: actualMovement
        });
        
        broadcastGameState();
        
        setTimeout(() => {
          nextTurn();
          broadcastGameState();
        }, 3000);
      } else if (cellType === 'card') {
        // Physical card cell - player picks a card manually
        gameState.phase = 'card';
        gameState.cardInProgress = {
          playerSlot: player.slot
        };
        
        broadcastGameState();
        
        // Notify all players that current player must pick a physical card
        io.emit("physicalCard", {
          slot: player.slot,
          playerName: player.username
        });
      } else if (cellType === 'question') {
        gameState.phase = 'question';
        
        // Initialize question session
        const questions = getRandomQuestions(5);
        gameState.questionSession = {
          playerSlot: player.slot,
          questions: questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options,
            difficulty: q.difficulty,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          })),
          answers: [],
          currentIndex: 0,
          score: 0
        };
        
        broadcastGameState();
        
        // Envoyer la première question directement au joueur
        const currentQuestion = gameState.questionSession.questions[0];
        io.to(player.socketId).emit("questionStart", {
          totalQuestions: 5,
          currentIndex: 0,
          question: currentQuestion.question,
          options: currentQuestion.options,
          difficulty: currentQuestion.difficulty
        });
      }
    }, 2500); // 2.5 secondes pour voir le résultat du dé
  });
  
  // Answer question
  socket.on("answerQuestion", (data) => {
    if (!gameState.active || gameState.phase !== 'question') return;
    if (!gameState.questionSession) return;
    
    const player = getPlayerBySocketId(socket.id);
    if (!player || player.slot !== gameState.currentTurn) return;
    
    const { answerIndex } = data;
    const session = gameState.questionSession;
    const currentQuestion = session.questions[session.currentIndex];
    
    // Check if answer is correct
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    if (isCorrect) {
      session.score++;
      player.stats.questionsCorrect++;
    }
    player.stats.questionsAnswered++;
    
    session.answers.push({
      questionId: currentQuestion.id,
      answerIndex,
      correct: isCorrect
    });
    
    // Send result back to player
    io.to(player.socketId).emit("questionResult", {
      correct: isCorrect,
      explanation: currentQuestion.explanation,
      currentScore: session.score,
      totalAnswered: session.answers.length
    });
    
    // Move to next question or finish
    session.currentIndex++;
    
    if (session.currentIndex < session.questions.length) {
      // Send next question after a delay
      setTimeout(() => {
        const nextQuestion = session.questions[session.currentIndex];
        io.to(player.socketId).emit("questionStart", {
          totalQuestions: 5,
          currentIndex: session.currentIndex,
          question: nextQuestion.question,
          options: nextQuestion.options,
          difficulty: nextQuestion.difficulty
        });
      }, 2500);
    } else {
      // All questions answered
      const correctCount = session.score;
      const wrongCount = 5 - correctCount;
      
      // Each correct = +1, each wrong = -1
      const netMovement = correctCount - wrongCount;
      
      // Apply movement (can't go below 0)
      const oldPosition = player.position;
      player.position = Math.max(0, Math.min(player.position + netMovement, TOTAL_CELLS));
      const actualMovement = player.position - oldPosition;
      
      io.to(player.socketId).emit("questionSessionComplete", {
        correctCount: correctCount,
        wrongCount: wrongCount,
        netMovement: netMovement,
        actualMovement: actualMovement,
        newPosition: player.position
      });
      
      // Notify other players
      const otherPlayers = gameState.players.filter(p => p.slot !== player.slot);
      otherPlayers.forEach(p => {
        io.to(p.socketId).emit("questionSessionComplete", {
          correctCount: correctCount,
          wrongCount: wrongCount,
          netMovement: netMovement,
          actualMovement: actualMovement,
          playerSlot: player.slot,
          playerName: player.username,
          newPosition: player.position
        });
      });
      
      // Check win condition
      if (player.position >= TOTAL_CELLS) {
        io.emit("gameWon", {
          winner: {
            slot: player.slot,
            username: player.username,
            avatar: player.avatar,
          },
        });
        endGame('won');
        return;
      }
      
      // Clear session and move to next turn
      gameState.questionSession = null;
      
      setTimeout(() => {
        nextTurn();
        broadcastGameState();
      }, 3000);
    }
  });
  
  // Manual card result entry
  socket.on("submitCardResult", (data) => {
    if (!gameState.active || gameState.phase !== 'card') return;
    if (!gameState.cardInProgress) return;
    
    const player = getPlayerBySocketId(socket.id);
    if (!player || player.slot !== gameState.currentTurn) return;
    
    const { movements } = data;
    // movements = array of { slot: X, movement: +/-N }
    
    movements.forEach(mov => {
      const targetPlayer = getPlayerBySlot(mov.slot);
      if (targetPlayer) {
        const oldPos = targetPlayer.position;
        targetPlayer.position = Math.max(0, Math.min(targetPlayer.position + mov.movement, TOTAL_CELLS));
        
        // Check win
        if (targetPlayer.position >= TOTAL_CELLS) {
          gameState.active = false;
          io.emit("gameWon", {
            winner: {
              slot: targetPlayer.slot,
              username: targetPlayer.username,
              avatar: targetPlayer.avatar,
            },
          });
        }
      }
    });
    
    // Broadcast result
    io.emit("cardResultApplied", {
      movements: movements,
      players: gameState.players.map(p => ({
        slot: p.slot,
        position: p.position
      }))
    });
    
    gameState.cardInProgress = null;
    
    if (gameState.active) {
      setTimeout(() => {
        nextTurn();
        broadcastGameState();
      }, 2000);
    }
  });

  // End game manually (Player 1 only)
  socket.on("endGameManually", () => {
    if (!gameState.active) return;
    
    const player = gameState.players.find(p => p.socketId === socket.id);
    if (!player || player.slot !== 1) {
      socket.emit("errorMessage", { message: "Only Player 1 can end the game." });
      return;
    }
    
    console.log(`Game ended manually by Player 1 (${player.username})`);
    endGame('manual');
  });
  
  // Save game to history
  socket.on("saveGameToHistory", (data) => {
    const { gameName, gameSummary } = data;
    
    if (!gameName || !gameSummary) {
      socket.emit("errorMessage", { message: "Invalid game data." });
      return;
    }
    
    try {
      // Lire l'historique existant
      let history = [];
      const historyPath = path.join(__dirname, "game_history.json");
      
      if (fs.existsSync(historyPath)) {
        const historyData = fs.readFileSync(historyPath, "utf8");
        history = JSON.parse(historyData);
      }
      
      // Ajouter la nouvelle partie
      const gameEntry = {
        id: Date.now(), // ID unique
        name: gameName.trim().slice(0, 50), // Limité à 50 caractères
        savedAt: Date.now(),
        ...gameSummary,
      };
      
      history.push(gameEntry);
      
      // Sauvegarder
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      
      console.log(`Game "${gameName}" saved to history`);
      socket.emit("gameSaved", { success: true, gameName });
      
      // Si c'était une fin manuelle, tous les joueurs retournent au lobby
      if (gameSummary.reason === 'manual' && waitingRoom.length > 0) {
        // Broadcaster returnToLobby à TOUS les joueurs
        io.emit('returnToLobby');
        
        // Puis broadcaster l'état du waiting room
        setTimeout(() => {
          broadcastWaitingRoomState();
        }, 500);
      }
      
    } catch (error) {
      console.error("Error saving game:", error);
      socket.emit("errorMessage", { message: "Failed to save game." });
    }
  });
  
  // Skip save (for manual end game)
  socket.on("skipSaveGame", () => {
    console.log('Player skipped saving game');
    
    // Si le waiting room a été préparé (fin manuelle), tous les joueurs retournent au lobby
    if (waitingRoom.length > 0) {
      // Broadcaster returnToLobby à TOUS les joueurs
      io.emit('returnToLobby');
      
      // Puis broadcaster l'état du waiting room
      setTimeout(() => {
        broadcastWaitingRoomState();
      }, 500);
    }
  });
  
  // Get game history
  socket.on("getGameHistory", () => {
    try {
      const historyPath = path.join(__dirname, "game_history.json");
      
      if (fs.existsSync(historyPath)) {
        const historyData = fs.readFileSync(historyPath, "utf8");
        const history = JSON.parse(historyData);
        socket.emit("gameHistory", history);
      } else {
        socket.emit("gameHistory", []);
      }
    } catch (error) {
      console.error("Error loading game history:", error);
      socket.emit("gameHistory", []);
    }
  });

  // Heartbeat handler
  socket.on("heartbeat", () => {
    if (!gameState.active) return;
    
    const player = gameState.players.find(p => p.socketId === socket.id);
    if (player) {
      player.lastHeartbeat = Date.now();
      player.connected = true;
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Si en waiting room
    const idx = waitingRoom.findIndex((p) => p.socketId === socket.id);
    if (idx !== -1) {
      waitingRoom.splice(idx, 1);
      reindexSlots();
      broadcastWaitingRoomState();
    }
    
    // Si en jeu, marquer le joueur comme déconnecté
    if (gameState.active) {
      const player = gameState.players.find(p => p.socketId === socket.id);
      if (player) {
        console.log(`Player ${player.username} (slot ${player.slot}) disconnected during game`);
        player.connected = false;
        // Broadcast pour mettre à jour l'état de connexion
        broadcastGameState();
      }
    }
  });
});

// -------------------------
// Start HTTP server
// -------------------------

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Écouter sur toutes les interfaces

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`Network access: http://192.168.1.14:${PORT}`);
});
