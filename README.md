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
