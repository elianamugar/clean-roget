const container = document.getElementById("thesaurus");
const searchInput = document.getElementById("search");

let terms = [];

async function loadThesaurus() {
  const response = await fetch("data/roget_terms.json");
  terms = await response.json();
  render(terms);
}

function label(value, fallback = "Uncategorized") {
  return value || fallback;
}

function groupTerms(items) {
  const grouped = {};

  for (const item of items) {
    const classLabel = item.class_name
      ? `${item.class}: ${item.class_name}`
      : item.class;

    const divisionLabel = item.division
      ? `${item.division}: ${item.division_name || ""}`.trim()
      : "No Division";

    const sectionLabel = item.section_name
      ? `${item.section}: ${item.section_name}`
      : item.section;

    const subsectionLabel = label(item.subsection);
    const subsubsectionLabel = label(item.subsubsection);
    const headLabel = `${item.head} ${item.head_name}`;
    const posLabel = item.pos || "unknown";

    grouped[classLabel] ??= {};
    grouped[classLabel][divisionLabel] ??= {};
    grouped[classLabel][divisionLabel][sectionLabel] ??= {};
    grouped[classLabel][divisionLabel][sectionLabel][subsectionLabel] ??= {};
    grouped[classLabel][divisionLabel][sectionLabel][subsectionLabel][subsubsectionLabel] ??= {};
    grouped[classLabel][divisionLabel][sectionLabel][subsectionLabel][subsubsectionLabel][headLabel] ??= {};
    grouped[classLabel][divisionLabel][sectionLabel][subsectionLabel][subsubsectionLabel][headLabel][posLabel] ??= [];

    grouped[classLabel][divisionLabel][sectionLabel][subsectionLabel][subsubsectionLabel][headLabel][posLabel].push(item.term);
  }

  return grouped;
}

function render(items) {
  container.innerHTML = "";

  const grouped = groupTerms(items);

  for (const [classLabel, divisions] of Object.entries(grouped)) {
    const classEl = document.createElement("section");
    classEl.className = "thesaurus-class";

    const classTitle = document.createElement("h2");
    classTitle.textContent = classLabel;
    classEl.appendChild(classTitle);

    for (const [divisionLabel, sections] of Object.entries(divisions)) {
      if (divisionLabel !== "No Division") {
        const divisionTitle = document.createElement("h3");
        divisionTitle.className = "division-title";
        divisionTitle.textContent = divisionLabel;
        classEl.appendChild(divisionTitle);
      }

      for (const [sectionLabel, subsections] of Object.entries(sections)) {
        const sectionEl = document.createElement("section");
        sectionEl.className = "thesaurus-section";

        const sectionTitle = document.createElement("h3");
        sectionTitle.textContent = sectionLabel;
        sectionEl.appendChild(sectionTitle);

        for (const [subsectionLabel, subsubsections] of Object.entries(subsections)) {
          const subsectionEl = document.createElement("section");
          subsectionEl.className = "thesaurus-subsection";

          const subsectionTitle = document.createElement("h4");
          subsectionTitle.textContent = subsectionLabel;
          subsectionEl.appendChild(subsectionTitle);

          for (const [subsubsectionLabel, heads] of Object.entries(subsubsections)) {
            if (subsubsectionLabel !== "Uncategorized") {
              const subsubTitle = document.createElement("h5");
              subsubTitle.className = "subsubsection-title";
              subsubTitle.textContent = subsubsectionLabel;
              subsectionEl.appendChild(subsubTitle);
            }

            for (const [headLabel, posGroups] of Object.entries(heads)) {
              const details = document.createElement("details");
              details.className = "thesaurus-head";

              const summary = document.createElement("summary");
              summary.textContent = headLabel;
              details.appendChild(summary);

              for (const [pos, termList] of Object.entries(posGroups)) {
                const posBlock = document.createElement("div");
                posBlock.className = "pos-block";

                const posTitle = document.createElement("strong");
                posTitle.textContent = pos;

                const termsP = document.createElement("p");
                termsP.className = "term-list";

                const uniqueTerms = [...new Set(termList)].sort((a, b) =>
                  a.localeCompare(b)
                );

                termsP.textContent = uniqueTerms.join(", ");

                posBlock.appendChild(posTitle);
                posBlock.appendChild(termsP);
                details.appendChild(posBlock);
              }

              subsectionEl.appendChild(details);
            }
          }

          sectionEl.appendChild(subsectionEl);
        }

        classEl.appendChild(sectionEl);
      }
    }

    container.appendChild(classEl);
  }
}

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();

  const filtered = terms.filter((item) => {
    return (
      (item.class || "").toLowerCase().includes(query) ||
      (item.class_name || "").toLowerCase().includes(query) ||
      (item.division || "").toLowerCase().includes(query) ||
      (item.division_name || "").toLowerCase().includes(query) ||
      (item.section || "").toLowerCase().includes(query) ||
      (item.section_name || "").toLowerCase().includes(query) ||
      (item.subsection || "").toLowerCase().includes(query) ||
      (item.subsubsection || "").toLowerCase().includes(query) ||
      (item.head || "").toLowerCase().includes(query) ||
      (item.head_name || "").toLowerCase().includes(query) ||
      (item.pos || "").toLowerCase().includes(query) ||
      (item.term || "").toLowerCase().includes(query)
    );
  });

  render(filtered);
});

loadThesaurus();