import re


def clean_gutenberg_text(text):
    """Remove Project Gutenberg header/footer and normalize whitespace."""

    start_marker = "*** START OF"
    end_marker = "*** END OF"

    start_idx = text.find(start_marker)
    if start_idx != -1:
        text = text[start_idx:]
        text = text.split("\n", 1)[1]

    end_idx = text.find(end_marker)
    if end_idx != -1:
        text = text[:end_idx]

    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    return text.strip()