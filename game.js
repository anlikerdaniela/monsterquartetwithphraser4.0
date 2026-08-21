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


const eigenschaftLabels = {
  niedlichkeit: "💖 Sweetness",
  staerke: "💪 Strength",
  geschwindigkeit: "⚡ Speed",
  magie: "✨ Magic",
  hunger: "🍪 Hunger"
};

// ── Laden & Starten ──────────────────────────────────────────

async function loadMonsters() {
  const res = await fetch("monsters.json");
  allMonsters = await res.json();
  startGame();
}

function startGame() {
  const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
  const half = Math.floor(shuffled.length / 2);
  playerDeck = shuffled.slice(0, half);
  computerDeck = shuffled.slice(half);

  updateScores();
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

  renderPlayerCard();
  renderComputerCard(true); // versteckt
  updateScores();

  document.getElementById("result-message").textContent = "Choose a property!";
  document.getElementById("result-message").className = "result-message";
  document.getElementById("next-btn").style.display = "none";
}

// ── Karten rendern ───────────────────────────────────────────

function renderPlayerCard() {
  const container = document.getElementById("player-card");
  container.innerHTML = buildCardHTML(playerCard, true);
}

function renderComputerCard(hidden = false) {
  const container = document.getElementById("computer-card");
  if (hidden) {
    container.innerHTML = `
      <div class="card card--hidden">
        <div class="card__back">
          <span>🎴</span>
          <p>Monster verborgen</p>
        </div>
      </div>`;
  } else {
    container.innerHTML = buildCardHTML(computerCard, false);
  }
}

function buildCardHTML(monster, isPlayer) {
  const rows = Object.entries(monster.eigenschaften)
    .map(([key, val]) => `
      <div class="stat-row ${isPlayer ? "stat-row--clickable" : ""}" 
           ${isPlayer ? `onclick="chooseEigenschaft('${key}')"` : ""}
           data-key="${key}">
        <span class="stat-label">${eigenschaftLabels[key]}</span>
        <span class="stat-value">${val}</span>
        <div class="stat-bar"><div class="stat-bar__fill" style="width:${val}%"></div></div>
      </div>`)
    .join("");

  return `
    <div class="card">
      <div class="card__header">
        <span class="card__emoji">${monster.emoji}</span>
        <h2 class="card__name">${monster.name}</h2>
      </div>
      <div class="card__stats">${rows}</div>
    </div>`;
}

// ── Spiellogik ───────────────────────────────────────────────

function chooseEigenschaft(key) {
  if (!roundActive) return;
  roundActive = false;

  const playerVal = playerCard.eigenschaften[key];
  const computerVal = computerCard.eigenschaften[key];

  // Computerkarte aufdecken
  renderComputerCard(false);

  // Gewählte Eigenschaft highlighten
  highlightStat(key, playerVal, computerVal);

  const msgEl = document.getElementById("result-message");

  if (playerVal > computerVal) {
    msgEl.textContent = `🎉 you win! ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`;
    msgEl.className = "result-message result-message--win";
    playerDeck.push(playerDeck.shift());
    playerDeck.push(computerDeck.shift());
  } else if (computerVal > playerVal) {
    msgEl.textContent = `😢 Computer gewinnt! ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`;
    msgEl.className = "result-message result-message--lose";
    computerDeck.push(computerDeck.shift());
    computerDeck.push(playerDeck.shift());
  } else {
    msgEl.textContent = `🤝 Unentschieden! Beide haben ${playerVal}`;
    msgEl.className = "result-message result-message--draw";
    playerDeck.push(playerDeck.shift());
    computerDeck.push(computerDeck.shift());
  }

  updateScores();
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

// ── Punktestand & Ende ───────────────────────────────────────

function updateScores() {
  document.getElementById("player-count").textContent = playerDeck.length;
  document.getElementById("computer-count").textContent = computerDeck.length;
}

function endGame() {
  const isWin = playerDeck.length > 0;
  const overlay = document.getElementById("end-overlay");
  document.getElementById("end-title").textContent = isWin ? "🏆 Du hast gewonnen!" : "💻 computer wins!";
  document.getElementById("end-sub").textContent = isWin
    ? "all monsters are yours!"
    : "No monsters anymore. Try again!";
  overlay.style.display = "flex";
}

function restartGame() {
  document.getElementById("end-overlay").style.display = "none";
  startGame();
}

// ── Start ────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", loadMonsters);
