import argparse
import json
import math
from collections import Counter
from pathlib import Path

from semantic_analysis import (
    load_roget_terms,
    build_lookup,
    analyze_text,
)


OUTPUT_PATH = Path("data/processed/compare_results.json")


def cosine_similarity(counter_a, counter_b):
    keys = set(counter_a) | set(counter_b)

    dot = 0
    mag_a = 0
    mag_b = 0

    for key in keys:
        a = counter_a.get(key, 0)
        b = counter_b.get(key, 0)

        dot += a * b
        mag_a += a * a
        mag_b += b * b

    if mag_a == 0 or mag_b == 0:
        return 0

    return dot / (math.sqrt(mag_a) * math.sqrt(mag_b))


def top_head_overlap(results_a, results_b, n=25):
    counts_a = results_a["head_counts_raw"]
    counts_b = results_b["head_counts_raw"]

    top_a = {
        head
        for head, _ in Counter(counts_a).most_common(n)
    }

    top_b = {
        head
        for head, _ in Counter(counts_b).most_common(n)
    }

    shared = top_a & top_b

    return len(shared) / n


def normalized_head_difference(results_a, results_b, top_n=10):
    counts_a = results_a["head_counts_raw"]
    counts_b = results_b["head_counts_raw"]

    total_a = sum(counts_a.values())
    total_b = sum(counts_b.values())

    keys = set(counts_a) | set(counts_b)
    rows = []

    for key in keys:
        prop_a = counts_a.get(key, 0) / total_a if total_a else 0
        prop_b = counts_b.get(key, 0) / total_b if total_b else 0

        rows.append((key, abs(prop_a - prop_b)))

    return sorted(rows, key=lambda item: item[1], reverse=True)[:top_n]


def shared_heads(results_a, results_b, top_n=10):
    counts_a = results_a["head_counts_raw"]
    counts_b = results_b["head_counts_raw"]

    rows = []

    for head, count_a in counts_a.items():
        count_b = counts_b.get(head)

        if count_b:
            rows.append((head, min(count_a, count_b)))

    return sorted(rows, key=lambda item: item[1], reverse=True)[:top_n]


def compare_texts(path_a, path_b, lookup, use_spacy=False):
    results_a = analyze_text(path_a, lookup, use_spacy=use_spacy)
    results_b = analyze_text(path_b, lookup, use_spacy=use_spacy)

    head_similarity = cosine_similarity(
        results_a["head_counts_raw"],
        results_b["head_counts_raw"],
    )

    class_similarity = cosine_similarity(
        results_a["class_counts_raw"],
        results_b["class_counts_raw"],
    )

    pos_similarity = cosine_similarity(
        results_a["pos_counts_raw"],
        results_b["pos_counts_raw"],
    )

    thematic_overlap = top_head_overlap(results_a, results_b, n=25)

    differences = normalized_head_difference(results_a, results_b, top_n=10)
    shared = shared_heads(results_a, results_b, top_n=10)

    return {
        "text_a": str(path_a),
        "text_b": str(path_b),
        "use_spacy": use_spacy,
        "similarity_scores": {
            "dominant_thematic_overlap": thematic_overlap,
            "broad_structural_similarity": head_similarity,
            "class_similarity": class_similarity,
            "part_of_speech_similarity": pos_similarity,
        },
        "most_different_semantic_heads": differences,
        "shared_semantic_heads": shared,
        "text_a_top_heads": results_a["top_heads"],
        "text_b_top_heads": results_b["top_heads"],
        "text_a_summary": {
            "total_tokens": results_a["total_tokens"],
            "matched_terms": results_a["matched_terms"],
            "token_coverage": results_a["token_coverage"],
            "semantic_density": results_a["semantic_density"],
        },
        "text_b_summary": {
            "total_tokens": results_b["total_tokens"],
            "matched_terms": results_b["matched_terms"],
            "token_coverage": results_b["token_coverage"],
            "semantic_density": results_b["semantic_density"],
        },
    }


def print_compare_results(results):
    print("\nClean Roget Text Comparison")
    print("===========================")

    print(f"Text A: {results['text_a']}")
    print(f"Text B: {results['text_b']}")
    print(f"spaCy mode: {results['use_spacy']}")

    scores = results["similarity_scores"]

    print("\nSimilarity Scores:")
    print(f"- Dominant thematic overlap: {scores['dominant_thematic_overlap']:.2%}")
    print(f"- Broad structural similarity: {scores['broad_structural_similarity']:.2%}")
    print(f"- Class similarity: {scores['class_similarity']:.2%}")
    print(f"- Part-of-speech similarity: {scores['part_of_speech_similarity']:.2%}")

    print("\nMost Different Semantic Heads:")
    for head, diff in results["most_different_semantic_heads"]:
        print(f"- {head}: {diff:.2%}")

    print("\nShared Semantic Heads:")
    for head, _ in results["shared_semantic_heads"]:
        print(f"- {head}")

    print("\nTop Heads — Text A:")
    for head, count in results["text_a_top_heads"]:
        print(f"- {head}: {count}")

    print("\nTop Heads — Text B:")
    for head, count in results["text_b_top_heads"]:
        print(f"- {head}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Compare two text files using the Clean Roget semantic ontology."
    )

    parser.add_argument("text_a", help="Path to first .txt file")
    parser.add_argument("text_b", help="Path to second .txt file")

    parser.add_argument(
        "--spacy",
        action="store_true",
        help="Use spaCy lemmatization and contextual POS filtering.",
    )

    parser.add_argument(
        "-o",
        "--output",
        default=str(OUTPUT_PATH),
        help="Path to save comparison JSON.",
    )

    args = parser.parse_args()

    roget_terms = load_roget_terms()
    lookup = build_lookup(roget_terms)

    results = compare_texts(
        Path(args.text_a),
        Path(args.text_b),
        lookup,
        use_spacy=args.spacy,
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print_compare_results(results)
    print(f"\nSaved comparison results to {output_path}")


if __name__ == "__main__":
    main()