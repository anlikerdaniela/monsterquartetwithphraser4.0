// =====================
// SÜSSE MONSTER QUARTETT
// game.js
// =====================

// ── Testumgebung ─────────────────────────────────────────────
// Mit "?test" in der URL: kleines Deck, viel Spielgeld, kürzere
// Wartezeiten und ein Debug-Panel zum gezielten Auslösen von Screens.
// Kartenanzahl per "&cards=3" einstellbar (Standard 4, Minimum 2).
// Beispiel: index.html?test&cards=3
const urlParams = new URLSearchParams(location.search);
const TEST_MODE = urlParams.has('test');
const TEST_CARD_COUNT = Math.max(2, parseInt(urlParams.get('cards'), 10) || 4);

let allMonsters = [];
let playerDeck = [];
let computerDeck = [];
let playerCard = null;
let computerCard = null;
let roundActive = false;
let isPlayerTurn = true;
const MAX_LIVES = 3;
const LIFE_PRICE = 300;
let lives = MAX_LIVES;
let computerLives = 1;
let winStreakSide = null; // 'player' | 'computer' — wer gerade in Folge gewinnt
let winStreakCount = 0;
const WIN_STREAK_LIMIT = 3; // ab so vielen Siegen in Folge bekommt die Seite gezielt eine schlechtere Karte
let totalMoney = TEST_MODE ? 999 : 0;
let gameMode = 'ai';
let aiLevel = 1; // 1 = Spieler gewinnt tendenziell öfter, 2 = ca. 50/50
let totalRounds = 0; // Züge in der aktuellen Partie (AI-Modus), für das Rundenlimit
const MAX_ROUNDS_PER_GAME = TEST_MODE ? 4 : 20; // spätestens nach so vielen Zügen ist die Partie vorbei
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
  if (TEST_MODE) allMonsters = allMonsters.slice(0, TEST_CARD_COUNT);
  setMusicVolume(document.getElementById("music-volume").value);
}

// Aktualisiert jede Geldanzeige auf der Seite (Header + Startbildschirm).
function updateWallet() {
  document.querySelectorAll(".wallet-amount").forEach(el => { el.textContent = `$${totalMoney}`; });
}

// Testmodus-Extras: Debug-Panel einblenden.
function initTestMode() {
  if (!TEST_MODE) return;
  const panel = document.getElementById("debug-panel");
  if (panel) panel.style.display = "flex";
  console.info(`Test mode: ${TEST_CARD_COUNT} cards, $${totalMoney} starting money.`);
}

