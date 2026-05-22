const networkContainer = document.getElementById("network");
const classFilter = document.getElementById("class-filter");
const nodeDetails = document.getElementById("node-details");
const headSearch = document.getElementById("head-search");
const edgeFilter = document.getElementById("edge-filter");
const edgeFilterValue = document.getElementById("edge-filter-value");
const exportGraphButton = document.getElementById("export-graph-button");

let terms = [];
let network = null;
let minEdgeWeight = 2;

async function loadData() {
  const response = await fetch("data/roget_terms.json");
  terms = await response.json();

  populateClassFilter();
  renderNetwork("all");
}

function focusNodeByLabel(label) {
  if (!network) return;

  const nodes = network.body.data.nodes.get();

  const match = nodes.find(node =>
    node.label.toLowerCase().includes(label.toLowerCase())
  );

  if (!match) return;

  network.selectNodes([match.id]);

  network.focus(match.id, {
    scale: 1.3,
    animation: {
      duration: 800
    }
  });

    network.body.data.nodes.update({
    id: clickedNode,
    color: {
        background: "#d4a762",
        border: "#8a5a1f"
    }
    });
}

function populateClassFilter() {
  const classes = [...new Set(
    terms.map(item => item.class_name || item.class).filter(Boolean)
  )].sort();

  for (const cls of classes) {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classFilter.appendChild(option);
  }
}

function buildGraph(selectedClass) {
  const filteredTerms = terms.filter(item => {
    const cls = item.class_name || item.class;
    return selectedClass === "all" || cls === selectedClass;
  });

  const headToTerms = new Map();
  const termToHeads = new Map();
  const headMetadata = new Map();

  for (const item of filteredTerms) {
    const head = item.head_name;
    const term = item.term;

    if (!head || !term) continue;

    if (!headToTerms.has(head)) headToTerms.set(head, new Set());
    headToTerms.get(head).add(term);

    if (!termToHeads.has(term)) termToHeads.set(term, new Set());
    termToHeads.get(term).add(head);

    if (!headMetadata.has(head)) {
      headMetadata.set(head, {
        head,
        className: item.class_name || item.class,
        divisionName: item.division_name,
        sectionName: item.section_name,
        subsection: item.subsection,
        subsubsection: item.subsubsection
      });
    }
  }

  const edgeWeights = new Map();

  for (const heads of termToHeads.values()) {
    const headList = [...heads];

    if (headList.length < 2 || headList.length > 8) continue;

    for (let i = 0; i < headList.length; i++) {
      for (let j = i + 1; j < headList.length; j++) {
        const pair = [headList[i], headList[j]].sort().join("|||");
        edgeWeights.set(pair, (edgeWeights.get(pair) || 0) + 1);
      }
    }
  }

  const topHeads = [...headToTerms.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 80)
    .map(([head]) => head);

  const allowedHeads = new Set(topHeads);

  const nodes = topHeads.map(head => ({
    id: head,
    label: head,
    value: headToTerms.get(head).size,
    title: `${head}<br>${headToTerms.get(head).size} terms`
  }));

  const edges = [...edgeWeights.entries()]
    .map(([pair, weight]) => {
      const [from, to] = pair.split("|||");
      return { from, to, value: weight, title: `${weight} shared terms` };
    })
    .filter(edge =>
      allowedHeads.has(edge.from) &&
      allowedHeads.has(edge.to) &&
      edge.value >= minEdgeWeight
    )
    .sort((a, b) => b.value - a.value)
    .slice(0, 160);

  return { nodes, edges, headToTerms, headMetadata };
}

function renderNetwork(selectedClass) {
  const graph = buildGraph(selectedClass);

  const data = {
    nodes: new vis.DataSet(graph.nodes),
    edges: new vis.DataSet(graph.edges)
  };

  const options = {
    nodes: {
      shape: "dot",
      scaling: {
        min: 8,
        max: 32
      },
      font: {
        size: 14,
        face: "Georgia"
      }
    },
    edges: {
      color: {
        color: "#bca88f"
      },
      smooth: true,
      scaling: {
        min: 1,
        max: 8
      }
    },
    physics: {
      stabilization: true,
      barnesHut: {
        gravitationalConstant: -4500,
        springLength: 160,
        springConstant: 0.04
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      navigationButtons: true,
      keyboard: true
    }
  };

  network = new vis.Network(networkContainer, data, options);

  network.on("click", params => {
    if (!params.nodes.length) return;
    const clickedNode = params.nodes[0];

    const connectedNodes = network.getConnectedNodes(clickedNode);

    const allNodes = network.body.data.nodes.get();

    const updates = allNodes.map(node => {
    const isConnected =
        node.id === clickedNode ||
        connectedNodes.includes(node.id);

    return {
        id: node.id,
        opacity: isConnected ? 1 : 0.2
    };
    });

    network.body.data.nodes.update(updates);
    const head = params.nodes[0];
    const metadata = graph.headMetadata.get(head);
    const relatedTerms = [...(graph.headToTerms.get(head) || [])]
      .sort()
      .slice(0, 50);

    nodeDetails.innerHTML = `
      <p><strong>Head:</strong> ${head}</p>
      <p><strong>Class:</strong> ${metadata?.className || ""}</p>
      <p><strong>Division:</strong> ${metadata?.divisionName || "None"}</p>
      <p><strong>Section:</strong> ${metadata?.sectionName || ""}</p>
      <p><strong>Subsection:</strong> ${metadata?.subsection || "None"}</p>
      <p><strong>Sub-subsection:</strong> ${metadata?.subsubsection || "None"}</p>
      <p><strong>Sample terms:</strong> ${relatedTerms.join(", ")}</p>
    `;
  });
}

classFilter.addEventListener("change", () => {
  renderNetwork(classFilter.value);
});

loadData();

headSearch.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    focusNodeByLabel(headSearch.value.trim());
  }
});

edgeFilter.addEventListener("input", () => {
  minEdgeWeight = Number(edgeFilter.value);
  edgeFilterValue.textContent = minEdgeWeight;
  renderNetwork(classFilter.value);
});

exportGraphButton.addEventListener("click", () => {
  if (!network) return;

  const canvas = networkContainer.querySelector("canvas");

  if (!canvas) return;

  const link = document.createElement("a");
  link.download = "clean-roget-semantic-network.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});