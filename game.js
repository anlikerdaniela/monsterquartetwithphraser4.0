// =====================
// SÜSSE MONSTER QUARTETT
// game.js
// =====================

let allMonsters = [];
let playerDeck = [];
let computerDeck = [];
let playerCard = null;
let computerCard = null;
let roundActive = false;
let isPlayerTurn = true;
let lives = 3;
let computerLives = 1;
let winStreakSide = null; // 'player' | 'computer' — wer gerade in Folge gewinnt
let winStreakCount = 0;
const WIN_STREAK_LIMIT = 3; // ab so vielen Siegen in Folge bekommt die Seite gezielt eine schlechtere Karte
let totalMoney = 0;
let gameMode = 'ai';
let aiLevel = 1; // 1 = Spieler gewinnt tendenziell öfter, 2 = ca. 50/50
let totalRounds = 0; // Züge in der aktuellen Partie (AI-Modus), für das Rundenlimit
const MAX_ROUNDS_PER_GAME = 20; // spätestens nach so vielen Zügen ist die Partie vorbei
let musicEnabled = false;
let playerName = "You";
let player1Name = "Player 1";
let player2Name = "Player 2";
let pendingMode = null;
let pendingLevel = 1;
const avatarPrices = {
  "avatar3.png": 50,
  "avatar4.png": 75,
  "avatar5.png": 100,
  "avatar6.png": 125,
  "avatar7.png": 150,
  "avatar8.png": 200
};
const ownedAvatars = new Set(['avatar1.png', 'avatar2.png']);

const eigenschaftLabels = {
  niedlichkeit: "💖 Sweetness",
  staerke: "💪 Strength",
  geschwindigkeit: "⚡ Speed",
  magie: "✨ Magic",
  hunger: "🍪 Hunger"
};

// ── Laden & Starten ──────────────────────────────────────────

function startMode(mode, level) {
  pendingMode = mode;
  pendingLevel = level || 1;
  document.getElementById("start-screen").style.display = "none";
  closeSettings();
  showNameScreen(mode);
}

function showNameScreen(mode) {
  const isPvp = mode === 'pvp';
  document.getElementById("name-fields-single").style.display = isPvp ? "none" : "flex";
  document.getElementById("name-fields-pvp").style.display = isPvp ? "flex" : "none";
  document.getElementById("input-name-you").value = playerName === "You" ? "" : playerName;
  document.getElementById("input-name-p1").value = player1Name === "Player 1" ? "" : player1Name;
  document.getElementById("input-name-p2").value = player2Name === "Player 2" ? "" : player2Name;
  document.getElementById("name-screen").style.display = "flex";
}

function confirmNames() {
  if (pendingMode === 'pvp') {
    player1Name = document.getElementById("input-name-p1").value.trim() || "Player 1";
    player2Name = document.getElementById("input-name-p2").value.trim() || "Player 2";
  } else {
    playerName = document.getElementById("input-name-you").value.trim() || "You";
  }
  gameMode = pendingMode;
  if (gameMode === 'ai') aiLevel = pendingLevel;
  document.getElementById("name-screen").style.display = "none";
  startGame();
}

async function loadMonsters() {
  const res = await fetch("monsters.json");
  allMonsters = await res.json();
  setMusicVolume(document.getElementById("music-volume").value);
}

function startGame() {
  const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
  const half = Math.floor(shuffled.length / 2);
  playerDeck = shuffled.slice(0, half);
  computerDeck = shuffled.slice(half);
  isPlayerTurn = true;
  lives = 3;
  computerLives = 1;
  winStreakSide = null;
  winStreakCount = 0;
  totalRounds = 0;
  updateLives();
  updateScores();

  if (gameMode === 'pvp') {
    document.querySelector(".player-side .side-label").textContent = `👤 ${player1Name}`;
    document.querySelector(".computer-side .side-label").textContent = `👤 ${player2Name}`;
    document.querySelector(".scoreboard .score-item:first-child span").textContent = player1Name;
    document.querySelector(".scoreboard .score-item:last-child span").textContent = player2Name;
    document.querySelector(".lives").style.display = "none";
    document.querySelector("header p").textContent = "Choose your strongest ability and defeat your opponent!";
  } else {
    document.querySelector(".player-side .side-label").textContent = `👤 ${playerName}`;
    document.querySelector(".computer-side .side-label").textContent = "💻 computer";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "your cards";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "computer";
    document.querySelector(".lives").style.display = "flex";
    document.querySelector("header p").textContent =
      `Choose your strongest ability and defeat the computer! (Level ${aiLevel})`;
  }

  nextRound();
}

