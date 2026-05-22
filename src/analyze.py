import argparse
import json
import re
from collections import Counter
from pathlib import Path
from text_cleaning import clean_gutenberg_text
from nltk.corpus import stopwords

CUSTOM_STOP_WORDS = {
    "mr",
    "mrs",
    "miss",
    "said",
    "much",
    "must",
    "one",
    "though",
    "might",
    "well",
}

STOP_WORDS = set(stopwords.words("english")) | CUSTOM_STOP_WORDS
ROGET_PATH = Path("data/processed/roget_terms.json")



def load_roget_terms():
    with ROGET_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def tokenize(text):
    return re.findall(r"\b[a-zA-Z'-]+\b", text.lower())


def build_lookup(roget_terms):
    lookup = {}

    for entry in roget_terms:
        term = entry["term"].lower()

        if term not in lookup:
            lookup[term] = []

        lookup[term].append(entry)

    return lookup


def generate_ngrams(tokens, min_n=1, max_n=3):
    """Generate n-grams from tokens."""
    ngrams = []

    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            ngram = " ".join(tokens[i:i + n])
            ngrams.append(ngram)

    return ngrams


def analyze_text(text, lookup):
    tokens = tokenize(text)

    # Keep stopwords out of unigram matching,
    # but preserve them for phrase matching.
    content_tokens = [token for token in tokens if token not in STOP_WORDS]

    candidates = []

    # Single-word matches without stopwords
    candidates.extend(content_tokens)

    # Phrase matches using original token sequence
    candidates.extend(generate_ngrams(tokens, min_n=2, max_n=3))

    matched_entries = []
    matched_terms = []

    for candidate in candidates:
        if candidate in lookup:
            matched_terms.append(candidate)
            matched_entries.extend(lookup[candidate])

    head_counts = Counter(entry["head_name"] for entry in matched_entries)
    pos_counts = Counter(entry["pos"] for entry in matched_entries)
    class_counts = Counter(entry["class"] for entry in matched_entries)
    term_counts = Counter(matched_terms)

    match_rate = len(set(matched_terms)) / len(tokens) if tokens else 0

    return {
        "total_tokens": len(tokens),
        "matched_terms": len(matched_terms),
        "unique_matched_terms": len(set(matched_terms)),
        "total_semantic_matches": len(matched_entries),
        "unique_term_rate": match_rate,
        "unique_matched_heads": len(head_counts),
        "top_terms": term_counts.most_common(15),
        "top_heads": head_counts.most_common(10),
        "pos_counts": pos_counts.most_common(),
        "class_counts": class_counts.most_common(),
    }


def print_results(results):
    print("\nSemantic Text Analysis")
    print("======================")
    print(f"Total tokens: {results['total_tokens']}")
    print(f"Matched terms/phrases: {results['matched_terms']}")
    print(f"Unique matched terms/phrases: {results['unique_matched_terms']}")
    print(f"Approx. match rate: {results['match_rate']:.2%}")
    print(f"Total semantic matches: {results['total_semantic_matches']}")
    print(f"Unique semantic heads: {results['unique_matched_heads']}")

    print("\nTop matched terms/phrases:")
    for term, count in results["top_terms"]:
        print(f"- {term}: {count}")

    print("\nTop semantic heads:")
    for head, count in results["top_heads"]:
        print(f"- {head}: {count}")

    print("\nPart-of-speech distribution:")
    for pos, count in results["pos_counts"]:
        print(f"- {pos}: {count}")

    print("\nClass distribution:")
    for cls, count in results["class_counts"]:
        print(f"- {cls}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze a text file using the Clean Roget semantic ontology."
    )

    parser.add_argument("filepath", help="Path to a .txt file")

    args = parser.parse_args()

    text = Path(args.filepath).read_text(encoding="utf-8")
    text = clean_gutenberg_text(text)

    roget_terms = load_roget_terms()
    lookup = build_lookup(roget_terms)

    results = analyze_text(text, lookup)

    print_results(results)


if __name__ == "__main__":
    main()