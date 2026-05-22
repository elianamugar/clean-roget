const textA = document.getElementById("text-a");
const textB = document.getElementById("text-b");
const fileA = document.getElementById("file-a");
const fileB = document.getElementById("file-b");
const labelA = document.getElementById("label-a");
const labelB = document.getElementById("label-b");
const button = document.getElementById("compare-button");
const results = document.getElementById("comparison-results");

let terms = [];
let lookup = {};
let comparisonHeadsChart = null;
let comparisonClassesChart = null;
let semanticRadarChart = null;

const STOP_WORDS = new Set([
  "the", "to", "of", "and", "a", "an", "in", "on", "for", "with",
  "at", "by", "from", "up", "about", "into", "over", "after",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "i", "you", "he", "she", "it", "we", "they",
  "me", "him", "her", "us", "them",
  "my", "your", "his", "hers", "our", "their",
  "this", "that", "these", "those",
  "not", "no", "so", "as", "if", "but", "or",
  "mr", "mrs", "miss", "said", "much", "must", "one", "though",
  "might", "well"
]);

async function loadTerms() {
  const response = await fetch("data/roget_terms.json");
  terms = await response.json();

  for (const entry of terms) {
    const term = entry.term.toLowerCase();

    if (!lookup[term]) lookup[term] = [];
    lookup[term].push(entry);
  }
}

function renderRadarChart(a, b, nameA, nameB) {
  const labels = [
    ...new Set([
      ...a.topHeads.map(([label]) => label),
      ...b.topHeads.map(([label]) => label)
    ])
  ].slice(0, 8);

  const valuesA = labels.map(label => a.headCounts.get(label) || 0);
  const valuesB = labels.map(label => b.headCounts.get(label) || 0);

  const canvas = document.getElementById("semantic-radar-chart");

  if (!canvas) return;

  if (semanticRadarChart) {
    semanticRadarChart.destroy();
  }

  semanticRadarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: nameA,
          data: valuesA
        },
        {
          label: nameB,
          data: valuesB
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Semantic Fingerprint Radar"
        }
      },
      scales: {
        r: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderComparisonChart(
  canvasId,
  title,
  labels,
  valuesA,
  valuesB,
  nameA,
  nameB,
  existingChart
) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return null;

  if (existingChart) {
    existingChart.destroy();
  }

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: nameA,
          data: valuesA
        },
        {
          label: nameB,
          data: valuesB
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30
          }
        }
      }
    }
  });
}

function renderCharts(a, b, nameA, nameB) {
  const topHeadLabels = [
    ...new Set([
      ...a.topHeads.map(([label]) => label),
      ...b.topHeads.map(([label]) => label)
    ])
  ].slice(0, 10);

  const headValuesA = topHeadLabels.map(label =>
    a.headCounts.get(label) || 0
  );

  const headValuesB = topHeadLabels.map(label =>
    b.headCounts.get(label) || 0
  );

  comparisonHeadsChart = renderComparisonChart(
    "comparison-heads-chart",
    "Semantic Head Comparison",
    topHeadLabels,
    headValuesA,
    headValuesB,
    nameA,
    nameB,
    comparisonHeadsChart
  );

  const classLabels = [
    ...new Set([
      ...a.topClasses.map(([label]) => label),
      ...b.topClasses.map(([label]) => label)
    ])
  ];

  const classValuesA = classLabels.map(label =>
    a.classCounts.get(label) || 0
  );

  const classValuesB = classLabels.map(label =>
    b.classCounts.get(label) || 0
  );

  comparisonClassesChart = renderComparisonChart(
    "comparison-classes-chart",
    "Class Distribution Comparison",
    classLabels,
    classValuesA,
    classValuesB,
    nameA,
    nameB,
    comparisonClassesChart
  );
}

function tokenize(text) {
  return text.toLowerCase().match(/\b[a-zA-Z'-]+\b/g) || [];
}

function generateNgrams(tokens, minN = 2, maxN = 3) {
  const ngrams = [];

  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }

  return ngrams;
}

function count(items) {
  const counter = new Map();

  for (const item of items) {
    counter.set(item, (counter.get(item) || 0) + 1);
  }

  return counter;
}

function sortedCounter(counter) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]);
}