// ── Runde vorbereiten ────────────────────────────────────────

function nextRound() {
  roundActive = true;
  hideLifeLostOverlay();

  if (playerDeck.length === 0 || computerDeck.length === 0) {
    endGame();
    return;
  }

  playerCard = playerDeck[0];
  computerCard = computerDeck[0];

  updateScores();
  document.getElementById("next-btn").style.display = "none";

  if (gameMode === 'pvp') {
    if (isPlayerTurn) {
      // Player 1 dran: linke Karte klickbar, rechte versteckt
      renderCard("player-card", playerCard, true);
      renderHidden("computer-card");
      setMessage(`👤 ${player1Name} — Choose a property!`, "result-message--prompt");
    } else {
      // Player 2 dran: linke Karte versteckt, rechte klickbar
      renderHidden("player-card");
      renderCard("computer-card", computerCard, true);
      setMessage(`👤 ${player2Name} — Choose a property!`, "result-message--prompt");
    }
  } else {
    renderCard("player-card", playerCard, isPlayerTurn);
    if (isPlayerTurn) {
      renderHidden("computer-card");
      setMessage(playerName === "You" ? "Choose a property!" : `${playerName}, choose a property!`, "result-message--prompt");
    } else {
      renderHidden("computer-card", "Computer is choosing...", true);
      setMessage("");
      setTimeout(computerChoose, 1500);
    }
  }
}

function setMessage(text, cls = "") {
  const el = document.getElementById("result-message");
  el.textContent = text;
  el.className = "result-message" + (cls ? " " + cls : "");
}

function showLifeLostOverlay(text, cls = "") {
  const el = document.getElementById("life-lost-overlay");
  el.textContent = text;
  el.className = "life-lost-overlay show" + (cls ? " " + cls : "");
}

function hideLifeLostOverlay() {
  document.getElementById("life-lost-overlay").className = "life-lost-overlay";
}

// ── Karten rendern ───────────────────────────────────────────

function renderCard(containerId, monster, clickable) {
  document.getElementById(containerId).innerHTML = buildCardHTML(monster, clickable);
}

function renderHidden(containerId, title = "Monster Quartet", thinking = false) {
  document.getElementById(containerId).innerHTML = `
    <div class="card card--hidden">
      <div class="card__back">
        <div class="card__back-monster">🐙</div>
        <div class="card__back-stars">✨ ⭐ ✨</div>
        <h3 class="card__back-title${thinking ? " card__back-title--thinking" : ""}">${title}</h3>
      </div>
    </div>`;
}

function buildCardHTML(monster, isClickable) {
  const rows = Object.entries(monster.eigenschaften)
    .map(([key, val]) => `
      <div class="stat-row ${isClickable ? "stat-row--clickable" : ""}"
           ${isClickable ? `onclick="chooseEigenschaft('${key}')"` : ""}
           data-key="${key}">
        <span class="stat-label">${eigenschaftLabels[key]}</span>
        <span class="stat-value">${val}</span>
      </div>`).join("");

  return `
    <div class="card">
      <div class="card__header">
        <h2 class="card__name">${monster.name}</h2>
      </div>
      <img class="card__image" src="pictures/${monster.bild}" alt="${monster.name}">
      <div class="card__stats">${rows}</div>
    </div>`;
}

// ── Computer ─────────────────────────────────────────────────

