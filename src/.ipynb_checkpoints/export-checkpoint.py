import json
import csv
import re
from pathlib import Path


INPUT_PATH = Path("data/processed/clean_semantic_blocks.json")

OUTPUT_JSON = Path("data/processed/roget_terms.json")
OUTPUT_CSV = Path("data/processed/roget_terms.csv")


METADATA_PATTERNS = [
    r"\[.*?\]",      # [Lat.]
    r"&c\.\s*\d*",   # &c. 494
    r"&c\.",
    r"\(\w+\)\s*\d+",  # (event) 151
    r"\b\d+\b"       # standalone numbers
]

INVALID_TERMS = {
    "adj",
    "adv",
    "noun",
    "verb",
    "phrase",
    "&c",
    "etc"
}


def clean_term(term):
    """
    Conservative semantic cleaning.
    """

    term = term.strip()

    # Remove metadata
    for pattern in METADATA_PATTERNS:
        term = re.sub(pattern, "", term)

    # Normalize whitespace
    term = " ".join(term.split())

    # Remove leading/trailing punctuation
    term = term.strip(" .;,:-—")

    # Remove lowercase POS leftovers
    if term.lower() in INVALID_TERMS:
        return ""

    # Remove ALL CAPS structural junk
    if term.isupper() and len(term.split()) <= 5:
        return ""

    # Remove empty results
    if len(term) < 2:
        return ""

    term = re.sub(r"\s*&c\s*$", "", term)

    return term


def split_terms(raw_text):
    """
    Improved conservative semantic splitting.
    Attempts to preserve phrases while separating
    clearly distinct semantic terms.
    """

    # First split on semicolons
    major_pieces = re.split(r";", raw_text)

    all_terms = []

    for piece in major_pieces:

        # Then split cautiously on commas
        comma_pieces = re.split(r",(?!\s*\w+\.)", piece)

        for subpiece in comma_pieces:

            # Then cautiously split sentence-like periods
            sentence_pieces = re.split(
                r"\.\s+(?=[A-ZA-Za-z])",
                subpiece
            )

            for fragment in sentence_pieces:

                cleaned = clean_term(fragment)

                # Skip tiny/junk fragments
                if len(cleaned) < 2:
                    continue

                all_terms.append(cleaned)

    return all_terms


def export_terms(entries):

    rows = []

    for entry in entries:

        terms = split_terms(entry["raw_text"])

        for term in terms:

            rows.append({
                "class": entry["class"],
                "section": entry["section"],
                "head": entry["head"],
                "head_name": entry["head_name"],
                "pos": entry["pos"],
                "term": term,
                "class_name": entry["class_name"],
                "section_name": entry["section_name"],
                "subsection": entry["subsection"],
                "subsubsection": entry["subsubsection"],
                "division": entry.get("division"),
                "division_name": entry.get("division_name"),
            })

    return rows


if __name__ == "__main__":

    with INPUT_PATH.open("r", encoding="utf-8") as f:
        entries = json.load(f)

    rows = export_terms(entries)

    # Save JSON
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

    # Save CSV
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f:

        writer = csv.DictWriter(
            f,
            fieldnames=[
                "class",
                "class_name",
                "division",
                "division_name",
                "section",
                "section_name",
                "subsection",
                "subsubsection",
                "head",
                "head_name",
                "pos",
                "term"
            ]
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} semantic terms")

    print(f"Saved JSON to {OUTPUT_JSON}")
    print(f"Saved CSV to {OUTPUT_CSV}")

    print("\nExample terms:\n")

    for row in rows[:20]:
        print(row)