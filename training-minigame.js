const training = {
  H: {name:"High", gainMult:1.00, energyCost:30},
  M: {name:"Medium", gainMult:0.75, energyCost:20},
  L: {name:"Low", gainMult:0.50, energyCost:10},
  W: {name:"Warmups", gainMult:0.25, energyCost:0},
  R: {name:"Rest", gainMult:0.00, energyCost:0}
};

let game = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function tierForEnergy(energy) {
  if (energy > 75) return {name:"Great", successDie:null, injuryDie:null, injuryFails:[]};
  if (energy >= 51) return {name:"Good", successDie:50, injuryDie:null, injuryFails:[]};
  if (energy >= 26) return {name:"Poor", successDie:20, injuryDie:50, injuryFails:[1]};
  if (energy >= 1) return {name:"Awful", successDie:6, injuryDie:10, injuryFails:[1]};
  return {name:"Yikes", successDie:6, injuryDie:4, injuryFails:[1,2,3]};
}



function startGame() {
  const startStats = 750;
  const enteredName = document.getElementById("setupName").value.trim();
  game = {
    name: enteredName || "Your Uma",
    startingStats: startStats,
    stats: startStats,
    energy: 100,
    month: 1,
    maxMonths: Number(document.getElementById("setupMonths").value),
    monthBaseValue: 0,
    forcedRest: false,
    pendingNextMonth: false,
    failures: 0,
    injuries: 0,
    statLosses: 0,
    log: []
  };

  document.getElementById("setupScreen").classList.add("hidden");
  document.getElementById("endScreen").classList.add("hidden");
  document.getElementById("gameScreen").classList.remove("hidden");
  beginMonth();
}

function beginMonth() {
  game.pendingNextMonth = false;
  game.monthBaseValue = Math.floor(Math.random() * 106) + 75;
  document.getElementById("rollPanel").classList.add("hidden");
  document.getElementById("actionPanel").classList.remove("hidden");

  if (game.forcedRest) {
    document.getElementById("statusMessage").innerHTML =
      `<span class="bad"><strong>${game.name} is injured.</strong></span> This month is automatically spent resting.`;
    document.getElementById("actionPanel").classList.add("hidden");
    setTimeout(() => resolveTraining("R", true), 250);
  } else {
    document.getElementById("statusMessage").innerHTML =
      `This month's training value is <strong class="accent">${game.monthBaseValue}</strong>. Choose ${game.name}'s training.`;
  }

  updateHUD();
}



function chooseTraining(code) {
  if (!game || game.pendingNextMonth || game.forcedRest) return;
  resolveTraining(code, false);
}

