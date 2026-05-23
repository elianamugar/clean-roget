import re
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

try:
    import spacy
except ImportError:
    spacy = None


CUSTOM_STOP_WORDS = {
    "mr",
    "mrs",
    "miss",
    "said",
    "much",
    "must",
    "one",
    "though",
    "might",
    "well",
}

STOP_WORDS = set(stopwords.words("english")) | CUSTOM_STOP_WORDS
LEMMATIZER = WordNetLemmatizer()


def tokenize_regex(text):
    return re.findall(r"\b[a-zA-Z'-]+\b", text.lower())


def lemmatize_phrase(phrase):
    words = phrase.split()
    return " ".join(LEMMATIZER.lemmatize(word) for word in words)


def spacy_pos_to_roget_pos(spacy_pos):
    mapping = {
        "noun": {"noun"},
        "proper_noun": {"noun"},
        "verb": {"verb"},
        "aux": {"verb"},
        "adj": {"adjective"},
        "adv": {"adverb"},
    }

    return mapping.get(spacy_pos, set())


def tokenize_with_spacy(text):
    if spacy is None:
        raise ImportError(
            "spaCy is not installed. Run: pip install spacy && python -m spacy download en_core_web_sm"
        )

    nlp = spacy.load(
        "en_core_web_sm",
        disable=["parser", "ner"]
    )

    nlp.max_length = max(nlp.max_length, len(text) + 1000)

    doc = nlp(text)

    tokens = []

    for token in doc:
        if token.is_space or token.is_punct:
            continue

        if token.is_stop:
            continue

        if not token.is_alpha:
            continue

        tokens.append({
            "text": token.text.lower(),
            "lemma": token.lemma_.lower(),
            "pos": token.pos_.lower(),
        })

    return tokens


def preprocess_text(text, use_spacy=False):
    if use_spacy:
        spacy_tokens = tokenize_with_spacy(text)

        token_words = [
            LEMMATIZER.lemmatize(token["lemma"])
            for token in spacy_tokens
        ]

        return {
            "token_words": token_words,
            "spacy_tokens": spacy_tokens,
        }

    token_words = tokenize_regex(text)

    token_words = [
        LEMMATIZER.lemmatize(token)
        for token in token_words
    ]

    return {
        "token_words": token_words,
        "spacy_tokens": None,
    }


def generate_ngrams(tokens, min_n=1, max_n=3):
    ngrams = []

    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            ngram = " ".join(tokens[i:i + n])
            ngrams.append(ngram)

    return ngrams


def get_content_tokens(token_words):
    return [
        token for token in token_words
        if token not in STOP_WORDS
    ]