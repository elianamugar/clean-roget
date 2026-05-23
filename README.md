# Clean Roget

An ontology-based computational humanities and semantic analysis platform built from the public-domain 1911 edition of *Roget’s Thesaurus*.

Clean Roget transforms the historical semantic hierarchy of Roget’s ontology into a machine-readable, browser-based toolkit for:

* semantic text analysis
* ontology exploration
* literary comparison
* corpus analysis
* semantic clustering
* network visualization
* contrastive semantic fingerprints

---

## Live Site

* [https://elianamugar.github.io/clean-roget/](https://elianamugar.github.io/clean-roget/)

---

# What is Roget’s Thesaurus?

Unlike modern thesauri, Roget’s original thesaurus was not organized alphabetically.

Instead, words and phrases were organized by:

* ideas
* concepts
* semantic relationships
* ontological categories

The original hierarchy includes:

```text
Class
├── Division
├── Section
├── Subsection
├── Subsubsection
├── Semantic Head
└── Part of Speech
```

This project uses the public-domain Project Gutenberg edition of Roget’s Thesaurus:

* [https://www.gutenberg.org/ebooks/22](https://www.gutenberg.org/ebooks/22)

---

# Why this project?

Clean Roget began as an attempt to turn a historically important but difficult-to-use semantic reference work into a clean, machine-readable ontology.

The goal was not only to preserve Roget’s hierarchy, but to make it usable for:

* computational humanities
* literary analysis
* semantic browsing
* ontology exploration
* exploratory text comparison
* semantic visualization

Instead of asking only *what words appear in a text*, Clean Roget asks:

> What kinds of ideas and semantic categories shape that text?

---

# Features

## Semantic Thesaurus Browser

Browse Roget’s ontology in a cleaner and more readable format.

Includes:

* classes
* divisions
* sections
* subsections
* semantic heads
* parts of speech
* semantic entries

---

## Text Analysis

Analyze a pasted text or uploaded `.txt` file.

Outputs include:

* semantic head distributions
* class distributions
* POS distributions
* semantic density
* token coverage
* semantic fingerprints
* CSV exports

Supports:

* noun-only analysis
* verb-only analysis
* adjective-only analysis
* adverb-only analysis

---

## Compare Texts or Authors

Compare two texts or authors semantically.

Features include:

* dominant thematic overlap
* shared semantic heads
* distinctive semantic heads
* semantic fingerprints
* contrastive semantic visualization
* radar charts
* semantic similarity metrics

---

## Corpus Comparison

Compare corpora made from multiple text files.

Useful for:

* author comparison
* genre comparison
* literary studies
* corpus linguistics

---

## Semantic Network Graph

Explore Roget’s semantic ontology as an interactive graph.

Features include:

* semantic head search
* neighborhood highlighting
* edge filtering
* graph export
* ontology exploration

---

## Semantic Clustering

Upload multiple texts and cluster them by semantic similarity.

Includes:

* similarity matrices
* cluster grouping
* representative semantic heads

---

# Best used with Project Gutenberg texts

Clean Roget works especially well with:

* novels
* plays
* essays
* speeches
* philosophical texts
* public-domain literature

Project Gutenberg is especially useful because it provides free plain-text literary works:

* [https://www.gutenberg.org/](https://www.gutenberg.org/)

---

# How it works

The original Project Gutenberg source contains:

* dense historical formatting
* inconsistent typography
* OCR irregularities
* long semantic blocks
* archaic notation

The parsing pipeline:

1. extracts Roget’s hierarchy
2. reconstructs semantic metadata
3. cleans semantic entries
4. normalizes parts of speech
5. extracts term-level data
6. exports machine-readable JSON and CSV datasets

The browser-based analysis tools then use this cleaned ontology to perform semantic analysis directly in the client.

---

# Tech Stack

Frontend:

* HTML
* CSS
* JavaScript
* Chart.js
* Vis.js

Data processing:

* Python
* JSON
* CSV

---

# Project Structure

```text
clean-roget/
├── data/
│   ├── raw/
│   ├── interim/
│   └── processed/
├── docs/
│   ├── index.html
│   ├── thesaurus.html
│   ├── analyze.html
│   ├── compare.html
│   ├── corpus.html
│   ├── cluster.html
│   ├── network.html
│   ├── about.html
│   ├── style.css
│   └── *.js
├── src/
│   ├── parse.py
│   ├── clean.py
│   └── export.py
└── README.md
```

---

# Local Development

## Clone the repository

```bash
git clone https://github.com/elianamugar/clean-roget.git
cd clean-roget
```

## Create virtual environment

```bash
python -m venv venv
source venv/bin/activate
```

## Install dependencies

```bash
pip install -r requirements.txt
```

## Run parsing pipeline

```bash
python src/parse.py
python src/clean.py
python src/export.py
```

## Launch local server

```bash
python -m http.server 8000 -d docs
```

Then open:

```text
http://localhost:8000
```

---
# Higher-Precision spaCy Analysis

The browser tools run entirely client-side for accessibility and free static hosting. For higher-precision local analysis, Clean Roget also supports a spaCy-powered command-line mode.

This mode uses spaCy for:

- tokenization
- stopword filtering
- lemmatization
- contextual part-of-speech tagging

This improves semantic precision by matching input-text lemmas and contextual POS tags against Roget semantic entries.

## Install spaCy

```bash
pip install spacy
python -m spacy download en_core_web_sm
```

## Run spaCy-powered analysis

```bash
python src/analyze.py sample_texts/pride_and_prejudice.txt --spacy
```

Example improvements include:

- cleaner tokenization
- lemma normalization
- reduced POS ambiguity
- more accurate semantic matching
- improved semantic fingerprints
- improved clustering precision

## Why isn't spaCy used on the live site?

The GitHub Pages version of Clean Roget is a static site and cannot run Python server-side. The browser tools therefore use lightweight client-side semantic matching.

A future backend version may expose spaCy-powered analysis through a FastAPI service.

# Limitations

Roget’s ontology is historically rich, but it was not designed as a modern NLP model.

Some semantic categories are:

* extremely broad
* historically uneven
* highly recurrent in literary texts

This can cause different literary works to appear more semantically similar than they intuitively feel.

Clean Roget is therefore both:

* a semantic analysis tool
* an ongoing computational humanities experiment

---

# Future Work

Potential future improvements include:

* semantic stop-head filtering
* corpus-level TF-IDF weighting
* dimensionality reduction (PCA / UMAP / t-SNE)
* dendrograms and hierarchical clustering
* stronger corpus comparison tools
* embedding hybridization
* semantic drift analysis
* chapter-level semantic progression

---

# Credits

Original semantic source:

* Project Gutenberg Roget’s Thesaurus
* [https://www.gutenberg.org/ebooks/22](https://www.gutenberg.org/ebooks/22)

Created by Eliana Mugar.
