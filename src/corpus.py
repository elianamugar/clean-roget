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


OUTPUT_PATH = Path("data/processed/corpus_results.json")


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


def merge_counter_dicts(results, key):
    counter = Counter()

    for result in results:
        counter.update(result[key])

    return dict(counter)


def top_items(counter_dict, n=10):
    return Counter(counter_dict).most_common(n)


def top_head_overlap(corpus_a, corpus_b, n=25):
    top_a = {head for head, _ in top_items(corpus_a["head_counts_raw"], n)}
    top_b = {head for head, _ in top_items(corpus_b["head_counts_raw"], n)}

    return len(top_a & top_b) / n


def normalized_head_difference(corpus_a, corpus_b, top_n=10):
    counts_a = corpus_a["head_counts_raw"]
    counts_b = corpus_b["head_counts_raw"]

    total_a = sum(counts_a.values())
    total_b = sum(counts_b.values())

    keys = set(counts_a) | set(counts_b)

    rows = []

    for key in keys:
        prop_a = counts_a.get(key, 0) / total_a if total_a else 0
        prop_b = counts_b.get(key, 0) / total_b if total_b else 0

        rows.append((key, abs(prop_a - prop_b)))

    return sorted(rows, key=lambda item: item[1], reverse=True)[:top_n]


def analyze_corpus(paths, lookup, use_spacy=False):
    analyses = []

    for path in paths:
        result = analyze_text(path, lookup, use_spacy=use_spacy)

        analyses.append({
            "path": str(path),
            "result": result,
        })

    result_list = [item["result"] for item in analyses]

    head_counts = merge_counter_dicts(result_list, "head_counts_raw")
    class_counts = merge_counter_dicts(result_list, "class_counts_raw")
    pos_counts = merge_counter_dicts(result_list, "pos_counts_raw")

    total_tokens = sum(result["total_tokens"] for result in result_list)
    matched_terms = sum(result["matched_terms"] for result in result_list)
    total_semantic_matches = sum(result["total_semantic_matches"] for result in result_list)

    return {
        "files": [str(path) for path in paths],
        "file_count": len(paths),
        "total_tokens": total_tokens,
        "matched_terms": matched_terms,
        "total_semantic_matches": total_semantic_matches,
        "semantic_density": (
            total_semantic_matches / total_tokens if total_tokens else 0
        ),
        "head_counts_raw": head_counts,
        "class_counts_raw": class_counts,
        "pos_counts_raw": pos_counts,
        "top_heads": top_items(head_counts, 10),
        "top_classes": top_items(class_counts, 10),
        "top_pos": top_items(pos_counts, 10),
        "individual_files": analyses,
    }


def compare_corpora(paths_a, paths_b, label_a, label_b, lookup, use_spacy=False):
    corpus_a = analyze_corpus(paths_a, lookup, use_spacy=use_spacy)
    corpus_b = analyze_corpus(paths_b, lookup, use_spacy=use_spacy)

    head_similarity = cosine_similarity(
        corpus_a["head_counts_raw"],
        corpus_b["head_counts_raw"],
    )

    class_similarity = cosine_similarity(
        corpus_a["class_counts_raw"],
        corpus_b["class_counts_raw"],
    )

    pos_similarity = cosine_similarity(
        corpus_a["pos_counts_raw"],
        corpus_b["pos_counts_raw"],
    )

    thematic_overlap = top_head_overlap(corpus_a, corpus_b, n=25)

    differences = normalized_head_difference(corpus_a, corpus_b, top_n=10)

    return {
        "label_a": label_a,
        "label_b": label_b,
        "use_spacy": use_spacy,
        "corpus_a": corpus_a,
        "corpus_b": corpus_b,
        "similarity_scores": {
            "dominant_thematic_overlap": thematic_overlap,
            "broad_structural_similarity": head_similarity,
            "class_similarity": class_similarity,
            "part_of_speech_similarity": pos_similarity,
        },
        "most_different_semantic_heads": differences,
    }


def print_results(results):
    label_a = results["label_a"]
    label_b = results["label_b"]
    scores = results["similarity_scores"]

    print("\nClean Roget Corpus Comparison")
    print("=============================")
    print(f"Corpus A: {label_a}")
    print(f"Corpus B: {label_b}")
    print(f"spaCy mode: {results['use_spacy']}")

    print("\nCorpus Summary:")
    print(
        f"- {label_a}: {results['corpus_a']['file_count']} files, "
        f"{results['corpus_a']['total_tokens']} tokens"
    )
    print(
        f"- {label_b}: {results['corpus_b']['file_count']} files, "
        f"{results['corpus_b']['total_tokens']} tokens"
    )

    print("\nSimilarity Scores:")
    print(f"- Dominant thematic overlap: {scores['dominant_thematic_overlap']:.2%}")
    print(f"- Broad structural similarity: {scores['broad_structural_similarity']:.2%}")
    print(f"- Class similarity: {scores['class_similarity']:.2%}")
    print(f"- Part-of-speech similarity: {scores['part_of_speech_similarity']:.2%}")

    print(f"\nTop Heads — {label_a}:")
    for head, count in results["corpus_a"]["top_heads"]:
        print(f"- {head}: {count}")

    print(f"\nTop Heads — {label_b}:")
    for head, count in results["corpus_b"]["top_heads"]:
        print(f"- {head}: {count}")

    print("\nMost Different Semantic Heads:")
    for head, diff in results["most_different_semantic_heads"]:
        print(f"- {head}: {diff:.2%}")


def main():
    parser = argparse.ArgumentParser(
        description="Compare two corpora using the Clean Roget semantic ontology."
    )

    parser.add_argument(
        "--a",
        nargs="+",
        required=True,
        help="Paths to .txt files for corpus A.",
    )

    parser.add_argument(
        "--b",
        nargs="+",
        required=True,
        help="Paths to .txt files for corpus B.",
    )

    parser.add_argument(
        "--label-a",
        default="Corpus A",
        help="Label for corpus A.",
    )

    parser.add_argument(
        "--label-b",
        default="Corpus B",
        help="Label for corpus B.",
    )

    parser.add_argument(
        "--spacy",
        action="store_true",
        help="Use spaCy lemmatization and contextual POS filtering.",
    )

    parser.add_argument(
        "-o",
        "--output",
        default=str(OUTPUT_PATH),
        help="Path to save corpus comparison JSON.",
    )

    args = parser.parse_args()

    roget_terms = load_roget_terms()
    lookup = build_lookup(roget_terms)

    paths_a = [Path(path) for path in args.a]
    paths_b = [Path(path) for path in args.b]

    results = compare_corpora(
        paths_a,
        paths_b,
        args.label_a,
        args.label_b,
        lookup,
        use_spacy=args.spacy,
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print_results(results)
    print(f"\nSaved corpus comparison results to {output_path}")


if __name__ == "__main__":
    main()