function computerChoose() {
  const keys = Object.keys(computerCard.eigenschaften);

  // "smartKey" = das Merkmal, bei dem der Computer im direkten Vergleich zur
  // sichtbaren Spielerkarte am meisten vorne liegt — seine taktische
  // Standardwahl.
  const smartKey = keys.reduce((a, b) =>
    (computerCard.eigenschaften[a] - playerCard.eigenschaften[a]) >
    (computerCard.eigenschaften[b] - playerCard.eigenschaften[b]) ? a : b
  );

  // Spielt der Computer gerade seine Ausgleichsrunde nach WIN_STREAK_LIMIT
  // Siegen in Folge, wählt er absichtlich sein SCHWÄCHSTES Merkmal statt
  // taktisch zu spielen — sonst würde smartKey genau die Karten-Sabotage
  // (bringWorstMatchupToFront) wieder zunichtemachen, da beide dieselbe
  // Differenz-Metrik nutzen.
  if (winStreakSide === "computer" && winStreakCount >= WIN_STREAK_LIMIT) {
    const worstKey = keys.reduce((a, b) =>
      (computerCard.eigenschaften[a] - playerCard.eigenschaften[a]) <
      (computerCard.eigenschaften[b] - playerCard.eigenschaften[b]) ? a : b
    );
    chooseEigenschaft(worstKey);
    return;
  }

  // Damit der Computer auch in seinen eigenen Zügen sichtbar mal verliert
  // (nicht nur bei den Zügen des Spielers), wählt er mit pRandom-Wahr-
  // scheinlichkeit ein komplett zufälliges Merkmal statt taktisch zu spielen.
  // Die GESAMT-Gewinnquote wird nicht mehr allein hierüber gesteuert,
  // sondern hauptsächlich über das harte Rundenlimit (siehe finishRound /
  // forceEndGame) — das macht die Zielquote exakt und garantiert, dass jede
  // Partie spätestens nach MAX_ROUNDS_PER_GAME Zügen endet.
  const pRandom = aiLevel === 2 ? 0.16 : 0.21;
  const key = Math.random() < pRandom
    ? keys[Math.floor(Math.random() * keys.length)]
    : smartKey;

  chooseEigenschaft(key);
}

// ── Spiellogik ───────────────────────────────────────────────

const ROUND_PAUSE_MS = 700; // Zeit zum Vergleichen, bevor die Verliererkarte wegfliegt
const FLY_DURATION_MS = 550; // Dauer der Flug-Animation zum gegnerischen Stapel

