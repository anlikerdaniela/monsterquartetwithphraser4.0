

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

  // Labels anpassen je nach Modus
  if (gameMode === 'pvp') {
    document.querySelector(".player-side .side-label").textContent = "👤 Player 1";
    document.querySelector(".computer-side .side-label").textContent = "👤 Player 2";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "Player 1";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "Player 2";
  } else {
    document.querySelector(".player-side .side-label").textContent = "👤 you";
    document.querySelector(".computer-side .side-label").textContent = "💻 computer";
    document.querySelector(".scoreboard .score-item:first-child span").textContent = "your cards";
    document.querySelector(".scoreboard .score-item:last-child span").textContent = "computer";
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
      // Player 1 ist dran — linke Karte sichtbar, rechte versteckt
      renderPlayerCard(true);
      renderComputerCard(true);
      document.getElementById("result-message").textContent = "👤 Player 1 — Choose a property!";
    } else {
      // Player 2 ist dran — rechte Karte sichtbar, linke versteckt
      renderPlayerCard(false);
      renderComputerCard(false);
      document.getElementById("result-message").textContent = "👤 Player 2 — Choose a property!";
    }
    document.getElementById("result-message").className = "result-message";
    enablePlayerClick(true, isPlayerTurn);
  } else {
    renderPlayerCard(true);
    renderComputerCard(true);
    if (isPlayerTurn) {
      document.getElementById("result-message").textContent = "Choose a property!";
      document.getElementById("result-message").className = "result-message";
      enablePlayerClick(true, true);
    } else {
      document.getElementById("result-message").textContent = "💻 Computer is choosing...";
      document.getElementById("result-message").className = "result-message";
      enablePlayerClick(false, false);
      setTimeout(computerChoose, 1500);
    }
  }
}

// ── Karten rendern ───────────────────────────────────────────

function renderPlayerCard(clickable) {
  const container = document.getElementById("player-card");
  if (gameMode === 'pvp' && !isPlayerTurn) {
    container.innerHTML = `
      <div class="card card--hidden">
        <div class="card__back">
          <div class="card__back-monster">🐙</div>
          <div class="card__back-stars">✨ ⭐ ✨</div>
          <h3 class="card__back-title">Monster Quartet</h3>
        </div>
      </div>`;
  } else {
    container.innerHTML = buildCardHTML(playerCard, clickable && isPlayerTurn);
  }
}

function renderComputerCard(hidden = false) {
  const container = document.getElementById("computer-card");
  if (gameMode === 'pvp' && isPlayerTurn) {
    // Player 1 dran → rechte Karte versteckt
    container.innerHTML = `
      <div class="card card--hidden">
        <div class="card__back">
          <div class="card__back-monster">🐙</div>
          <div class="card__back-stars">✨ ⭐ ✨</div>
          <h3 class="card__back-title">Monster Quartet</h3>
        </div>
      </div>`;
  } else if (gameMode === 'pvp' && !isPlayerTurn) {
    // Player 2 dran → rechte Karte klickbar
    container.innerHTML = buildCardHTML(computerCard, true, true);
  } else if (hidden) {
    container.innerHTML = `
      <div class="card card--hidden">
        <div class="card__back">
          <div class="card__back-monster">🐙</div>
          <div class="card__back-stars">✨ ⭐ ✨</div>
          <h3 class="card__back-title">Monster Quartet</h3>
        </div>
      </div>`;
  } else {
    container.innerHTML = buildCardHTML(computerCard, false);
  }
}

function buildCardHTML(monster, isClickable, isRight = false) {
  const rows = Object.entries(monster.eigenschaften)
    .map(([key, val]) => `
      <div class="stat-row ${isClickable ? "stat-row--clickable" : ""}" 
           ${isClickable ? `onclick="chooseEigenschaft('${key}')"` : ""}
           data-key="${key}">
        <span class="stat-label">${eigenschaftLabels[key]}</span>
        <span class="stat-value">${val}</span>
        <div class="stat-bar"><div class="stat-bar__fill" style="width:${val}%"></div></div>
      </div>`)
    .join("");

  return `
    <div class="card">
      <div class="card__header">
        <h2 class="card__name">${monster.name}</h2>
      </div>
      <img class="card__image" src="pictures/${monster.bild}" alt="${monster.name}">
      <div class="card__stats">${rows}</div>
    </div>`;
}

// ── Computer / Klick ─────────────────────────────────────────

function enablePlayerClick(enabled, leftSide) {
  document.querySelectorAll("#player-card .stat-row--clickable, #computer-card .stat-row--clickable").forEach(row => {
    row.style.pointerEvents = enabled ? "auto" : "none";
    row.style.opacity = enabled ? "1" : "0.5";
  });
}

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
  document.getElementById("player-card").innerHTML = buildCardHTML(playerCard, false);
  document.getElementById("computer-card").innerHTML = buildCardHTML(computerCard, false);

  highlightStat(key, playerVal, computerVal);

  const msgEl = document.getElementById("result-message");

  playerDeck.shift();
  computerDeck.shift();

  if (playerVal > computerVal) {
    msgEl.textContent = gameMode === 'pvp'
      ? `🎉 Player 1 wins! ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`
      : `🎉 You win! ${eigenschaftLabels[key]}: ${playerVal} > ${computerVal}`;
    msgEl.className = "result-message result-message--win";
    playerDeck.push(playerCard);
    playerDeck.push(computerCard);
  } else if (computerVal > playerVal) {
    msgEl.textContent = gameMode === 'pvp'
      ? `🎉 Player 2 wins! ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`
      : `😢 Computer wins! ${eigenschaftLabels[key]}: ${computerVal} > ${playerVal}`;
    msgEl.className = "result-message result-message--lose";
    computerDeck.push(computerCard);
    computerDeck.push(playerCard);
  } else {
    msgEl.textContent = `🤝 Draw! Both have ${playerVal}`;
    msgEl.className = "result-message result-message--draw";
    playerDeck.push(playerCard);
    computerDeck.push(computerCard);
  }

  isPlayerTurn = !isPlayerTurn;
  updateScores();

  // Leben verlieren wenn keine Karten (nur AI)
  if (gameMode === 'ai' && playerDeck.length === 0) {
    lives--;
    updateLives();
    if (lives <= 0) { setTimeout(endGame, 800); return; }
    const shuffled = [...allMonsters].sort(() => Math.random() - 0.5);
    const half = Math.floor(shuffled.length / 2);
    playerDeck = shuffled.slice(0, half);
    computerDeck = shuffled.slice(half);
    msgEl.textContent = `💔 Life lost! ${lives} lives remaining.`;
  }

  if (computerDeck.length === 0 || playerDeck.length === 0) {
    setTimeout(endGame, 800);
    return;
  }

  document.getElementById("next-btn").style.display = "inline-block";
}

// ── Highlight ────────────────────────────────────────────────

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

function updateLives() {
  const lifeEls = document.querySelectorAll(".life");
  lifeEls.forEach((el, i) => {
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
  document.getElementById("music-status").textContent = musicEnabled
    ? "Music will be added later."
    : "Music is off.";
}

// ── Start ────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", loadMonsters);