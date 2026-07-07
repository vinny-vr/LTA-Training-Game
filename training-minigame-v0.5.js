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

function failureChanceForTier(tier) {
  return tier.successDie ? 1 / tier.successDie : 0;
}

function injuryChanceForTier(tier) {
  if (!tier.injuryDie) return 0;
  return tier.injuryFails.length / tier.injuryDie;
}

function formatChance(value) {
  const percent = value * 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function updateTrainingOptions() {
  ["H", "M", "L", "W"].forEach(code => {
    const action = training[code];
    const resultingEnergy = clamp(game.energy - action.energyCost, 0, 100);
    const tier = tierForEnergy(resultingEnergy);
    const gain = Math.ceil(game.monthBaseValue * action.gainMult);
    const failureChance = formatChance(failureChanceForTier(tier));
    const injuryChance = formatChance(injuryChanceForTier(tier));

    document.getElementById(`details${code}`).innerHTML =
      `+${gain} stats<br>−${action.energyCost} energy → ${resultingEnergy}%<br>` +
      `Failure: ${failureChance} · Injury: ${injuryChance}`;
  });

  document.getElementById("detailsR").innerHTML =
    `Restore to 100% energy<br>No stat gain<br>Failure: 0% · Injury: 0%`;
}



function startGame() {
  const startStats = 750;
  const enteredName = document.getElementById("setupName").value.trim();
  const minTrainingValue = Math.floor(Number(document.getElementById("setupMinValue").value));
  const maxTrainingValue = Math.floor(Number(document.getElementById("setupMaxValue").value));

  if (!Number.isFinite(minTrainingValue) || !Number.isFinite(maxTrainingValue) || minTrainingValue < 1 || maxTrainingValue < minTrainingValue) {
    alert("Please enter a valid training-value range. The maximum must be greater than or equal to the minimum.");
    return;
  }

  game = {
    name: enteredName || "Your Uma",
    startingStats: startStats,
    minTrainingValue,
    maxTrainingValue,
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
  game.monthBaseValue = Math.floor(Math.random() * (game.maxTrainingValue - game.minTrainingValue + 1)) + game.minTrainingValue;
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
  let fullGain = 0;
  let injuryGain = 0;

  if (code === "R") {
    game.energy = 100;
    if (forced) {
      game.forcedRest = false;
    }
    renderDie("Rest", "100%", forced ? "Forced recovery month" : "Energy fully restored", "good");
  } else {
    game.energy = clamp(game.energy - action.energyCost, 0, 100);
    tier = tierForEnergy(game.energy);
    fullGain = Math.ceil(game.monthBaseValue * action.gainMult);

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

    if (tier.injuryDie) {
      const injuryRoll = rollDie(tier.injuryDie);
      injured = tier.injuryFails.includes(injuryRoll);
      renderDie(
        `Injury d${tier.injuryDie}`,
        injuryRoll,
        injured ? "Injured" : "No injury",
        injured ? "bad" : "good"
      );
    } else {
      renderDie("Injury", "—", "No injury roll", "good");
    }

    if (injured) {
      injuryGain = Math.ceil(fullGain * 0.5);
      game.stats = Math.ceil((startStats + injuryGain) * 0.95);
      game.injuries++;
      game.statLosses++;
      game.forcedRest = true;

      renderDie(
        "Injury Stat Result",
        `+${injuryGain}, then −5%`,
        "Half training gain followed by stat loss",
        "bad"
      );

      if (!success) {
        game.failures++;
      }
    } else if (success) {
      gain = fullGain;
      game.stats = Math.ceil(game.stats + gain);
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
        game.stats = Math.ceil(game.stats * 0.95);
        game.statLosses++;
      }
    }
  }

  const change = game.stats - startStats;
  let summary = `<strong>${action.name}</strong> with training value <strong>${game.monthBaseValue}</strong>: ${startEnergy}% → ${game.energy}% energy`;
  if (code !== "R") summary += `, tier: <strong>${tier.name}</strong>`;
  summary += `. `;

  if (code === "R") {
    summary += forced ? `${game.name} recovered from the injury.` : `${game.name} rested.`;
  } else if (injured) {
    summary += `${game.name} was injured, received <span class="warn">+${injuryGain} stats</span> from half the training gain, then lost <span class="bad">5% of the resulting total</span>.`;
  } else if (success) {
    summary += `Training succeeded for <span class="good">+${gain} stats</span>.`;
  } else if (statLoss) {
    summary += `Training failed and ${game.name} lost <span class="bad">5% of the current stats</span>.`;
  } else {
    summary += `Training failed, but ${game.name} avoided the stat-loss penalty.`;
  }

  if (injured) {
    summary += ` <span class="bad">${game.name} must rest next month.</span>`;
  }

  addLog(summary, injured ? "bad-entry" : (success ? "good-entry" : "bad-entry"));
  document.getElementById("statusMessage").innerHTML =
    `Month ${game.month} resolved. Stat change: <strong class="${change >= 0 ? "good" : "bad"}">${change >= 0 ? "+" : ""}${change}</strong>.`;

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
  document.getElementById("umaNameNow").textContent = game.name;
  document.getElementById("monthMax").textContent = game.maxMonths;
  document.getElementById("statsNow").textContent = Math.ceil(game.stats);
  document.getElementById("energyNow").textContent = game.energy + "%";
  document.getElementById("trainingValueNow").textContent = game.monthBaseValue;
  document.getElementById("energyFill").style.width = game.energy + "%";
  updateTrainingOptions();
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
  document.getElementById("finalStats").textContent = Math.ceil(game.stats);
  const gain = game.stats - game.startingStats;
  document.getElementById("finalGain").textContent = `${gain >= 0 ? "+" : ""}${Math.ceil(gain)}`;
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