function startGame() {
  const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
  const half = Math.floor(shuffled.length / 2);
  playerDeck = shuffled.slice(0, half);
  computerDeck = shuffled.slice(half);
  isPlayerTurn = true;
  lives = MAX_LIVES;
  computerLives = 1;
  winStreakSide = null;
  winStreakCount = 0;
  totalRounds = 0;
  updateLives();
  updateScores();

  if (gameMode === 'pvp') {
    document.querySelector(".player-side .side-label").textContent = player1Name;
    document.querySelector(".computer-side .side-label").textContent = player2Name;
    document.querySelector(".scoreboard .score-item:first-child span").textContent = player1Name;
    document.querySelector(".scoreboard .score-item:last-child span").textContent = player2Name;
    document.querySelector(".lives").style.display = "none";
    document.querySelector("header p").textContent = "Choose your strongest ability and defeat your opponent!";
  } else {
    document.querySelector(".player-side .side-label").textContent = playerName;
    document.querySelector(".computer-side .side-label").textContent = "Computer";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "your cards";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "Computer";
    document.querySelector(".lives").style.display = "flex";
    document.querySelector("header p").textContent =
      `Choose your strongest ability and defeat the computer! (Level ${aiLevel})`;
  }

  scheduleSnakeSurprise();
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
      setMessage(`${player1Name} — Choose a property!`, "result-message--prompt");
    } else {
      // Player 2 dran: linke Karte versteckt, rechte klickbar
      renderHidden("player-card");
      renderCard("computer-card", computerCard, true);
      setMessage(`${player2Name} — Choose a property!`, "result-message--prompt");
    }
  } else {
    renderCard("player-card", playerCard, isPlayerTurn);
    if (isPlayerTurn) {
      renderHidden("computer-card");
      setMessage(playerName === "You" ? "Choose a property!" : `${playerName}, choose a property!`, "result-message--prompt");
    } else {
      renderHidden("computer-card", "Computer is choosing...", true);
      setMessage("");
      setTimeout(computerChoose, TEST_MODE ? 300 : 1500);
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

const ROUND_PAUSE_MS = TEST_MODE ? 150 : 700; // Zeit zum Vergleichen, bevor die Verliererkarte wegfliegt
const FLY_DURATION_MS = TEST_MODE ? 150 : 550; // Dauer der Flug-Animation zum gegnerischen Stapel

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
      const half = Math.floor(shuffled.length / 2);
      playerDeck = shuffled.slice(0, half);
      computerDeck = shuffled.slice(half);
      showLifeLostOverlay(`💔 Life lost! ${lives} lives remaining.`);
    } else if (computerDeck.length === 0) {
      // Der Computer braucht genauso viele Leben wie der Spieler, sonst
      // würde das Spiel sofort beim ersten leeren Computer-Deck enden,
      // während der Spieler bis zu 3 Anläufe bekommt — das war der Grund,
      // warum der Spieler fast immer gewann.
      computerLives--;
      if (computerLives <= 0) { setTimeout(endGame, 800); return; }
      const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
      const half = Math.floor(shuffled.length / 2);
      playerDeck = shuffled.slice(0, half);
      computerDeck = shuffled.slice(half);
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

// Ein noch laufender Sieg-/Niederlage-Sound wird gestoppt, bevor der nächste
// startet — sonst überlagern sich beide, wenn kurz hintereinander mehrere
// Partien enden (z.B. im Testmodus über die Force-Win/-Lose-Buttons).
let endGameSound = null;
function playEndSound(src) {
  if (endGameSound) { endGameSound.pause(); endGameSound.currentTime = 0; }
  endGameSound = new Audio(src);
  endGameSound.play();
}

function endGame() {
  stopGameMusic();
  if (snakeMoveTimeout) endSnakeGame(); // schliesst das Popup und plant (kurz) neu
  stopSnakeSurprises(); // ...das wird hier sofort wieder verworfen
  const overlay = document.getElementById("end-overlay");
  if (gameMode === 'pvp') {
    const p1wins = computerDeck.length === 0;
    document.getElementById("end-title").textContent = p1wins ? `🏆 ${player1Name} wins!` : `🏆 ${player2Name} wins!`;
    document.getElementById("end-sub").textContent = "Great game!";
  } else {
    const isWin = computerLives <= 0;
    if (isWin) {
      totalMoney += 100;
      updateWallet();
      document.getElementById("end-title").textContent = playerName === "You" ? "🏆 You won!" : `🏆 ${playerName} won!`;
      document.getElementById("end-sub").textContent = `+$100 added! Total: $${totalMoney}`;
      playEndSound("audio/yipe.mp3");
    } else {
      document.getElementById("end-title").textContent = "💻 Computer wins!";
      document.getElementById("end-sub").textContent = "No lives left. Try again!";
      playEndSound("audio/adele.mp3");
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
    updateWallet();
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

function buyLife() {
  const status = document.getElementById("lives-status");
  if (gameMode === 'pvp') {
    status.textContent = "Lives aren't used in Two Players mode.";
    return;
  }
  if (lives >= MAX_LIVES) {
    status.textContent = "You already have full lives.";
    return;
  }
  if (totalMoney < LIFE_PRICE) {
    status.textContent = `You need $${LIFE_PRICE} to buy a life.`;
    return;
  }
  totalMoney -= LIFE_PRICE;
  lives++;
  updateLives();
  updateWallet();
  status.textContent = "❤️ Life purchased!";
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

// ── Snake Bonus-Minispiel ───────────────────────────────────
// Taucht während einer laufenden Partie zufällig für ein paar Sekunden auf.

const SNAKE_GRID = 12;
const SNAKE_CELL = 20; // Canvas 240x240 / 12 Felder
const SNAKE_DURATION_MS = 10000;
const SNAKE_TICK_START_MS = 260; // ganz langsamer Start
const SNAKE_TICK_MIN_MS = 110; // schneller Endwert
const SNAKE_TICK_STEP_MS = 14; // wird pro gefressenem Stück etwas schneller
const SNAKE_KEY_DIRS = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 }
};

let snakeSurpriseTimeout = null;
let snakeMoveTimeout = null;
let snakeCountdownInterval = null;
let snakeEndTimeout = null;
let snakeBody = [];
let snakeDir = { x: 1, y: 0 };
let snakeNextDir = { x: 1, y: 0 };
let snakeFood = { x: 0, y: 0 };
let snakeScore = 0;
let snakeTickMs = SNAKE_TICK_START_MS;
let snakeKeyHandler = null;

// Von Tastatur-Handler und den Pfeil-Buttons (Handy-Steuerung) gemeinsam
// genutzt: verhindert das direkte Umkehren in die Gegenrichtung.
function setSnakeDirection(next) {
  if (!next) return;
  if (next.x === -snakeDir.x && next.y === -snakeDir.y) return;
  snakeNextDir = next;
}

// Für die Pfeil-Buttons im Snake-Popup (Handy-Steuerung ohne Tastatur).
function snakePressDir(dir) {
  setSnakeDirection(SNAKE_KEY_DIRS[{ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }[dir]]);
}

function scheduleSnakeSurprise() {
  clearTimeout(snakeSurpriseTimeout);
  const delay = 20000 + Math.random() * 25000; // nach 20–45s
  snakeSurpriseTimeout = setTimeout(trySnakeSurprise, delay);
}

function stopSnakeSurprises() {
  clearTimeout(snakeSurpriseTimeout);
  snakeSurpriseTimeout = null;
}

// Zeigt das Popup nur, wenn gerade wirklich eine Partie läuft (nicht auf
// Start-/Namens-/End-/Settings-Screens) — sonst einfach kurz später erneut versuchen.
function trySnakeSurprise() {
  const isPlaying =
    document.getElementById("start-screen").style.display === "none" &&
    document.getElementById("name-screen").style.display !== "flex" &&
    document.getElementById("end-overlay").style.display !== "flex" &&
    !document.getElementById("settings-overlay").classList.contains("open");

  if (!isPlaying) {
    snakeSurpriseTimeout = setTimeout(trySnakeSurprise, 5000);
    return;
  }
  showSnakeGame();
}

// timed=true: Überraschungs-Popup während der Partie, schliesst nach
// SNAKE_DURATION_MS automatisch. timed=false: manuell über den "Play Snake"-
// Button vom Startbildschirm gestartet, läuft unbegrenzt bis zum "x".
function showSnakeGame(timed = true) {
  const overlay = document.getElementById("snake-overlay");
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  resetSnakeBody();
  snakeScore = 0;
  snakeTickMs = SNAKE_TICK_START_MS;
  document.getElementById("snake-score").textContent = "0";
  placeSnakeFood();
  drawSnake();

  snakeKeyHandler = (e) => {
    const next = SNAKE_KEY_DIRS[e.key];
    if (!next) return;
    e.preventDefault();
    setSnakeDirection(next);
  };
  window.addEventListener("keydown", snakeKeyHandler);

  scheduleSnakeTick();

  const timerEl = document.getElementById("snake-timer");
  if (timed) {
    let remaining = Math.round(SNAKE_DURATION_MS / 1000);
    timerEl.textContent = `${remaining}s`;
    snakeCountdownInterval = setInterval(() => {
      remaining--;
      timerEl.textContent = `${Math.max(remaining, 0)}s`;
    }, 1000);
    snakeEndTimeout = setTimeout(endSnakeGame, SNAKE_DURATION_MS);
  } else {
    timerEl.textContent = "";
  }
}

function resetSnakeBody() {
  const mid = Math.floor(SNAKE_GRID / 2);
  snakeBody = [{ x: mid - 1, y: mid }, { x: mid - 2, y: mid }, { x: mid - 3, y: mid }];
  snakeDir = { x: 1, y: 0 };
  snakeNextDir = { x: 1, y: 0 };
}

// Statt festem setInterval plant jeder Tick den nächsten selbst neu, damit
// sich snakeTickMs (Geschwindigkeit) zwischendurch ändern kann.
function scheduleSnakeTick() {
  snakeMoveTimeout = setTimeout(() => {
    stepSnake();
    scheduleSnakeTick();
  }, snakeTickMs);
}

function placeSnakeFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * SNAKE_GRID), y: Math.floor(Math.random() * SNAKE_GRID) };
  } while (snakeBody.some(seg => seg.x === pos.x && seg.y === pos.y));
  snakeFood = pos;
}

