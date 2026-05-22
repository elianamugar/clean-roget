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
    const className = block.class_name || "";
    const section = block.section;
    const sectionName = block.section_name || "";
    const subsection = block.subsection || "Uncategorized";
    const head = `${block.head} ${block.head_name}`;

    const classLabel = className ? `${cls}: ${className}` : cls;
    const sectionLabel = sectionName ? `${section}: ${sectionName}` : section;

    if (!grouped[classLabel]) grouped[classLabel] = {};
    if (!grouped[classLabel][sectionLabel]) grouped[classLabel][sectionLabel] = {};
    if (!grouped[classLabel][sectionLabel][subsection]) {
      grouped[classLabel][sectionLabel][subsection] = {};
    }
    if (!grouped[classLabel][sectionLabel][subsection][head]) {
      grouped[classLabel][sectionLabel][subsection][head] = [];
    }

    grouped[classLabel][sectionLabel][subsection][head].push(block);
  }

  return grouped;
}

function render(items) {
  container.innerHTML = "";

  const grouped = groupBlocks(items);

  for (const [classLabel, sections] of Object.entries(grouped)) {
    const classEl = document.createElement("section");
    classEl.className = "thesaurus-class";

    const classTitle = document.createElement("h2");
    classTitle.textContent = classLabel;
    classEl.appendChild(classTitle);

    for (const [sectionLabel, subsections] of Object.entries(sections)) {
      const sectionEl = document.createElement("section");
      sectionEl.className = "thesaurus-section";

      const sectionTitle = document.createElement("h3");
      sectionTitle.textContent = sectionLabel;
      sectionEl.appendChild(sectionTitle);

      for (const [subsectionLabel, heads] of Object.entries(subsections)) {
        const subsectionEl = document.createElement("section");
        subsectionEl.className = "thesaurus-subsection";

        const subsectionTitle = document.createElement("h4");
        subsectionTitle.textContent = subsectionLabel;
        subsectionEl.appendChild(subsectionTitle);

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

          subsectionEl.appendChild(details);
        }

        sectionEl.appendChild(subsectionEl);
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
      (block.class_name || "").toLowerCase().includes(query) ||
      (block.section_name || "").toLowerCase().includes(query) ||
      (block.subsection || "").toLowerCase().includes(query) ||
      block.head_name.toLowerCase().includes(query) ||
      block.raw_text.toLowerCase().includes(query) ||
      block.pos.toLowerCase().includes(query)
    );
  });

  render(filtered);
});

loadThesaurus();