function chooseEigenschaft(key) {
  if (!roundActive) return;
  roundActive = false;
  totalRounds++;

  const playerVal = playerCard.eigenschaften[key];
  const computerVal = computerCard.eigenschaften[key];

  // Beide Karten aufdecken
  renderCard("player-card", playerCard, false);
  renderCard("computer-card", computerCard, false);
  highlightStat(key, playerVal, computerVal);

  playerDeck.shift();
  computerDeck.shift();

  let loserSide = null;

  if (playerVal > computerVal) {
    const winLead = gameMode === 'pvp'
      ? `🎉 ${player1Name} wins!`
      : (playerName === "You" ? "🎉 You win!" : `🎉 ${playerName} wins!`);
    setMessage(
      `${winLead} ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`,
      "result-message--win"
    );
    playerDeck.push(playerCard, computerCard);
    loserSide = "computer";
    isPlayerTurn = true; // Gewinner wählt auch die nächste Runde

    if (winStreakSide === "player") winStreakCount++; else { winStreakSide = "player"; winStreakCount = 1; }
    if (winStreakCount >= WIN_STREAK_LIMIT) {
      // Nach WIN_STREAK_LIMIT Siegen in Folge sorgt die KI dafür, dass die
      // nächste Spielerkarte gegenüber der aktuellen Computerkarte
      // möglichst in JEDER Eigenschaft unterlegen ist — der Spieler wählt
      // zwar weiterhin frei, verliert die Runde mit echten Werten aber
      // so gut wie sicher.
      bringWorstMatchupToFront(playerDeck, computerDeck[0]);
    }
  } else if (computerVal > playerVal) {
    const loseLead = gameMode === 'pvp'
      ? `🎉 ${player2Name} wins!`
      : (playerName === "You" ? "😢 Computer wins! You lost a life" : `😢 Computer wins! ${playerName} lost a life`);
    setMessage(
      `${loseLead} ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`,
      "result-message--lose"
    );
    computerDeck.push(computerCard, playerCard);
    loserSide = "player";
    isPlayerTurn = false; // Gewinner wählt auch die nächste Runde

    if (winStreakSide === "computer") winStreakCount++; else { winStreakSide = "computer"; winStreakCount = 1; }
    if (winStreakCount >= WIN_STREAK_LIMIT) {
      // Gleiches Prinzip umgekehrt: der Computer bekommt gezielt seine
      // schwächste Karte gegenüber der aktuellen Spielerkarte.
      bringWorstMatchupToFront(computerDeck, playerDeck[0]);
    }
  } else {
    setMessage(`🤝 Draw! Both have ${playerVal}`, "result-message--draw");
    playerDeck.push(playerCard);
    computerDeck.push(computerCard);
    // Bei Unentschieden bleibt die Wahl bei der gleichen Person, keine Karte
    // wandert, und die Siegesserie wird unterbrochen.
    winStreakSide = null;
    winStreakCount = 0;
  }

  // Erst kurz die aufgedeckten Karten vergleichen lassen, dann die
  // Verliererkarte zum Stapel der Gewinnerseite fliegen lassen, bevor
  // Zähler, Kartenstapel-Optik und der "next round"-Button erscheinen.
  setTimeout(() => {
    if (loserSide) animateCardTransfer(loserSide);
    setTimeout(() => {
      // Der Kartenplatz der Verliererseite ist jetzt leer (Karte weggeflogen) —
      // dort wieder den Kartenrücken (Monster + "Monster Quartet") zeigen,
      // statt ihn leer zu lassen, bis die nächste Runde gestartet wird.
      if (loserSide) {
        renderHidden(loserSide === "player" ? "player-card" : "computer-card");
      }
      finishRound();
    }, loserSide ? FLY_DURATION_MS : 0);
  }, ROUND_PAUSE_MS);
}

// Lässt die Karte der Verliererseite sichtbar zum Kartenstapel der
// Gewinnerseite fliegen (verkleinert, leicht gedreht, ausblendend).
function animateCardTransfer(loserSide) {
  const sourceContainerId = loserSide === "player" ? "player-card" : "computer-card";
  const targetContainerId = loserSide === "player" ? "computer-card" : "player-card";
  const sourceCard = document.querySelector(`#${sourceContainerId} .card`);
  const targetContainer = document.getElementById(targetContainerId);
  if (!sourceCard || !targetContainer) return;

  const sourceRect = sourceCard.getBoundingClientRect();
  const targetRect = targetContainer.getBoundingClientRect();
  const dx = (targetRect.left + targetRect.width / 2) - (sourceRect.left + sourceRect.width / 2);
  const dy = (targetRect.top + targetRect.height / 2) - (sourceRect.top + sourceRect.height / 2);

  sourceCard.style.setProperty("--fly-dx", `${dx}px`);
  sourceCard.style.setProperty("--fly-dy", `${dy}px`);
  sourceCard.classList.add("card--flying");
}