function stepSnake() {
  snakeDir = snakeNextDir;
  const head = {
    x: (snakeBody[0].x + snakeDir.x + SNAKE_GRID) % SNAKE_GRID,
    y: (snakeBody[0].y + snakeDir.y + SNAKE_GRID) % SNAKE_GRID
  };

  // Bei Selbstkollision startet die Schlange freundlich neu, statt die
  // kurze Bonuszeit mit einem Game Over zu verschenken.
  if (snakeBody.some(seg => seg.x === head.x && seg.y === head.y)) {
    resetSnakeBody();
    drawSnake();
    return;
  }

  snakeBody.unshift(head);
  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore++;
    document.getElementById("snake-score").textContent = String(snakeScore);
    snakeTickMs = Math.max(SNAKE_TICK_MIN_MS, snakeTickMs - SNAKE_TICK_STEP_MS);
    placeSnakeFood();
  } else {
    snakeBody.pop();
  }

  drawSnake();
}

function drawSnake() {
  const canvas = document.getElementById("snake-canvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff6eb4";
  ctx.fillRect(snakeFood.x * SNAKE_CELL + 3, snakeFood.y * SNAKE_CELL + 3, SNAKE_CELL - 6, SNAKE_CELL - 6);

  snakeBody.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#34d399" : "#6ee7b7";
    ctx.fillRect(seg.x * SNAKE_CELL + 1, seg.y * SNAKE_CELL + 1, SNAKE_CELL - 2, SNAKE_CELL - 2);
  });
}

