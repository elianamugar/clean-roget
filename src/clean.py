import json
from pathlib import Path


INPUT_PATH = Path("data/interim/semantic_blocks.json")
OUTPUT_PATH = Path("data/processed/clean_semantic_blocks.json")


REPLACEMENTS = {
    "â\x80\x94": "—",
    "  ": " ",
}


POS_MAP = {
    "N.": "noun",
    "V.": "verb",
    "Adj.": "adjective",
    "Adv.": "adverb",
    "Phr.": "phrase"
}


def clean_text(text):
    """
    Light cleaning only.
    Preserve semantic structure.
    """

    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)

    text = " ".join(text.split())
    text = text.strip("[]")

    return text.strip()


def normalize_pos(pos):
    """Convert abbreviated POS labels to readable form."""

    return POS_MAP.get(pos, pos)


def clean_entries(entries):

    cleaned = []

    for entry in entries:

        cleaned_entry = {
            "class": clean_text(entry["class"]),
            "section": clean_text(entry["section"]),
            "head": clean_text(entry["head"]),
            "head_name": clean_text(entry["head_name"]),
            "pos": normalize_pos(entry["pos"]),
            "raw_text": clean_text(entry["raw_text"])
        }

        cleaned.append(cleaned_entry)

    return cleaned


if __name__ == "__main__":

    with INPUT_PATH.open("r", encoding="utf-8") as f:
        entries = json.load(f)

    cleaned_entries = clean_entries(entries)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(cleaned_entries, f, indent=2, ensure_ascii=False)

    print(f"Cleaned {len(cleaned_entries)} entries")
    print(f"Saved cleaned corpus to {OUTPUT_PATH}")

    print("\nExample cleaned entry:\n")
    print(cleaned_entries[0])