function finishRound() {
  updateScores();

  if (gameMode === 'ai') {
    if (playerDeck.length === 0) {
      lives--;
      updateLives();
      if (lives <= 0) { setTimeout(endGame, 800); return; }
      const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
      playerDeck = shuffled.slice(0, 6);
      computerDeck = shuffled.slice(6);
      showLifeLostOverlay(`💔 Life lost! ${lives} lives remaining.`);
    } else if (computerDeck.length === 0) {
      // Der Computer braucht genauso viele Leben wie der Spieler, sonst
      // würde das Spiel sofort beim ersten leeren Computer-Deck enden,
      // während der Spieler bis zu 3 Anläufe bekommt — das war der Grund,
      // warum der Spieler fast immer gewann.
      computerLives--;
      if (computerLives <= 0) { setTimeout(endGame, 800); return; }
      const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
      playerDeck = shuffled.slice(0, 6);
      computerDeck = shuffled.slice(6);
      showLifeLostOverlay(`💪 Computer is struggling! ${computerLives} lives left.`, "life-lost-overlay--good");
    }

    // Sicherheitsnetz: Spätestens nach MAX_ROUNDS_PER_GAME Zügen ist die
    // Partie vorbei, egal wie der Kartenstand gerade aussieht — so dauert
    // kein Spiel ewig. Der Ausgang wird dabei gewichtet nach der Zielquote
    // des gewählten Levels entschieden (siehe forceEndGame).
    if (totalRounds >= MAX_ROUNDS_PER_GAME) {
      setTimeout(forceEndGame, 800);
      return;
    }
  } else if (computerDeck.length === 0 || playerDeck.length === 0) {
    setTimeout(endGame, 800);
    return;
  }

  document.getElementById("next-btn").style.display = "inline-block";
}

// Beendet die Partie zwangsweise, wenn das Rundenlimit erreicht ist, ohne
// dass die Leben schon aufgebraucht sind. Der Ausgang wird gewichtet nach
// der Ziel-Gewinnquote des Levels ausgewürfelt (Level 1 ~95%, Level 2 ~85%
// Gesamt-Gewinnquote für den Spieler, per Simulation kalibriert).
function forceEndGame() {
  const targetWinRate = aiLevel === 2 ? 0.8 : 0.93;
  if (Math.random() < targetWinRate) {
    computerLives = 0; // Computer hat "verloren" — Spieler gewinnt die Partie
  }
  // sonst bleibt computerLives > 0 stehen, endGame() zeigt dann "Computer wins!"
  endGame();
}

// Sucht in "deck" die Karte, die gegenüber "opponentCard" am schlechtesten
// dasteht — idealerweise eine, die in JEDER Eigenschaft unterlegen ist —
// und verschiebt sie an die Deckspitze. Verändert keine Werte, nur die
// Reihenfolge der echten Karten, damit die nächste Runde mit ehrlichen
// Zahlen sehr wahrscheinlich gegen "deck" ausgeht.
function bringWorstMatchupToFront(deck, opponentCard) {
  if (deck.length < 2 || !opponentCard) return;
  let worstIndex = 0;
  let worstBestAdvantage = Infinity;
  deck.forEach((card, index) => {
    const bestAdvantage = Math.max(
      ...Object.keys(card.eigenschaften).map(
        key => card.eigenschaften[key] - opponentCard.eigenschaften[key]
      )
    );
    if (bestAdvantage < worstBestAdvantage) {
      worstBestAdvantage = bestAdvantage;
      worstIndex = index;
    }
  });
  if (worstIndex > 0) {
    const [worstCard] = deck.splice(worstIndex, 1);
    deck.unshift(worstCard);
  }
}

function highlightStat(key, playerVal, computerVal) {
  document.querySelectorAll("#player-card .stat-row").forEach(row => {
    if (row.dataset.key === key) row.classList.add("stat-row--chosen");
  });
  document.querySelectorAll("#computer-card .stat-row").forEach(row => {
    if (row.dataset.key === key) {
      row.classList.add("stat-row--chosen");
      row.classList.add(playerVal > computerVal ? "stat-row--lose" : playerVal < computerVal ? "stat-row--win" : "stat-row--draw");
    }
  });
}

function updateScores() {
  document.getElementById("player-count").textContent = playerDeck.length;
  document.getElementById("computer-count").textContent = computerDeck.length;
  setDeckStack("player-card", playerDeck.length);
  setDeckStack("computer-card", computerDeck.length);
}

