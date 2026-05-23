import argparse
import json
from pathlib import Path

import spacy


def preprocess_text(input_path: Path, output_path: Path) -> None:
    nlp = spacy.load("en_core_web_sm")

    text = input_path.read_text(encoding="utf-8", errors="ignore")
    doc = nlp(text)

    tokens = []

    for token in doc:
        if token.is_space or token.is_punct:
            continue

        tokens.append({
            "text": token.text,
            "lemma": token.lemma_.lower(),
            "pos": token.pos_.lower(),
            "tag": token.tag_,
            "is_stop": token.is_stop,
            "is_alpha": token.is_alpha,
        })

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(tokens)} processed tokens to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Preprocess a text file with spaCy POS tagging and lemmatization."
    )

    parser.add_argument("input", help="Path to input .txt file")
    parser.add_argument(
        "-o",
        "--output",
        default="data/processed/spacy_tokens.json",
        help="Path to output JSON file",
    )

    args = parser.parse_args()

    preprocess_text(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()