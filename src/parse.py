import re
from pathlib import Path
from bs4 import BeautifulSoup

OUTPUT_PATH = Path("data/interim/structure_output.txt")
RAW_PATH = Path("data/raw/roget.html")


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
    current_pos = None

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:

        for line in lines:
    
            if CLASS_RE.match(line):
                current_class = line
                output = f"CLASS: {current_class}"
                print(output)
                f.write(output + "\n")
    
            elif SECTION_RE.match(line):
                current_section = line
                output = f"SECTION: {current_section}"
                print(output)
                f.write(output + "\n")
    
            elif HEAD_RE.match(line):
                current_head = line
                output = f"HEAD: {current_head}"
                print(output)
                f.write(output + "\n")
    
            elif line in POS_TAGS:
                current_pos = line
                output = f"POS: {current_pos}"
                print(output)
                f.write(output + "\n")


if __name__ == "__main__":
    lines = extract_lines()
    parse_structure(lines)