from nltk.corpus import stopwords
import json
from pathlib import Path

STOPWORDS = sorted(stopwords.words("english"))

# Optional literary additions
STOPWORDS.extend([
    "mr",
    "mrs",
    "miss",
    "would",
    "could",
    "one",
    "upon",
    "well",
    "said"
])

STOPWORDS = sorted(set(STOPWORDS))

output_path = Path("docs/data/stopwords.json")

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(STOPWORDS, f, indent=2)

print(f"Exported {len(STOPWORDS)} stopwords to {output_path}")