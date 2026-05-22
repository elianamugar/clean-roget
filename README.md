# Clean Roget

A structured, machine-readable version of Roget’s Thesaurus designed for semantic text analysis.

## Project Goals

Clean Roget preserves Roget’s original semantic hierarchy instead of flattening it into a simple synonym list.

The dataset keeps:

- class
- section
- head number
- head name
- part of speech
- term / phrase

This allows users to analyze text by semantic category, not just word frequency.

## Current Pipeline

```text
data/raw/roget.html
        ↓
src/parse.py
        ↓
data/interim/semantic_blocks.json
        ↓
src/clean.py
        ↓
data/processed/clean_semantic_blocks.json
        ↓
src/export.py
        ↓
data/processed/roget_terms.csv
data/processed/roget_terms.json
```

## Usage
1. Download the source text:
`python src/fetch.py`
2. Parse Roget's hierarchy:
`python src/parse.py`
3. Clean the semantic blocks:
`python src/clean.py`
4. Export term-level data:
`python src/export.py`
5. Analyze a text file:
`python src/analyze.py path/to/text.txt`

## Example Dataset Row
```{
  "class": "CLASS I",
  "section": "SECTION I.",
  "head": "#1.",
  "head_name": "Existence",
  "pos": "adjective",
  "term": "existent"
}
```

## Planned Features
- Semantic text metrics
- Adjective category analysis
- Web interface / GUI
- GitHub Pages deployment
- Searchable Roget browser
- Visual semantic maps
