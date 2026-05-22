import requests
from pathlib import Path

URL = "https://www.gutenberg.org/files/10681/10681-h/10681-h.htm"

OUTPUT_PATH = Path("data/raw/roget.html")


def download_roget():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    response = requests.get(URL)
    response.raise_for_status()

    OUTPUT_PATH.write_text(response.text, encoding="utf-8")

    print(f"Saved Roget HTML to {OUTPUT_PATH}")


if __name__ == "__main__":
    download_roget()
