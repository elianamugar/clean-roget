const filesA = document.getElementById("files-a");
const filesB = document.getElementById("files-b");
const labelA = document.getElementById("label-a");
const labelB = document.getElementById("label-b");
const button = document.getElementById("compare-corpora-button");
const results = document.getElementById("corpus-results");

let terms = [];
let lookup = {};
let headsChart = null;
let radarChart = null;

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
    lookup[term] ??= [];
    lookup[term].push(entry);
  }
}

function chartTextColor() {
  return document.documentElement.dataset.theme === "dark"
    ? "#f4eadc"
    : "#241f1a";
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
  for (const item of items) counter.set(item, (counter.get(item) || 0) + 1);
  return counter;
}

function sortedCounter(counter) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]);
}

function analyze(text) {
  const tokens = tokenize(text);
  const contentTokens = tokens.filter(token => !STOP_WORDS.has(token));

  const candidates = [...contentTokens, ...generateNgrams(tokens, 2, 3)];

  const matchedTerms = [];

  for (const candidate of candidates) {
    if (lookup[candidate]) matchedTerms.push(candidate);
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
    topHeads: sortedCounter(headCounts).slice(0, 10),
    topClasses: sortedCounter(classCounts).slice(0, 8)
  };
}

async function readFiles(fileList) {
  const texts = [];
  for (const file of fileList) {
    texts.push(await file.text());
  }
  return texts.join("\n\n");
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

function renderSummary(name, data, fileCount) {
  return `
    <section class="result-card">
      <h2>${name}</h2>
      <p>Files: ${fileCount}</p>
      <p>Total tokens: ${data.totalTokens}</p>
      <p>Matched terms/phrases: ${data.matchedTerms}</p>
      <p>Unique matched terms/phrases: ${data.uniqueMatchedTerms}</p>
      <p>Token coverage: ${(data.tokenCoverage * 100).toFixed(2)}%</p>
      <p>Semantic density: ${data.semanticDensity.toFixed(2)} matches/token</p>
    </section>
  `;
}

function renderResults(a, b, nameA, nameB) {
  results.innerHTML = `
    <div class="compare-grid">
      ${renderSummary(nameA, a, filesA.files.length)}
      ${renderSummary(nameB, b, filesB.files.length)}
    </div>

    <div class="compare-grid">
      ${renderList(`Top Heads — ${nameA}`, a.topHeads)}
      ${renderList(`Top Heads — ${nameB}`, b.topHeads)}
    </div>
  `;
}

function renderBarChart(a, b, nameA, nameB) {
  const labels = [...new Set([
    ...a.topHeads.map(([label]) => label),
    ...b.topHeads.map(([label]) => label)
  ])].slice(0, 10);

  const valuesA = labels.map(label => a.headCounts.get(label) || 0);
  const valuesB = labels.map(label => b.headCounts.get(label) || 0);

  if (headsChart) headsChart.destroy();

  headsChart = new Chart(document.getElementById("corpus-heads-chart"), {
  type: "bar",
  data: {
    labels,
    datasets: [
      { label: nameA, data: valuesA },
      { label: nameB, data: valuesB }
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
        text: "Corpus Semantic Head Comparison",
        color: chartTextColor()
      }
    },
    scales: {
      x: {
        ticks: {
          color: chartTextColor()
        },
        grid: {
          color:
            document.documentElement.dataset.theme === "dark"
              ? "#4d4035"
              : "#dfd3c3"
        }
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

button.addEventListener("click", async () => {
  if (!filesA.files.length || !filesB.files.length) {
    results.innerHTML = "<p>Please upload files for both corpora.</p>";
    return;
  }

  const nameA = labelA.value.trim() || "Corpus A";
  const nameB = labelB.value.trim() || "Corpus B";

  const corpusA = await readFiles(filesA.files);
  const corpusB = await readFiles(filesB.files);

  const analysisA = analyze(corpusA);
  const analysisB = analyze(corpusB);

  renderResults(analysisA, analysisB, nameA, nameB);
  renderBarChart(analysisA, analysisB, nameA, nameB);
  renderRadarChart(analysisA, analysisB, nameA, nameB);
});

loadTerms();