function analyze(text) {
  const tokens = tokenize(text);
  const contentTokens = tokens.filter(token => !STOP_WORDS.has(token));

  const candidates = [
    ...contentTokens,
    ...generateNgrams(tokens, 2, 3)
  ];

  const matchedTerms = [];
  const matchedEntries = [];

  for (const candidate of candidates) {
    if (lookup[candidate]) {
      matchedTerms.push(candidate);
      matchedEntries.push(...lookup[candidate]);
    }
  }

  const seen = new Set();
  const deduped = [];

  for (const term of matchedTerms) {
    for (const entry of lookup[term] || []) {
      const key = `${term}|${entry.head_name}|${entry.pos}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({ term, entry });
      }
    }
  }

  const headCounts = count(deduped.map(item => item.entry.head_name));
  const classCounts = count(deduped.map(item => item.entry.class_name || item.entry.class));
  const posCounts = count(deduped.map(item => item.entry.pos));

  return {
    totalTokens: tokens.length,
    matchedTerms: matchedTerms.length,
    uniqueMatchedTerms: new Set(matchedTerms).size,
    tokenCoverage: contentTokens.length
      ? contentTokens.filter(token => lookup[token]).length / contentTokens.length
      : 0,
    semanticDensity: tokens.length ? deduped.length / tokens.length : 0,
    headCounts,
    classCounts,
    posCounts,
    topHeads: sortedCounter(headCounts).slice(0, 10),
    topClasses: sortedCounter(classCounts).slice(0, 8),
    topPOS: sortedCounter(posCounts)
  };
}

function distinctiveHeads(a, b) {
  const rows = [];

  for (const [head, countA] of a.headCounts.entries()) {
    const countB = b.headCounts.get(head) || 0;
    const score = countA - countB;

    if (score > 0) rows.push([head, score]);
  }

  return rows.sort((x, y) => y[1] - x[1]).slice(0, 10);
}

function sharedHeads(a, b) {
  const rows = [];

  for (const [head, countA] of a.headCounts.entries()) {
    const countB = b.headCounts.get(head);

    if (countB) {
      rows.push([head, Math.min(countA, countB)]);
    }
  }

  return rows.sort((x, y) => y[1] - x[1]).slice(0, 10);
}

function renderList(title, rows) {
  return `
    <section class="result-card">
      <h2>${title}</h2>
      <ul>
        ${rows.map(([label, value]) => `<li><strong>${label}</strong>: ${value}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderSummary(name, data) {
  return `
    <section class="result-card">
      <h2>${name}</h2>
      <p>Total tokens: ${data.totalTokens}</p>
      <p>Matched terms/phrases: ${data.matchedTerms}</p>
      <p>Unique matched terms/phrases: ${data.uniqueMatchedTerms}</p>
      <p>Token coverage: ${(data.tokenCoverage * 100).toFixed(2)}%</p>
      <p>Semantic density: ${data.semanticDensity.toFixed(2)} matches/token</p>
    </section>
  `;
}

function renderComparison(a, b, nameA, nameB) {
  const shared = sharedHeads(a, b);
  const distinctA = distinctiveHeads(a, b);
  const distinctB = distinctiveHeads(b, a);

  results.innerHTML = `
    <div class="compare-grid">
      ${renderSummary(nameA, a)}
      ${renderSummary(nameB, b)}
    </div>

    <div class="compare-grid">
      ${renderList(`Top Heads — ${nameA}`, a.topHeads)}
      ${renderList(`Top Heads — ${nameB}`, b.topHeads)}
    </div>

    ${renderList("Shared Semantic Heads", shared)}
    ${renderList(`Distinctive Heads — ${nameA}`, distinctA)}
    ${renderList(`Distinctive Heads — ${nameB}`, distinctB)}

    <div class="compare-grid">
      ${renderList(`Class Distribution — ${nameA}`, a.topClasses)}
      ${renderList(`Class Distribution — ${nameB}`, b.topClasses)}
    </div>

    <div class="compare-grid">
      ${renderList(`POS Distribution — ${nameA}`, a.topPOS)}
      ${renderList(`POS Distribution — ${nameB}`, b.topPOS)}
    </div>
  `;
}

fileA.addEventListener("change", async () => {
  const file = fileA.files[0];
  if (file) textA.value = await file.text();
});

fileB.addEventListener("change", async () => {
  const file = fileB.files[0];
  if (file) textB.value = await file.text();
});

button.addEventListener("click", () => {
  const aText = textA.value.trim();
  const bText = textB.value.trim();

  if (!aText || !bText) {
    results.innerHTML = "<p>Please provide both texts before comparing.</p>";
    return;
  }

  const nameA = labelA.value.trim() || "Text A";
  const nameB = labelB.value.trim() || "Text B";

  const analysisA = analyze(aText);
  const analysisB = analyze(bText);

  renderComparison(analysisA, analysisB, nameA, nameB);
  renderCharts(analysisA, analysisB, nameA, nameB);
  renderRadarChart(analysisA, analysisB, nameA, nameB);
});

loadTerms();