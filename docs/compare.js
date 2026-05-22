const textA = document.getElementById("text-a");
const textB = document.getElementById("text-b");
const fileA = document.getElementById("file-a");
const fileB = document.getElementById("file-b");
const labelA = document.getElementById("label-a");
const labelB = document.getElementById("label-b");
const button = document.getElementById("compare-button");
const results = document.getElementById("comparison-results");

let distinctiveChart = null;
let terms = [];
let lookup = {};
let comparisonHeadsChart = null;
let comparisonClassesChart = null;
let semanticRadarChart = null;

let STOP_WORDS = new Set();

async function loadTerms() {
  const response = await fetch("data/roget_terms.json");
  terms = await response.json();

  for (const entry of terms) {
    const term = entry.term.toLowerCase();

    if (!lookup[term]) lookup[term] = [];
    lookup[term].push(entry);
  }
}

async function loadStopwords() {
  const response = await fetch("data/stopwords.json");
  const words = await response.json();

  STOP_WORDS = new Set(words);
}

function distinctiveFingerprintData(a, b, topN = 10) {
  const keys = new Set([
    ...a.headCounts.keys(),
    ...b.headCounts.keys()
  ]);

  let totalA = 0;
  let totalB = 0;

  for (const v of a.headCounts.values()) totalA += v;
  for (const v of b.headCounts.values()) totalB += v;

  const rows = [];

  for (const key of keys) {
    const propA = totalA
      ? (a.headCounts.get(key) || 0) / totalA
      : 0;

    const propB = totalB
      ? (b.headCounts.get(key) || 0) / totalB
      : 0;

    rows.push({
      head: key,
      difference: propA - propB
    });
  }

  return rows
    .sort((a, b) =>
      Math.abs(b.difference) - Math.abs(a.difference)
    )
    .slice(0, topN);
}

