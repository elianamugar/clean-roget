const input = document.getElementById("text-input");
const button = document.getElementById("analyze-button");
const results = document.getElementById("results");

let terms = [];
let lookup = {};

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
  const classCounts = count(deduped.map(item => item.entry.class_name || item.entry.class));
  const termCounts = count(matchedTerms).slice(0, 15);

  return {
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
    classCounts
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
});

loadTerms();