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
NUMBER_ONLY_RE = re.compile(r"^\d+\.$")
INLINE_NUMBER_TITLE_RE = re.compile(r"^(\d+)\.\s+(.+)$")
DIVISION_RE = re.compile(r"^DIVISION\s+([IVXLC]+)")

def extract_lines():
    html = RAW_PATH.read_text(encoding="utf-8")

    soup = BeautifulSoup(html, "xml")

    text = soup.get_text("\n")

    lines = [line.strip() for line in text.splitlines()]

    return [line for line in lines if line]


def parse_structure(lines):
    current_class = None
    current_class_name = None
    current_division = None
    current_division_name = None
    current_section = None
    current_section_name = None
    current_subsection = None
    current_subsubsection = None
    current_head = None
    current_head_name = None
    current_pos = None

    awaiting_class_name = False
    awaiting_division_name = False
    awaiting_section_name = False
    awaiting_subsection_title = False
    awaiting_head_name = False

    current_buffer = []
    entries = []

    def save_entry():
        nonlocal current_buffer

        raw_text = " ".join(current_buffer).strip()

        if current_pos and raw_text and raw_text != "—":
            entries.append({
                "class": current_class,
                "class_name": current_class_name,
                "division": current_division,
                "division_name": current_division_name,
                "section": current_section,
                "section_name": current_section_name,
                "subsection": current_subsection,
                "subsubsection": current_subsubsection,
                "head": current_head,
                "head_name": current_head_name,
                "pos": current_pos,
                "raw_text": raw_text,
            })

        current_buffer = []

    for line in lines:

        if CLASS_RE.match(line):
            save_entry()
            current_class = line
            current_class_name = None
            current_division = None
            current_division_name = None
            current_section = None
            current_section_name = None
            current_subsection = None
            current_subsubsection = None
            awaiting_class_name = True
            continue

        if awaiting_class_name:
            if SECTION_RE.match(line) or DIVISION_RE.match(line):
                awaiting_class_name = False
            else:
                current_class_name = (
                    f"{current_class_name} {line}"
                    if current_class_name else line
                )
                continue

        if DIVISION_RE.match(line):
            save_entry()
            current_division = line
            current_division_name = None
            current_section = None
            current_section_name = None
            current_subsection = None
            current_subsubsection = None
            awaiting_division_name = True
            continue

        if awaiting_division_name:
            current_division_name = line.title()
            awaiting_division_name = False
            continue

        if SECTION_RE.match(line):
            save_entry()
            current_section = line
            current_section_name = None
            current_subsection = None
            current_subsubsection = None
            awaiting_section_name = True
            continue

        if awaiting_section_name:
            if NUMBER_ONLY_RE.match(line):
                awaiting_section_name = False
                save_entry()
                awaiting_subsection_title = True
                continue

            if INLINE_NUMBER_TITLE_RE.match(line):
                awaiting_section_name = False
                match = INLINE_NUMBER_TITLE_RE.match(line)
                current_subsubsection = match.group(2).title()
                continue

            if HEAD_RE.match(line):
                awaiting_section_name = False
                save_entry()
                current_head = line
                current_head_name = None
                awaiting_head_name = True
                continue

            current_section_name = (
                f"{current_section_name} {line.title()}"
                if current_section_name else line.title()
            )
            continue

        if NUMBER_ONLY_RE.match(line):
            save_entry()
            awaiting_subsection_title = True
            continue

        if awaiting_subsection_title:
            current_subsection = line.title()
            current_subsubsection = None
            awaiting_subsection_title = False
            continue

        if INLINE_NUMBER_TITLE_RE.match(line):
            save_entry()
            match = INLINE_NUMBER_TITLE_RE.match(line)
            current_subsubsection = match.group(2).title()
            continue

        if HEAD_RE.match(line):
            save_entry()
            current_head = line
            current_head_name = None
            awaiting_head_name = True
            continue

        if awaiting_head_name:
            if line == "—":
                continue

            current_head_name = line
            awaiting_head_name = False
            continue

        if line in POS_TAGS:
            save_entry()
            current_pos = line
            continue

        if current_pos:
            current_buffer.append(line)

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