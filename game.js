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
let totalMoney = 0;
let gameMode = 'ai';
let musicEnabled = false;

const eigenschaftLabels = {
  niedlichkeit: "💖 Sweetness",
  staerke: "💪 Strength",
  geschwindigkeit: "⚡ Speed",
  magie: "✨ Magic",
  hunger: "🍪 Hunger"
};

// ── Laden & Starten ──────────────────────────────────────────

function startMode(mode) {
  gameMode = mode;
  document.getElementById("start-screen").style.display = "none";
  closeSettings();
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
  updateLives();
  updateScores();

  if (gameMode === 'pvp') {
    document.querySelector(".player-side .side-label").textContent = "👤 Player 1";
    document.querySelector(".computer-side .side-label").textContent = "👤 Player 2";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "Player 1";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "Player 2";
    document.querySelector(".lives").style.display = "none";
  } else {
    document.querySelector(".player-side .side-label").textContent = "👤 you";
    document.querySelector(".computer-side .side-label").textContent = "💻 computer";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "your cards";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "computer";
    document.querySelector(".lives").style.display = "flex";
  }

  nextRound();
}

// ── Runde vorbereiten ────────────────────────────────────────

function nextRound() {
  roundActive = true;

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
      setMessage("👤 Player 1 — Choose a property!");
    } else {
      // Player 2 dran: linke Karte versteckt, rechte klickbar
      renderHidden("player-card");
      renderCard("computer-card", computerCard, true);
      setMessage("👤 Player 2 — Choose a property!");
    }
  } else {
    renderCard("player-card", playerCard, isPlayerTurn);
    renderHidden("computer-card");
    if (isPlayerTurn) {
      setMessage("Choose a property!");
    } else {
      setMessage("💻 Computer is choosing...");
      setTimeout(computerChoose, 1500);
    }
  }
}

function setMessage(text, cls = "") {
  const el = document.getElementById("result-message");
  el.textContent = text;
  el.className = "result-message" + (cls ? " " + cls : "");
}

// ── Karten rendern ───────────────────────────────────────────

function renderCard(containerId, monster, clickable) {
  document.getElementById(containerId).innerHTML = buildCardHTML(monster, clickable);
}

function renderHidden(containerId) {
  document.getElementById(containerId).innerHTML = `
    <div class="card card--hidden">
      <div class="card__back">
        <div class="card__back-monster">🐙</div>
        <div class="card__back-stars">✨ ⭐ ✨</div>
        <h3 class="card__back-title">Monster Quartet</h3>
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
        <div class="stat-bar"><div class="stat-bar__fill" style="width:${val}%"></div></div>
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
  const bestKey = keys.reduce((a, b) =>
    computerCard.eigenschaften[a] > computerCard.eigenschaften[b] ? a : b
  );
  chooseEigenschaft(bestKey);
}

// ── Spiellogik ───────────────────────────────────────────────

function chooseEigenschaft(key) {
  if (!roundActive) return;
  roundActive = false;

  const playerVal = playerCard.eigenschaften[key];
  const computerVal = computerCard.eigenschaften[key];

  // Beide Karten aufdecken
  renderCard("player-card", playerCard, false);
  renderCard("computer-card", computerCard, false);
  highlightStat(key, playerVal, computerVal);

  playerDeck.shift();
  computerDeck.shift();

  if (playerVal > computerVal) {
    setMessage(
      gameMode === 'pvp'
        ? `🎉 Player 1 wins! ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`
        : `🎉 You win! ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`,
      "result-message--win"
    );
    playerDeck.push(playerCard, computerCard);
  } else if (computerVal > playerVal) {
    setMessage(
      gameMode === 'pvp'
        ? `🎉 Player 2 wins! ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`
        : `😢 Computer wins! You lost a life ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`,
      "result-message--lose"
    );
    computerDeck.push(computerCard, playerCard);
  } else {
    setMessage(`🤝 Draw! Both have ${playerVal}`, "result-message--draw");
    playerDeck.push(playerCard);
    computerDeck.push(computerCard);
  }

  isPlayerTurn = !isPlayerTurn;
  updateScores();

  if (gameMode === 'ai' && playerDeck.length === 0) {
    lives--;
    updateLives();
    if (lives <= 0) { setTimeout(endGame, 800); return; }
    const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
    playerDeck = shuffled.slice(0, 6);
    computerDeck = shuffled.slice(6);
    setMessage(`💔 Life lost! ${lives} lives remaining.`);
  }

  if (computerDeck.length === 0 || playerDeck.length === 0) {
    setTimeout(endGame, 800);
    return;
  }

  document.getElementById("next-btn").style.display = "inline-block";
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
}

function updateLives() {
  document.querySelectorAll(".life").forEach((el, i) => {
    el.classList.toggle("life--lost", i >= lives);
  });
}

function endGame() {
  const overlay = document.getElementById("end-overlay");
  if (gameMode === 'pvp') {
    const p1wins = computerDeck.length === 0;
    document.getElementById("end-title").textContent = p1wins ? "🏆 Player 1 wins!" : "🏆 Player 2 wins!";
    document.getElementById("end-sub").textContent = "Great game!";
  } else {
    const isWin = computerDeck.length === 0 && lives > 0;
    if (isWin) {
      totalMoney += 100;
      document.getElementById("wallet-amount").textContent = `$${totalMoney}`;
      document.getElementById("end-title").textContent = "🏆 You won!";
      document.getElementById("end-sub").textContent = `+$100 added! Total: $${totalMoney}`;
    } else {
      document.getElementById("end-title").textContent = "💻 Computer wins!";
      document.getElementById("end-sub").textContent = "No lives left. Try again!";
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

window.addEventListener("DOMContentLoaded", loadMonsters);