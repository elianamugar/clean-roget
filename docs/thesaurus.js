const container = document.getElementById("thesaurus");
const searchInput = document.getElementById("search");

let blocks = [];

async function loadThesaurus() {
  const response = await fetch("data/clean_semantic_blocks.json");
  blocks = await response.json();
  render(blocks);
}

function groupBlocks(items) {
  const grouped = {};

  for (const block of items) {
    const cls = block.class;
    const section = block.section;
    const head = `${block.head} ${block.head_name}`;

    if (!grouped[cls]) grouped[cls] = {};
    if (!grouped[cls][section]) grouped[cls][section] = {};
    if (!grouped[cls][section][head]) grouped[cls][section][head] = [];

    grouped[cls][section][head].push(block);
  }

  return grouped;
}

function render(items) {
  container.innerHTML = "";

  const grouped = groupBlocks(items);

  for (const [cls, sections] of Object.entries(grouped)) {
    const classEl = document.createElement("section");
    classEl.className = "thesaurus-class";

    const classTitle = document.createElement("h2");
    classTitle.textContent = cls;
    classEl.appendChild(classTitle);

    for (const [section, heads] of Object.entries(sections)) {
      const sectionEl = document.createElement("section");
      sectionEl.className = "thesaurus-section";

      const sectionTitle = document.createElement("h3");
      sectionTitle.textContent = section;
      sectionEl.appendChild(sectionTitle);

      for (const [head, entries] of Object.entries(heads)) {
        const details = document.createElement("details");
        details.className = "thesaurus-head";

        const summary = document.createElement("summary");
        summary.textContent = head;
        details.appendChild(summary);

        for (const entry of entries) {
          const posBlock = document.createElement("div");
          posBlock.className = "pos-block";

          const pos = document.createElement("strong");
          pos.textContent = entry.pos;

          const text = document.createElement("p");
          text.textContent = entry.raw_text;

          posBlock.appendChild(pos);
          posBlock.appendChild(text);
          details.appendChild(posBlock);
        }

        sectionEl.appendChild(details);
      }

      classEl.appendChild(sectionEl);
    }

    container.appendChild(classEl);
  }
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();

  const filtered = blocks.filter((block) => {
    return (
      block.head_name.toLowerCase().includes(query) ||
      block.raw_text.toLowerCase().includes(query) ||
      block.pos.toLowerCase().includes(query)
    );
  });

  render(filtered);
});

loadThesaurus();