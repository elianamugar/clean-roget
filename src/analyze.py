import argparse
import json
import math
from collections import Counter
from pathlib import Path
from text_cleaning import clean_gutenberg_text
from nlp import (
    LEMMATIZER,
    STOP_WORDS,
    preprocess_text,
    generate_ngrams,
    get_content_tokens,
    lemmatize_phrase,
    spacy_pos_to_roget_pos,
)
from semantic_analysis import (
    load_roget_terms,
    build_lookup,
    analyze_text,
)

OUTPUT_PATH = Path("data/processed/analysis_results.json")

ROGET_PATH = Path("data/processed/roget_terms.json")

try:
    import spacy
except ImportError:
    spacy = None

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
    print("\nClass name distribution:")
    for cls, count in results["top_class_names"]:
        print(f"- {cls}: {count}")
    
    print("\nTop section names:")
    for section, count in results["top_section_names"]:
        print(f"- {section}: {count}")
    
    print("\nTop subsections:")
    for subsection, count in results["top_subsections"]:
        print(f"- {subsection}: {count}")

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

    print("\nTop weighted semantic heads:")
    for head, score in results["top_weighted_heads"]:
        print(f"- {head}: {score:.2f}")


def main():
    parser = argparse.ArgumentParser(
        description="Analyze a text file using the Clean Roget semantic ontology."
    )

    parser.add_argument("filepath", help="Path to a .txt file")
    parser.add_argument(
    "--spacy",
    action="store_true",
    help="Use spaCy lemmatization and POS tagging for input text preprocessing.")

    args = parser.parse_args()

    roget_terms = load_roget_terms()
    lookup = build_lookup(roget_terms)

    results = analyze_text(args.filepath, lookup, use_spacy=args.spacy)
    OUTPUT_PATH = Path("data/processed/analysis_results.json")

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print_results(results)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    print(f"\nSaved analysis results to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()