function endSnakeGame() {
  clearTimeout(snakeMoveTimeout);
  clearInterval(snakeCountdownInterval);
  clearTimeout(snakeEndTimeout);
  snakeMoveTimeout = null;
  snakeCountdownInterval = null;
  snakeEndTimeout = null;
  if (snakeKeyHandler) {
    window.removeEventListener("keydown", snakeKeyHandler);
    snakeKeyHandler = null;
  }

  const overlay = document.getElementById("snake-overlay");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");

  if (snakeScore > 0) {
    totalMoney += snakeScore;
    updateWallet();
  }

  scheduleSnakeSurprise();
}

// ── Debug-Panel (nur im Testmodus) ──────────────────────────

function debugAddMoney(amount) {
  totalMoney += amount;
  updateWallet();
}

function debugLoseLife() {
  if (lives <= 0) return;
  lives--;
  updateLives();
  if (lives <= 0) setTimeout(endGame, 300);
}

function debugForceWin() {
  if (gameMode === 'pvp') computerDeck = []; else computerLives = 0;
  endGame();
}

function debugForceLose() {
  if (gameMode === 'pvp') playerDeck = []; else lives = 0;
  endGame();
}

function debugShowLifeLostOverlay() {
  showLifeLostOverlay("💔 Life lost! (test)");
}

// ── Start ────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  loadMonsters();
  updateAvatarOptions();
  updateWallet();
  initTestMode();
});