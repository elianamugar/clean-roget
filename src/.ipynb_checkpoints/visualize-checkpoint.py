import json
from pathlib import Path

import matplotlib.pyplot as plt


INPUT_PATH = Path("data/processed/analysis_results.json")
OUTPUT_PATH = Path("data/processed/top_weighted_heads.png")


def main():
    with INPUT_PATH.open("r", encoding="utf-8") as f:
        results = json.load(f)

    heads = results["top_weighted_heads"]

    labels = [head for head, score in heads]
    scores = [score for head, score in heads]

    plt.figure(figsize=(12, 6))
    plt.bar(labels, scores)
    plt.xticks(rotation=45, ha="right")
    plt.ylabel("Weighted Semantic Score")
    plt.title("Top Weighted Semantic Heads")
    plt.tight_layout()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(OUTPUT_PATH, dpi=300)
    print(f"Saved visualization to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()