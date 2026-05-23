import json
import math
from collections import Counter
from pathlib import Path

from text_cleaning import clean_gutenberg_text
from nlp import (
    STOP_WORDS,
    LEMMATIZER,
    lemmatize_phrase,
    preprocess_text,
    generate_ngrams,
    spacy_pos_to_roget_pos,
    get_content_tokens,
)

ROGET_PATH = Path("data/processed/roget_terms.json")

def load_roget_terms():
    with ROGET_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)
    
def build_lookup(roget_terms):
    lookup = {}

    for entry in roget_terms:
        term = entry["term"].lower()
        normalized_term = lemmatize_phrase(term)

        if normalized_term not in lookup:
            lookup[normalized_term] = []

        lookup[normalized_term].append(entry)

    return lookup

def build_head_document_frequency(lookup):
    """
    Count how many unique terms map to each semantic head.
    Broad heads get higher counts and lower weights.
    """
    head_terms = {}

    for term, entries in lookup.items():
        for entry in entries:
            head = entry["head_name"]

            if head not in head_terms:
                head_terms[head] = set()

            head_terms[head].add(term)

    return {
        head: len(terms)
        for head, terms in head_terms.items()
    }

def analyze_text(input_path, lookup, use_spacy=False):
    text = Path(input_path).read_text(encoding="utf-8")
    text = clean_gutenberg_text(text)

    processed = preprocess_text(text, use_spacy=use_spacy)

    token_words = processed["token_words"]
    spacy_tokens = processed["spacy_tokens"]
    # Keep stopwords out of unigram matching,
    # but preserve them for phrase matching.

    content_tokens = get_content_tokens(token_words)
    candidates = []

    # Single-word matches without stopwords
    candidates.extend(content_tokens)

    # Phrase matches using original token sequence
    candidates.extend(generate_ngrams(token_words, min_n=2, max_n=3))

    matched_entries = []
    matched_terms = []

    if use_spacy:
        for token in spacy_tokens:
            lemma = LEMMATIZER.lemmatize(token["lemma"])

            if lemma not in lookup:
                continue

            allowed_pos = spacy_pos_to_roget_pos(token["pos"])

            matched_any_entry = False

            for entry in lookup[lemma]:
                if not allowed_pos or entry["pos"] in allowed_pos:
                    matched_entries.append(entry)
                    matched_any_entry = True

            if matched_any_entry:
                matched_terms.append(lemma)

        # Phrase matches stay POS-flexible for now
        phrase_candidates = generate_ngrams(token_words, min_n=2, max_n=3)

        for candidate in phrase_candidates:
            if candidate in lookup:
                matched_terms.append(candidate)
                matched_entries.extend(lookup[candidate])

    else:
        for candidate in candidates:
            if candidate in lookup:
                matched_terms.append(candidate)
                matched_entries.extend(lookup[candidate])

    deduped_matches = []
    seen = set()
    
    for term, entry in zip(matched_terms, matched_entries):
        key = (term, entry["head_name"], entry["pos"])
    
        if key not in seen:
            seen.add(key)
            deduped_matches.append((term, entry))

    head_df = build_head_document_frequency(lookup)
    total_terms_in_lookup = len(lookup)
    
    weighted_head_scores = Counter()
    
    for term, entry in deduped_matches:
        head = entry["head_name"]
    
        # Inverse semantic frequency:
        # common/broad heads receive smaller weights.
        weight = math.log(
            (1 + total_terms_in_lookup) / (1 + head_df.get(head, 1))
        ) + 1
    
        weighted_head_scores[head] += weight

    head_counts = Counter(entry["head_name"] for term, entry in deduped_matches)
    pos_counts = Counter(entry["pos"] for term, entry in deduped_matches)
    class_counts = Counter(entry["class"] for term, entry in deduped_matches)
    term_counts = Counter(matched_terms)
    class_name_counts = Counter(
        entry["class_name"]
        for term, entry in deduped_matches
        if entry.get("class_name")
    )
    
    section_name_counts = Counter(
        entry["section_name"]
        for term, entry in deduped_matches
        if entry.get("section_name")
    )
    
    subsection_counts = Counter(
        entry["subsection"]
        for term, entry in deduped_matches
        if entry.get("subsection")
    )

    content_tokens = [token for token in token_words if token not in STOP_WORDS]
    matched_content_tokens = [token for token in content_tokens if token in lookup]
    
    token_coverage = (
        len(matched_content_tokens) / len(content_tokens)
        if content_tokens else 0
    )
    
    unique_term_rate = (
        len(set(matched_terms)) / len(token_words)
        if token_words else 0
    )
    
    semantic_density = len(deduped_matches) / len(token_words) if token_words else 0
    
    return {
        "total_tokens": len(token_words),
        "matched_terms": len(matched_terms),
        "unique_matched_terms": len(set(matched_terms)),
        "total_semantic_matches": len(deduped_matches),
        "token_coverage": token_coverage,
        "unique_term_rate": unique_term_rate,
        "semantic_density": semantic_density,
        "unique_matched_heads": len(head_counts),
        "top_terms": term_counts.most_common(15),
        "top_heads": head_counts.most_common(10),
        "head_counts_raw": dict(head_counts),
        "pos_counts": pos_counts.most_common(),
        "pos_counts_raw": dict(pos_counts),
        "class_counts": class_counts.most_common(),
        "class_counts_raw": dict(class_counts),
        "top_weighted_heads": weighted_head_scores.most_common(10),
        "top_class_names": class_name_counts.most_common(),
        "top_section_names": section_name_counts.most_common(10),
        "top_subsections": subsection_counts.most_common(10),
    }