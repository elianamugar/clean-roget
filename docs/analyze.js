const input = document.getElementById("text-input");
const button = document.getElementById("analyze-button");
const results = document.getElementById("results");

let terms = [];
let lookup = {};
let headsChart = null;
let classesChart = null;

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

function renderBarChart(canvasId, title, rows, existingChart) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return null;

  if (existingChart) {
    existingChart.destroy();
  }

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: rows.map(([label]) => label),
      datasets: [
        {
          label: title,
          data: rows.map(([, value]) => value)
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
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

function renderCharts(data) {
  headsChart = renderBarChart(
    "heads-chart",
    "Top Semantic Heads",
    data.topHeads,
    headsChart
  );

  classesChart = renderBarChart(
    "classes-chart",
    "Class Distribution",
    data.classCounts,
    classesChart
  );
}

function fullAnalysisToCSV(analysis) {
  const rows = [["level", "category", "count"]];

  for (const [level, items] of Object.entries(analysis.fullBreakdown)) {
    for (const item of items) {
      rows.push([level, item.category, item.count]);
    }
  }

  return rows
    .map(row =>
      row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")
    )
    .join("\n");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .match(/\b[a-zA-Z'-]+\b/g) || [];
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

  const headCounts = count(deduped.map(item => item.entry.head_name)).slice(0, 10);
  const posCounts = count(deduped.map(item => item.entry.pos));
  const divisionCounts = count(
  deduped
    .map(item => item.entry.division_name)
    .filter(Boolean)
);

    const sectionCounts = count(
    deduped
        .map(item => item.entry.section_name)
        .filter(Boolean)
    );

    const subsectionCounts = count(
    deduped
        .map(item => item.entry.subsection)
        .filter(Boolean)
    );

    const subsubsectionCounts = count(
    deduped
        .map(item => item.entry.subsubsection)
        .filter(Boolean)
    );
  const classCounts = count(deduped.map(item => item.entry.class_name || item.entry.class));
  const termCounts = count(matchedTerms).slice(0, 15);

  return {
    topDivisions: divisionCounts.slice(0, 10),
    topSections: sectionCounts.slice(0, 15),
    topSubsections: subsectionCounts.slice(0, 15),
    topSubsubsections: subsubsectionCounts.slice(0, 15),
    totalTokens: tokens.length,
    matchedTerms: matchedTerms.length,
    uniqueMatchedTerms: new Set(matchedTerms).size,
    tokenCoverage: contentTokens.length
      ? contentTokens.filter(token => lookup[token]).length / contentTokens.length
      : 0,
    semanticDensity: tokens.length ? deduped.length / tokens.length : 0,
    topTerms: termCounts,
    topHeads: headCounts,
    posCounts,
    classCounts,
    fullBreakdown: buildFullBreakdown(deduped),
  };
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

function renderResults(data) {
  results.innerHTML = `
    <section class="result-card">
      <h2>Summary</h2>
      <p>Total tokens: ${data.totalTokens}</p>
      <p>Matched terms/phrases: ${data.matchedTerms}</p>
      <p>Unique matched terms/phrases: ${data.uniqueMatchedTerms}</p>
      <p>Token coverage: ${(data.tokenCoverage * 100).toFixed(2)}%</p>
      <p>Semantic density: ${data.semanticDensity.toFixed(2)} matches/token</p>
    </section>

    ${renderList("Top Matched Terms", data.topTerms)}
    ${renderList("Top Semantic Heads", data.topHeads)}
    ${renderList("Part of Speech Distribution", data.posCounts)}
    ${renderList("Class Distribution", data.classCounts)}
    ${renderList("Top Divisions", data.topDivisions)}
    ${renderList("Top Sections", data.topSections)}
    ${renderList("Top Subsections", data.topSubsections)}
    ${renderList("Top Sub-subsections", data.topSubsubsections)}
  `;
}

button.addEventListener("click", () => {
  const text = input.value.trim();

  if (!text) {
    results.innerHTML = "<p>Please paste some text first.</p>";
    return;
  }

  const analysis = analyze(text);
  renderResults(analysis);
  renderCharts(analysis);
  latestFullAnalysis = analysis;
  downloadButton.style.display = "inline-block";
});

loadTerms();

const fileInput = document.getElementById("file-input");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];

  if (!file) return;

  const text = await file.text();
  input.value = text;
});

const downloadButton = document.getElementById("download-button");
let latestFullAnalysis = null;

function buildFullBreakdown(deduped) {
  const matchedKeys = {
    classes: new Map(),
    divisions: new Map(),
    sections: new Map(),
    subsections: new Map(),
    subsubsections: new Map(),
    heads: new Map(),
    pos: new Map()
  };

  for (const { entry } of deduped) {
    increment(matchedKeys.classes, entry.class_name || entry.class);
    increment(matchedKeys.divisions, entry.division_name || "No Division");
    increment(matchedKeys.sections, entry.section_name || entry.section);
    increment(matchedKeys.subsections, entry.subsection || "Uncategorized");
    increment(matchedKeys.subsubsections, entry.subsubsection || "Uncategorized");
    increment(matchedKeys.heads, entry.head_name);
    increment(matchedKeys.pos, entry.pos);
  }

  return {
    classes: fullCategoryCounts("class_name", matchedKeys.classes),
    divisions: fullCategoryCounts("division_name", matchedKeys.divisions, "No Division"),
    sections: fullCategoryCounts("section_name", matchedKeys.sections),
    subsections: fullCategoryCounts("subsection", matchedKeys.subsections, "Uncategorized"),
    subsubsections: fullCategoryCounts("subsubsection", matchedKeys.subsubsections, "Uncategorized"),
    heads: fullCategoryCounts("head_name", matchedKeys.heads),
    parts_of_speech: fullCategoryCounts("pos", matchedKeys.pos)
  };
}

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function fullCategoryCounts(field, counts, fallback = null) {
  const values = new Set();

  for (const entry of terms) {
    const value = entry[field] || fallback;
    if (value) values.add(value);
  }

  return [...values]
    .map(value => ({
        category: value,
        count: counts.get(value) || 0
    }))
    .filter(item =>
        item.category !== "No Division" &&
        item.category !== "Uncategorized"
    )
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

downloadButton.addEventListener("click", () => {
  if (!latestFullAnalysis) return;

  const csv = fullAnalysisToCSV(latestFullAnalysis);

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "clean-roget-analysis.csv";
  a.click();

  URL.revokeObjectURL(url);
});