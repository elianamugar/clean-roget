const filesInput = document.getElementById("files");
const thresholdInput = document.getElementById("threshold");
const thresholdValue = document.getElementById("threshold-value");
const button = document.getElementById("cluster-button");
const results = document.getElementById("cluster-results");

let terms = [];
let lookup = {};

let STOP_WORDS = new Set();

async function loadTerms() {
  const response = await fetch("data/roget_terms.json");
  terms = await response.json();

  for (const entry of terms) {
    const term = entry.term.toLowerCase();
    lookup[term] ??= [];
    lookup[term].push(entry);
  }
}

async function loadStopwords() {
  const response = await fetch("data/stopwords.json");
  const words = await response.json();

  STOP_WORDS = new Set(words);
}

function shortLabel(index) {
  return String.fromCharCode(65 + index); // A, B, C...
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

  return {
    totalTokens: tokens.length,
    headCounts,
    topHeads: sortedCounter(headCounts).slice(0, 8)
  };
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

async function analyzeFiles(fileList) {
  const analyses = [];

  for (const file of fileList) {
    const text = await file.text();

    analyses.push({
      name: file.name,
      analysis: analyze(text)
    });
  }

  return analyses;
}

function buildSimilarityMatrix(items) {
  const matrix = [];

  for (let i = 0; i < items.length; i++) {
    matrix[i] = [];

    for (let j = 0; j < items.length; j++) {
      matrix[i][j] = cosineSimilarity(
        items[i].analysis.headCounts,
        items[j].analysis.headCounts
      );
    }
  }

  return matrix;
}

function clusterItems(items, matrix, threshold) {
  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < items.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [];
    const stack = [i];

    while (stack.length) {
      const current = stack.pop();

      if (visited.has(current)) continue;

      visited.add(current);
      cluster.push(current);

      for (let j = 0; j < items.length; j++) {
        if (!visited.has(j) && matrix[current][j] >= threshold) {
          stack.push(j);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

function renderClusters(items, clusters) {
  return clusters.map((cluster, index) => {
    const members = cluster.map(i => items[i]);

    return `
      <section class="result-card">
        <h2>Cluster ${index + 1}</h2>
        <p><strong>Texts:</strong> ${members.map(item => item.name).join(", ")}</p>

        <h3>Representative semantic heads</h3>
        <ul>
          ${members.map(item => `
            <li>
              <strong>${item.name}</strong>:
              ${item.analysis.topHeads.map(([head]) => head).join(", ")}
            </li>
          `).join("")}
        </ul>
      </section>
    `;
  }).join("");
}

function renderMatrix(items, matrix) {
  const legend = items.map((item, i) => `
  <p><strong>${shortLabel(i)}</strong>: ${item.name}</p>
`).join("");

  return `
    <section class="result-card">
      <h2>Similarity Matrix</h2>
      <div class="matrix-legend">
        ${legend}
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Text</th>
              ${items.map((item, i) => `
  <th title="${item.name}">${shortLabel(i)}</th>
`).join("")}
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <th title="${item.name}">${shortLabel(i)}</th>
                ${items.map((_, j) => `
                  <td>${(matrix[i][j] * 100).toFixed(2)}%</td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

thresholdInput.addEventListener("input", () => {
  thresholdValue.textContent = `${thresholdInput.value}%`;
});

button.addEventListener("click", async () => {
  if (!filesInput.files.length) {
    results.innerHTML = "<p>Please upload at least two .txt files.</p>";
    return;
  }

  if (filesInput.files.length < 2) {
    results.innerHTML = "<p>Please upload at least two texts for clustering.</p>";
    return;
  }

  results.innerHTML = "<p>Analyzing texts...</p>";

  const items = await analyzeFiles(filesInput.files);
  const matrix = buildSimilarityMatrix(items);
  const threshold = Number(thresholdInput.value) / 100;
  const clusters = clusterItems(items, matrix, threshold);

  results.innerHTML = `
    <section class="result-card">
      <h2>Clustering Summary</h2>
      <p><strong>Texts analyzed:</strong> ${items.length}</p>
      <p><strong>Similarity threshold:</strong> ${thresholdInput.value}%</p>
      <p><strong>Clusters found:</strong> ${clusters.length}</p>
    </section>

    ${renderClusters(items, clusters)}
    ${renderMatrix(items, matrix)}
  `;
});

Promise.all([
  loadTerms(),
  loadStopwords()
]);