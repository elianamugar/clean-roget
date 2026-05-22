import re
from pathlib import Path
from bs4 import BeautifulSoup
import json

OUTPUT_PATH = Path("data/interim/structure_output.txt")
RAW_PATH = Path("data/raw/roget.html")
OUTPUT_JSON = Path("data/interim/semantic_blocks.json")


CLASS_RE = re.compile(r"^CLASS\s+([IVXLC]+)")
SECTION_RE = re.compile(r"^SECTION\s+([IVXLC]+)")
HEAD_RE = re.compile(r"^#(\d+)\.")
POS_TAGS = {"N.", "V.", "Adj.", "Adv.", "Phr."}


def extract_lines():
    html = RAW_PATH.read_text(encoding="utf-8")

    soup = BeautifulSoup(html, "xml")

    text = soup.get_text("\n")

    lines = [line.strip() for line in text.splitlines()]

    return [line for line in lines if line]


def parse_structure(lines):
    current_class = None
    current_section = None
    current_head = None
    current_head_name = None
    awaiting_head_name = False
    current_pos = None

    current_buffer = []

    entries = []

    def save_entry():
        """Save current semantic block."""

        nonlocal current_buffer

        if current_pos and current_buffer:

            entries.append({
                "class": current_class,
                "section": current_section,
                "head": current_head,
                "head_name": current_head_name,
                "pos": current_pos,
                "raw_text": " ".join(current_buffer)
            })

        current_buffer = []

    for line in lines:

        # CLASS
        if CLASS_RE.match(line):

            save_entry()

            current_class = line

        # SECTION
        elif SECTION_RE.match(line):

            save_entry()

            current_section = line

        # HEAD
        elif HEAD_RE.match(line):

            save_entry()
        
            current_head = line
        
            current_head_name = None
        
            awaiting_head_name = True

        elif awaiting_head_name:

            # Skip decorative dashes
            if line == "—":
                continue
    
            current_head_name = line
        
            awaiting_head_name = False

        # POS TAG
        elif line in POS_TAGS:

            save_entry()

            current_pos = line

        # NORMAL CONTENT
        else:

            if current_pos:
                current_buffer.append(line)

    # Save final entry
    save_entry()

    return entries


if __name__ == "__main__":

    lines = extract_lines()

    entries = parse_structure(lines)

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    print(f"Extracted {len(entries)} semantic blocks")
    print(f"Saved semantic blocks to {OUTPUT_JSON}")

    for entry in entries[:5]:
        print("\n------------------")
        print(entry)