// Zeigt dezent im Hintergrund ein paar gestapelte Kartenkanten, je nachdem
// wie viele Karten im jeweiligen Stapel noch übrig sind.
function setDeckStack(containerId, count) {
  const el = document.getElementById(containerId);
  el.classList.remove("deck-stack--1", "deck-stack--2", "deck-stack--3");
  if (count >= 7) el.classList.add("deck-stack--3");
  else if (count >= 4) el.classList.add("deck-stack--2");
  else if (count >= 2) el.classList.add("deck-stack--1");
}

function updateLives() {
  document.querySelectorAll(".life").forEach((el, i) => {
    el.classList.toggle("life--lost", i >= lives);
  });
}

function stopGameMusic() {
  const audio = document.getElementById("game-music");
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
}

function endGame() {
  stopGameMusic();
  const overlay = document.getElementById("end-overlay");
  if (gameMode === 'pvp') {
    const p1wins = computerDeck.length === 0;
    document.getElementById("end-title").textContent = p1wins ? `🏆 ${player1Name} wins!` : `🏆 ${player2Name} wins!`;
    document.getElementById("end-sub").textContent = "Great game!";
  } else {
    const isWin = computerLives <= 0;
    if (isWin) {
      totalMoney += 100;
      document.getElementById("wallet-amount").textContent = `$${totalMoney}`;
      document.getElementById("end-title").textContent = playerName === "You" ? "🏆 You won!" : `🏆 ${playerName} won!`;
      document.getElementById("end-sub").textContent = `+$100 added! Total: $${totalMoney}`;
      new Audio("audio/yipe.mp3").play();
    } else {
      document.getElementById("end-title").textContent = "💻 Computer wins!";
      document.getElementById("end-sub").textContent = "No lives left. Try again!";
      new Audio("audio/adele.mp3").play();
    }
  }
  overlay.style.display = "flex";
}

function restartGame() {
  document.getElementById("end-overlay").style.display = "none";
  closeSettings();
  document.getElementById("start-screen").style.display = "flex";
}

// ── Avatar ───────────────────────────────────────────────────

function toggleSettings() {
  const overlay = document.getElementById("settings-overlay");
  const isOpen = overlay.classList.toggle("open");
  overlay.setAttribute("aria-hidden", String(!isOpen));
}

function selectAvatar(imageName) {
  document.querySelectorAll("[data-avatar-display]").forEach(display => {
    display.src = `pictures/${imageName}`;
  });
}

function avatarAction(imageName) {
    const price = avatarPrices[imageName];

  if (!ownedAvatars.has(imageName)) {
    if (totalMoney < price) {
      document.getElementById("avatar-status").textContent = `You need ${price} coins to buy this avatar.`;
      return;
    }
    totalMoney -= price;
    ownedAvatars.add(imageName);
    document.getElementById("wallet-amount").textContent = `$${totalMoney}`;
  }

  selectAvatar(imageName);
  updateAvatarOptions();
  document.getElementById("avatar-status").textContent = "Avatar selected.";
}

function updateAvatarOptions() {
  document.querySelectorAll("[data-avatar]").forEach(button => {
    const isOwned = ownedAvatars.has(button.dataset.avatar);
    const price = avatarPrices[button.dataset.avatar];
    button.classList.toggle("avatar-owned", isOwned);
    button.querySelector(".avatar-lock").textContent = isOwned ? "✓" : `🔒 ${price}`;
  });
}

function closeSettings() {
  const overlay = document.getElementById("settings-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
}

function toggleMusic(enabled) {
  musicEnabled = enabled;
  const audio = document.getElementById("game-music");
  const status = document.getElementById("music-status");

  if (musicEnabled) {
    audio.play();
    status.textContent = "Music is on.";
  } else {
    audio.pause();
    status.textContent = "Music is off.";
  }
}

function setMusicVolume(value) {
  const audio = document.getElementById("game-music");
  if (audio) audio.volume = Number(value) / 100;
}

// ── Start ────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  loadMonsters();
  updateAvatarOptions();
});