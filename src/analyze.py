import argparse
import json
import re
from collections import Counter
from pathlib import Path
from text_cleaning import clean_gutenberg_text
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

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
LEMMATIZER = WordNetLemmatizer()
ROGET_PATH = Path("data/processed/roget_terms.json")



def load_roget_terms():
    with ROGET_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def tokenize(text):
    return re.findall(r"\b[a-zA-Z'-]+\b", text.lower())

def lemmatize_phrase(phrase):
    words = phrase.split()
    return " ".join(LEMMATIZER.lemmatize(word) for word in words)

def build_lookup(roget_terms):
    lookup = {}

    for entry in roget_terms:
        term = entry["term"].lower()
        normalized_term = lemmatize_phrase(term)

        if normalized_term not in lookup:
            lookup[normalized_term] = []

        lookup[normalized_term].append(entry)

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
    tokens = [LEMMATIZER.lemmatize(token) for token in tokens]

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

    deduped_matches = []
    seen = set()
    
    for term, entry in zip(matched_terms, matched_entries):
        key = (term, entry["head_name"], entry["pos"])
    
        if key not in seen:
            seen.add(key)
            deduped_matches.append((term, entry))

    head_counts = Counter(entry["head_name"] for term, entry in deduped_matches)
    pos_counts = Counter(entry["pos"] for term, entry in deduped_matches)
    class_counts = Counter(entry["class"] for term, entry in deduped_matches)
    term_counts = Counter(matched_terms)

    content_tokens = [token for token in tokens if token not in STOP_WORDS]
    matched_content_tokens = [token for token in content_tokens if token in lookup]
    
    token_coverage = (
        len(matched_content_tokens) / len(content_tokens)
        if content_tokens else 0
    )
    
    unique_term_rate = (
        len(set(matched_terms)) / len(tokens)
        if tokens else 0
    )
    
    semantic_density = len(deduped_matches) / len(tokens) if tokens else 0
    
    return {
        "total_tokens": len(tokens),
        "matched_terms": len(matched_terms),
        "unique_matched_terms": len(set(matched_terms)),
        "total_semantic_matches": len(deduped_matches),
        "token_coverage": token_coverage,
        "unique_term_rate": unique_term_rate,
        "semantic_density": semantic_density,
        "unique_matched_heads": len(head_counts),
        "top_terms": term_counts.most_common(15),
        "top_heads": head_counts.most_common(10),
        "pos_counts": pos_counts.most_common(),
        "class_counts": class_counts.most_common(),
        "matched_terms_raw": matched_terms,
        "matched_entries_raw": matched_entries,
    }

def debug_head(matched_terms, matched_entries, target_head):
    counter = Counter()

    for term, entry in zip(matched_terms, matched_entries):

        if entry["head_name"] == target_head:
            counter[term] += 1

    print(f"\nTop terms contributing to: {target_head}")

    for term, count in counter.most_common(30):
        print(f"- {term}: {count}")


def print_results(results):
    print("\nSemantic Text Analysis")
    print("======================")
    print(f"Total tokens: {results['total_tokens']}")
    print(f"Matched terms/phrases: {results['matched_terms']}")
    print(f"Unique matched terms/phrases: {results['unique_matched_terms']}")
    print(f"Token coverage: {results['token_coverage']:.2%}")
    print(f"Unique term rate: {results['unique_term_rate']:.2%}")
    print(f"Semantic density: {results['semantic_density']:.2f} matches/token")
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