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
    const classDetails = document.createElement("details");
    classDetails.className = "thesaurus-class";
    classDetails.open = false;

    const classSummary = document.createElement("summary");
    classSummary.textContent = classLabel;
    classDetails.appendChild(classSummary);

    for (const [divisionLabel, sections] of Object.entries(divisions)) {
      let divisionParent = classDetails;

      if (divisionLabel !== "No Division") {
        const divisionDetails = document.createElement("details");
        divisionDetails.className = "thesaurus-division";

        const divisionSummary = document.createElement("summary");
        divisionSummary.textContent = divisionLabel;
        divisionDetails.appendChild(divisionSummary);

        classDetails.appendChild(divisionDetails);
        divisionParent = divisionDetails;
      }

      for (const [sectionLabel, subsections] of Object.entries(sections)) {
        const sectionDetails = document.createElement("details");
        sectionDetails.className = "thesaurus-section";

        const sectionSummary = document.createElement("summary");
        sectionSummary.textContent = sectionLabel;
        sectionDetails.appendChild(sectionSummary);

        for (const [subsectionLabel, subsubsections] of Object.entries(subsections)) {
          const subsectionDetails = document.createElement("details");
          subsectionDetails.className = "thesaurus-subsection";

          const subsectionSummary = document.createElement("summary");
          subsectionSummary.textContent = subsectionLabel;
          subsectionDetails.appendChild(subsectionSummary);

          for (const [subsubsectionLabel, heads] of Object.entries(subsubsections)) {
            let subsubsectionParent = subsectionDetails;

            if (subsubsectionLabel !== "Uncategorized") {
              const subsubsectionDetails = document.createElement("details");
              subsubsectionDetails.className = "thesaurus-subsubsection";

              const subsubsectionSummary = document.createElement("summary");
              subsubsectionSummary.textContent = subsubsectionLabel;
              subsubsectionDetails.appendChild(subsubsectionSummary);

              subsectionDetails.appendChild(subsubsectionDetails);
              subsubsectionParent = subsubsectionDetails;
            }

            for (const [headLabel, posGroups] of Object.entries(heads)) {
              const headDetails = document.createElement("details");
              headDetails.className = "thesaurus-head";

              const headSummary = document.createElement("summary");
              headSummary.textContent = headLabel;
              headDetails.appendChild(headSummary);

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

                termsP.textContent = uniqueTerms.join(", ").replace(/\.\:/g, ":");

                posBlock.appendChild(posTitle);
                posBlock.appendChild(termsP);
                headDetails.appendChild(posBlock);
              }

              subsubsectionParent.appendChild(headDetails);
            }
          }

          sectionDetails.appendChild(subsectionDetails);
        }

        divisionParent.appendChild(sectionDetails);
      }
    }

    container.appendChild(classDetails);
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