function resolveTraining(code, forced) {
  game.pendingNextMonth = true;
  document.getElementById("actionPanel").classList.add("hidden");
  document.getElementById("rollPanel").classList.remove("hidden");
  const rollArea = document.getElementById("rollArea");
  rollArea.innerHTML = "";

  const action = training[code];
  const startStats = game.stats;
  const startEnergy = game.energy;

  let tier = {name:"—", successDie:null, injuryDie:null, injuryFails:[]};
  let success = true;
  let injured = false;
  let statLoss = false;
  let gain = 0;

  if (code === "R") {
    game.energy = 100;
    if (forced) {
      game.forcedRest = false;
    }
    renderDie("Rest", "100%", forced ? "Forced recovery month" : "Energy fully restored", "good");
  } else {
    game.energy = clamp(game.energy - action.energyCost, 0, 100);
    tier = tierForEnergy(game.energy);

    if (tier.successDie) {
      const successRoll = rollDie(tier.successDie);
      success = successRoll !== 1;
      renderDie(
        `Training Success d${tier.successDie}`,
        successRoll,
        success ? "Success" : "Failure",
        success ? "good" : "bad"
      );
    } else {
      renderDie("Training Success", "—", "Automatic success", "good");
    }

    if (success) {
      gain = game.monthBaseValue * action.gainMult;
      game.stats += gain;
    } else {
      game.failures++;
      const lossRoll = rollDie(2);
      statLoss = lossRoll === 1;
      renderDie(
        "Stat Loss d2",
        lossRoll,
        statLoss ? "Lose 5% of current stats" : "No stat loss",
        statLoss ? "bad" : "good"
      );
      if (statLoss) {
        game.stats *= 0.95;
        game.statLosses++;
      }
    }

    if (tier.injuryDie) {
      const injuryRoll = rollDie(tier.injuryDie);
      injured = tier.injuryFails.includes(injuryRoll);
      renderDie(
        `Injury d${tier.injuryDie}`,
        injuryRoll,
        injured ? "Injured" : "No injury",
        injured ? "bad" : "good"
      );
      if (injured) {
        game.injuries++;
        game.forcedRest = true;
      }
    } else {
      renderDie("Injury", "—", "No injury roll", "good");
    }
  }

  const change = game.stats - startStats;
  let summary = `<strong>${action.name}</strong> with training value <strong>${game.monthBaseValue}</strong>: ${startEnergy}% → ${game.energy}% energy`;
  if (code !== "R") summary += `, tier: <strong>${tier.name}</strong>`;
  summary += `. `;

  if (code === "R") {
    summary += forced ? `${game.name} recovered from the injury.` : `${game.name} rested.`;
  } else if (success) {
    summary += `Training succeeded for <span class="good">+${gain.toFixed(2)} stats</span>.`;
  } else if (statLoss) {
    summary += `Training failed and Kleos lost <span class="bad">5% of her stats</span>.`;
  } else {
    summary += `Training failed, but she avoided the stat-loss penalty.`;
  }

  if (injured) {
    summary += ` <span class="bad">${game.name} is injured and must rest next month.</span>`;
  }

  addLog(summary, success ? (injured ? "warn-entry" : "good-entry") : "bad-entry");
  document.getElementById("statusMessage").innerHTML =
    `Month ${game.month} resolved. Stat change: <strong class="${change >= 0 ? "good" : "bad"}">${change >= 0 ? "+" : ""}${change.toFixed(2)}</strong>.`;

  updateHUD();

  if (game.month >= game.maxMonths) {
    document.getElementById("nextBtn").textContent = "See Final Results";
  } else {
    document.getElementById("nextBtn").textContent = "Continue to Next Month";
  }
}

function renderDie(title, value, result, tone) {
  const div = document.createElement("div");
  div.className = "die";
  div.innerHTML = `
    <div class="die-title">${title}</div>
    <div class="die-value ${tone}">${value}</div>
    <div class="die-result ${tone}">${result}</div>
  `;
  document.getElementById("rollArea").appendChild(div);
}

function nextMonth() {
  if (!game.pendingNextMonth) return;

  if (game.month >= game.maxMonths) {
    endGame();
    return;
  }

  game.month++;
  beginMonth();
}

function updateHUD() {
  document.getElementById("monthNow").textContent = game.month;
  document.getElementById("monthMax").textContent = game.maxMonths;
  document.getElementById("statsNow").textContent = game.stats.toFixed(2);
  document.getElementById("energyNow").textContent = game.energy + "%";
  document.getElementById("trainingValueNow").textContent = game.monthBaseValue;
  document.getElementById("energyFill").style.width = game.energy + "%";
}

function addLog(message, cls="") {
  const entry = {
    month: game.month,
    message,
    cls
  };
  game.log.push(entry);

  const div = document.createElement("div");
  div.className = `entry ${cls}`;
  div.innerHTML = `<div class="meta">Month ${game.month}</div>${message}`;
  document.getElementById("log").prepend(div);
}

function endGame() {
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("endScreen").classList.remove("hidden");

  document.getElementById("endTitle").textContent = `${game.name}'s Training Complete`;
  document.getElementById("finalStats").textContent = game.stats.toFixed(2);
  const gain = game.stats - game.startingStats;
  document.getElementById("finalGain").textContent = `${gain >= 0 ? "+" : ""}${gain.toFixed(2)}`;
  document.getElementById("finalFails").textContent = game.failures;
  document.getElementById("finalInjuries").textContent = game.injuries;

  const log = document.getElementById("endLog");
  log.innerHTML = "";
  [...game.log].reverse().forEach(entry => {
    const div = document.createElement("div");
    div.className = `entry ${entry.cls}`;
    div.innerHTML = `<div class="meta">Month ${entry.month}</div>${entry.message}`;
    log.appendChild(div);
  });
}

function restartGame() {
  if (!game) return;
  document.getElementById("log").innerHTML = "";
  startGame();
}

function returnToSetup() {
  document.getElementById("gameScreen").classList.add("hidden");
  document.getElementById("endScreen").classList.add("hidden");
  document.getElementById("setupScreen").classList.remove("hidden");
  document.getElementById("log").innerHTML = "";
}