function renderDistinctiveChart(a, b, nameA, nameB) {
  const rows = distinctiveFingerprintData(a, b, 12);

  const labels = rows.map(row => row.head);

  const values = rows.map(row => row.difference * 100);

  const canvas = document.getElementById("distinctive-chart");

  if (!canvas) return;

  if (distinctiveChart) {
    distinctiveChart.destroy();
  }

  distinctiveChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: `${nameB} ←→ ${nameA}`,
          data: values
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: chartTextColor()
          }
        },
        title: {
          display: true,
          text: "Distinctive Semantic Fingerprint",
          color: chartTextColor()
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;

              if (value > 0) {
                return `${nameA}: +${value.toFixed(2)}%`;
              }

              return `${nameB}: +${Math.abs(value).toFixed(2)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: chartTextColor(),
            callback(value) {
  return `${Number(value).toFixed(2)}%`;
}
          },
          grid: {
            color:
              document.documentElement.dataset.theme === "dark"
                ? "#4d4035"
                : "#dfd3c3"
          },
          title: {
  display: true,
  text: `${nameB} ← Semantic Difference → ${nameA}`,
  color: chartTextColor()
},
        },
        y: {
          ticks: {
            color: chartTextColor()
          },
          grid: {
            color:
              document.documentElement.dataset.theme === "dark"
                ? "#4d4035"
                : "#dfd3c3"
          }
        }
      }
    }
  });
}

function normalizedHeadDifference(a, b, topN = 25) {
  const keys = new Set([...a.headCounts.keys(), ...b.headCounts.keys()]);

  let totalA = 0;
  let totalB = 0;

  for (const value of a.headCounts.values()) totalA += value;
  for (const value of b.headCounts.values()) totalB += value;

  const differences = [];

  for (const key of keys) {
    const propA = totalA ? (a.headCounts.get(key) || 0) / totalA : 0;
    const propB = totalB ? (b.headCounts.get(key) || 0) / totalB : 0;

    differences.push([key, Math.abs(propA - propB)]);
  }

  return differences
    .sort((x, y) => y[1] - x[1])
    .slice(0, topN);
}

function buildHeadIDF() {
  const headTerms = new Map();
  const allTerms = new Set();

  for (const entry of terms) {
    const head = entry.head_name;
    const term = entry.term;

    if (!head || !term) continue;

    allTerms.add(term);

    if (!headTerms.has(head)) {
      headTerms.set(head, new Set());
    }

    headTerms.get(head).add(term);
  }

  const totalTerms = allTerms.size;
  const idf = new Map();

  for (const [head, termSet] of headTerms.entries()) {
    idf.set(
      head,
      Math.log((1 + totalTerms) / (1 + termSet.size)) + 1
    );
  }

  return idf;
}

function tfidfHeadVector(counter, idf) {
  const vector = new Map();

  let total = 0;

  for (const count of counter.values()) {
    total += count;
  }

  for (const [head, count] of counter.entries()) {
    const tf = total ? count / total : 0;
    const weight = idf.get(head) || 1;

    vector.set(head, tf * weight);
  }

  return vector;
}

function topHeadOverlap(a, b, n = 25) {
  const topA = new Set(a.topHeads.slice(0, n).map(([head]) => head));
  const topB = new Set(b.topHeads.slice(0, n).map(([head]) => head));

  const shared = [...topA].filter(head => topB.has(head));

  return shared.length / n;
}

function cosineSimilarity(counterA, counterB) {
  const keys = new Set([...counterA.keys(), ...counterB.keys()]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of keys) {
    const a = counterA.get(key) || 0;
    const b = counterB.get(key) || 0;

    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function buildHeadWeights() {
  const headTerms = new Map();

  for (const entry of terms) {
    const head = entry.head_name;
    const term = entry.term;

    if (!head || !term) continue;

    if (!headTerms.has(head)) {
      headTerms.set(head, new Set());
    }

    headTerms.get(head).add(term);
  }

  const totalTerms = new Set(terms.map(entry => entry.term)).size;
  const weights = new Map();

  for (const [head, termSet] of headTerms.entries()) {
    const weight = Math.log((1 + totalTerms) / (1 + termSet.size)) + 1;
    weights.set(head, weight);
  }

  return weights;
}

function weightedCosineSimilarity(counterA, counterB, weights) {
  const keys = new Set([...counterA.keys(), ...counterB.keys()]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of keys) {
    const weight = weights.get(key) || 1;

    const a = (counterA.get(key) || 0) * weight;
    const b = (counterB.get(key) || 0) * weight;

    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return 0;

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function chartTextColor() {
  return document.documentElement.dataset.theme === "dark"
    ? "#f4eadc"
    : "#241f1a";
}

function renderRadarChart(data) {
  const rows = data.topHeads.slice(0, 8);
  const labels = rows.map(([label]) => label);
  const values = rows.map(([, value]) => value);

  const canvas = document.getElementById("radar-chart");

  if (!canvas) return;

  if (radarChart) {
    radarChart.destroy();
  }

  radarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Semantic Fingerprint",
          data: values
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: chartTextColor()
          }
        },
        title: {
          display: true,
          text: "Semantic Fingerprint Radar",
          color: chartTextColor()
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            color: chartTextColor(),
            backdropColor: "transparent"
          },
          grid: {
            color:
              document.documentElement.dataset.theme === "dark"
                ? "#4d4035"
                : "#dfd3c3"
          },
          angleLines: {
            color:
              document.documentElement.dataset.theme === "dark"
                ? "#4d4035"
                : "#dfd3c3"
          },
          pointLabels: {
            color: chartTextColor()
          }
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
      legend: {
        display: false,
        labels: {
          color: chartTextColor()
        }
      },
      title: {
        display: true,
        text: title,
        color: chartTextColor()
      }
    },
    scales: {
      x: {
        ticks: {
          color: chartTextColor(),
          maxRotation: 45,
          minRotation: 30
        },
        grid: {
          color: document.documentElement.dataset.theme === "dark"
            ? "#4d4035"
            : "#dfd3c3"
        }
      },
      y: {
        ticks: {
          color: chartTextColor()
        },
        grid: {
          color: document.documentElement.dataset.theme === "dark"
            ? "#4d4035"
            : "#dfd3c3"
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
        ${rows.map(([label]) => `<li><strong>${label}</strong></li>`).join("")}
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
  const headIDF = buildHeadIDF();
  const headDifferences = normalizedHeadDifference(a, b, 10);

  const tfidfA = tfidfHeadVector(a.headCounts, headIDF);
  const tfidfB = tfidfHeadVector(b.headCounts, headIDF);

  const tfidfSimilarity = cosineSimilarity(tfidfA, tfidfB);
  const top25Overlap = topHeadOverlap(a, b, 25);
  const shared = sharedHeads(a, b);
  const distinctA = distinctiveHeads(a, b);
  const distinctB = distinctiveHeads(b, a);
  const headSimilarity = cosineSimilarity(a.headCounts, b.headCounts);
  const classSimilarity = cosineSimilarity(a.classCounts, b.classCounts);
  const posSimilarity = cosineSimilarity(a.posCounts, b.posCounts);
  const headWeights = buildHeadWeights();
  const weightedHeadSimilarity = weightedCosineSimilarity(
    a.headCounts,
    b.headCounts,
    headWeights
  );

  results.innerHTML = `
    <section class="result-card">
    <h2>Similarity Scores</h2>
    <p><strong>Dominant thematic overlap:</strong> ${(top25Overlap * 100).toFixed(2)}%</p>
    <p><strong>Most Different Semantic Heads:</strong></p> ${renderList("Most Different Semantic Heads", headDifferences.map(([h, v]) => [h, (v * 100).toFixed(2) + "%"]))}
    <p>
    <strong>TF-IDF semantic similarity:</strong>
    ${(tfidfSimilarity * 100).toFixed(2)}%
    </p>
    <p><strong>Broad structural similarity (weighted):</strong> ${(weightedHeadSimilarity * 100).toFixed(2)}%</p>
    <p><strong>Broad structural similarity (raw):</strong> ${(headSimilarity * 100).toFixed(2)}%</p>
    <p><strong>Class similarity:</strong> ${(classSimilarity * 100).toFixed(2)}%</p>
    <p><strong>Part-of-speech similarity:</strong> ${(posSimilarity * 100).toFixed(2)}%</p>
    </section>
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
  renderDistinctiveChart(
  analysisA,
  analysisB,
  nameA,
  nameB
);
  document.querySelectorAll(".comparison-chart").forEach(section => {
    section.style.display = "block";
  });
});

Promise.all([
  loadTerms(),
  loadStopwords()
]);