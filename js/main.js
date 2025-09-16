document.addEventListener("DOMContentLoaded", () => {
  loadPredictions();
  setupProfitCalc();
  setupExport();
  setupAlerts();
});

function loadPredictions() {
  AIEngine.getPredictions().then(predictions => {
    const tableDiv = document.getElementById("predictions-table");
    tableDiv.innerHTML = renderPredictionsTable(predictions);
  });
}

function renderPredictionsTable(predictions) {
  let rows = predictions.map(p =>
    `<tr>
      <td>${p.symbol}</td>
      <td>$${p.current.toFixed(2)}</td>
      <td>$${p.target.toFixed(2)}</td>
      <td>${p.potential > 0 ? "+" : ""}${p.potential.toFixed(1)}%</td>
      <td>${p.timeframe}</td>
      <td>${p.confidence}%</td>
      <td>${p.risk}</td>
    </tr>`
  ).join("");
  return `
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Current</th>
          <th>Target</th>
          <th>Potential</th>
          <th>Timeframe</th>
          <th>Confidence</th>
          <th>Risk</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function setupProfitCalc() {
  const form = document.getElementById("calc-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const symbol = document.getElementById("calc-symbol").value.trim().toUpperCase();
    const amount = parseFloat(document.getElementById("calc-amount").value);
    const target = parseFloat(document.getElementById("calc-target").value);
    if (!symbol || isNaN(amount) || isNaN(target)) return;
    AIEngine.getCurrentPrice(symbol).then(price => {
      if (price === null) {
        document.getElementById("calc-result").textContent = "Symbol not found.";
        return;
      }
      const shares = amount / price;
      const profit = shares * (target - price);
      document.getElementById("calc-result").textContent =
        `Estimated profit: $${profit.toFixed(2)} (${shares.toFixed(2)} shares)`;
    });
  });
}

function setupExport() {
  document.getElementById("export-btn").addEventListener("click", () => {
    AIEngine.getPredictions().then(predictions => {
      const content = predictions.map(p =>
        `${p.symbol}: Current $${p.current} → Target $${p.target} | Potential: ${p.potential}% | ${p.timeframe}`
      ).join("\n");
      const blob = new Blob([content], {type: "text/plain"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recommendations.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      document.getElementById("export-status").textContent = "Exported!";
      setTimeout(() => document.getElementById("export-status").textContent = "", 1500);
    });
  });
}

function setupAlerts() {
  const form = document.getElementById("alert-form");
  const list = document.getElementById("alerts-list");
  let alerts = [];
  form.addEventListener("submit", e => {
    e.preventDefault();
    const symbol = document.getElementById("alert-symbol").value.trim().toUpperCase();
    const price = parseFloat(document.getElementById("alert-price").value);
    if (!symbol || isNaN(price)) return;
    alerts.push({symbol, price});
    renderAlerts();
    form.reset();
  });
  function renderAlerts() {
    list.innerHTML = alerts.map(a =>
      `<li>${a.symbol} at $${a.price.toFixed(2)}</li>`
    ).join("");
  }
  // Polling for alert triggers
  setInterval(() => {
    alerts.forEach((a, i) => {
      AIEngine.getCurrentPrice(a.symbol).then(current => {
        if (current !== null && current >= a.price) {
          alert(`ALERT: ${a.symbol} hit $${a.price.toFixed(2)}!`);
          if (CONFIG.alertSound) playBeep();
          alerts.splice(i, 1);
          renderAlerts();
        }
      });
    });
  }, 30000);
  function playBeep() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
}
