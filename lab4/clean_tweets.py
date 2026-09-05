"""Lab 4: clean tweets, inspect TF-IDF, and estimate sentiment with RoBERTa."""

import hashlib
import html
import json
import os
import re
from importlib.metadata import version
from pathlib import Path
from urllib.request import urlopen

import nltk
import pandas as pd
import torch
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from transformers import pipeline


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SOURCE_REVISION = "acbc8af2a35ccf0916124efcbe9e6cf25f191012"
RAW_SHA256 = "67396d6cd4a21c3755de783f20fb5842f12ae8edb9367eed5d2644dd85ca9243"
SOURCE_URL = (
    "https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic/"
    f"resolve/{SOURCE_REVISION}/topic_valid.csv"
)
MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
MODEL_REVISION = "3216a57f2a0d9c45a2e6c20157c20c49fb4bf9c7"

# These are topic labels from the dataset card, not sentiment labels.
TOPICS = {
    0: "Analyst Update",
    1: "Fed | Central Banks",
    2: "Company | Product News",
    3: "Treasuries | Corporate Debt",
    4: "Dividend",
    5: "Earnings",
    6: "Energy | Oil",
    7: "Financials",
    8: "Currencies",
    9: "General News | Opinion",
    10: "Gold | Metals | Materials",
    11: "IPO",
    12: "Legal | Regulation",
    13: "M&A | Investments",
    14: "Macro",
    15: "Markets",
    16: "Politics",
    17: "Personnel Change",
    18: "Stock Commentary",
    19: "Stock Movement",
}


def normalize_tweet(text):
    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", " URL ", text)
    text = re.sub(r"@\w+", " USER ", text)
    text = re.sub(r"\b\d+(?:\.\d+)?\b", " NUMBER ", text)
    return re.sub(r"\s+", " ", text).strip()


def prepare_for_roberta(text):
    # Preserve capitalization, punctuation, emoji, numbers, and negation.
    text = re.sub(r"@\w+", "@user", text)
    text = re.sub(r"https?://\S+|www\.\S+", "http", text)
    return text.strip()


def main():
    # 1. Acquire and inspect the original CSV. Keep its bytes unchanged.
    DATA_DIR.mkdir(exist_ok=True)
    raw_path = DATA_DIR / "lab4_raw_tweets.csv"
    if not raw_path.exists():
        with urlopen(SOURCE_URL, timeout=60) as response:
            raw_bytes = response.read()
        if hashlib.sha256(raw_bytes).hexdigest() != RAW_SHA256:
            raise ValueError("The downloaded file does not match the pinned source CSV.")
        raw_path.write_bytes(raw_bytes)

    if hashlib.sha256(raw_path.read_bytes()).hexdigest() != RAW_SHA256:
        raise ValueError("The raw CSV has changed. Restore the original source file.")
    df = pd.read_csv(raw_path)
    if list(df.columns) != ["text", "label"] or len(df) < 1000:
        raise ValueError("Expected at least 1,000 rows with text and label columns.")

    print(df.head())
    print("Raw shape:", df.shape)
    df.info()
    print(df.describe(include="all"))
    print("Missing values:\n", df.isna().sum())

    report = {
        "source_url": SOURCE_URL,
        "source_revision": SOURCE_REVISION,
        "raw_sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        "raw_rows": len(df),
        "raw_missing_values": df.isna().sum().astype(int).to_dict(),
        "raw_types": df.dtypes.astype(str).to_dict(),
        "exact_duplicate_rows": int(df.duplicated().sum()),
    }

    # The source has no Twitter IDs. This is a 1-based source record number.
    df["record_id"] = range(1, len(df) + 1)
    df["tweet_text_raw"] = df["text"]

    # 2-3. Remove missing/blank text and exact repeated records.
    df = df.dropna(subset=["text"]).copy()
    df = df.drop_duplicates(subset=["text", "label"]).copy()

    # 4-6. Decode HTML entities, standardize whitespace, and map topic codes.
    decoded = df["text"].map(html.unescape)
    report["html_decoded_rows"] = int((decoded != df["text"]).sum())
    df["tweet_text"] = decoded.str.replace(r"\s+", " ", regex=True).str.strip()
    report["whitespace_changed_rows"] = int((decoded != df["tweet_text"]).sum())
    report["text_changed_rows"] = int((df["text"] != df["tweet_text"]).sum())
    report["blank_text_rows"] = int(df["tweet_text"].eq("").sum())
    df = df[df["tweet_text"].ne("")].copy()

    df["topic_id"] = pd.to_numeric(df["label"], errors="coerce")
    valid_topics = df["topic_id"].isin(TOPICS)
    report["invalid_topic_rows"] = int((~valid_topics).sum())
    df = df[valid_topics].copy()
    df["topic_id"] = df["topic_id"].astype(int)
    df["topic"] = df["topic_id"].map(TOPICS)

    # Without Twitter IDs, identical cleaned text is the duplicate key.
    report["duplicate_clean_text_rows"] = int(df["tweet_text"].duplicated().sum())
    df = df.drop_duplicates(subset=["tweet_text"], keep="first").reset_index(drop=True)
    if len(df) < 1000:
        raise ValueError("Fewer than 1,000 usable tweets remain after cleaning.")

    # Dates, likes, and retweets are absent from this source; do not invent them.
    print("Clean rows:", len(df))
    print("Topic counts:\n", df["topic"].value_counts())

    # 7. Use the stronger text preprocessing only for DTM and TF-IDF.
    resources = {
        "punkt_tab": "tokenizers/punkt_tab",
        "stopwords": "corpora/stopwords",
        "wordnet": "corpora/wordnet",
        "omw-1.4": "corpora/omw-1.4",
    }
    for resource, location in resources.items():
        try:
            nltk.data.find(location)
        except LookupError:
            nltk.download(resource, quiet=True, raise_on_error=True)

    stop_words = set(stopwords.words("english"))
    lemmatizer = WordNetLemmatizer()
    df["text_normalized"] = df["tweet_text"].apply(normalize_tweet)
    df["tokens"] = df["text_normalized"].apply(word_tokenize)
    df["tokens_no_stop"] = df["tokens"].apply(
        lambda tokens: [token for token in tokens if token not in stop_words]
    )
    df["tokens_clean"] = df["tokens_no_stop"].apply(
        lambda tokens: [lemmatizer.lemmatize(token) for token in tokens if token.isalpha()]
    )
    df["text_clean"] = df["tokens_clean"].apply(" ".join)
    print(df[["tweet_text", "text_clean"]].head())

    # 8-10. Keep terms in at least 2 tweets and no more than 90% of tweets.
    vectorizer = CountVectorizer(min_df=2, max_df=0.90)
    dtm = vectorizer.fit_transform(df["text_clean"])
    tfidf_vectorizer = TfidfVectorizer(min_df=2, max_df=0.90)
    tfidf = tfidf_vectorizer.fit_transform(df["text_clean"])
    assert list(vectorizer.get_feature_names_out()) == list(tfidf_vectorizer.get_feature_names_out())
    print("DTM shape:", dtm.shape, "TF-IDF shape:", tfidf.shape)

    # Inspect only five rows as a dense matrix; keep the full matrices sparse.
    dtm_preview = pd.DataFrame(
        dtm[:5].toarray(), columns=vectorizer.get_feature_names_out()
    )
    dtm_preview.insert(0, "record_id", df["record_id"].head().to_numpy())
    tfidf_preview = pd.DataFrame(
        tfidf[:5].toarray(), columns=tfidf_vectorizer.get_feature_names_out()
    )
    tfidf_preview.insert(0, "record_id", df["record_id"].head().to_numpy())
    print(dtm_preview.iloc[:, :8])
    print(tfidf_preview.iloc[:, :8])

    term_summary = pd.DataFrame({
        "term": tfidf_vectorizer.get_feature_names_out(),
        "document_count": (dtm > 0).sum(axis=0).A1,
        "mean_tfidf": tfidf.mean(axis=0).A1,
    }).sort_values(["mean_tfidf", "term"], ascending=[False, True])

    # 11-12. Calculate fresh sentiment estimates with the handout's model.
    # A fixed model revision makes future reruns use the same model weights.
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    torch.manual_seed(401)
    # Use the pinned weights without starting an optional remote conversion job.
    os.environ["DISABLE_SAFETENSORS_CONVERSION"] = "1"
    sentiment_model = pipeline(
        "sentiment-analysis",
        model=MODEL,
        revision=MODEL_REVISION,
        top_k=None,
        device=device,
    )
    print("Device:", device)
    print("Test tweet:", sentiment_model("I absolutely love this new update!"))

    df["sentiment_text"] = df["tweet_text"].apply(prepare_for_roberta)
    results = []
    texts = df["sentiment_text"].tolist()
    for start in range(0, len(texts), 256):
        batch = sentiment_model(
            texts[start:start + 256], truncation=True, max_length=512, batch_size=16
        )
        results.extend(batch)
        print(f"Analyzed {len(results)} / {len(texts)} tweets", flush=True)

    score_dicts = [
        {item["label"].lower(): item["score"] for item in scores}
        for scores in results
    ]
    for scores in score_dicts:
        if set(scores) != {"negative", "neutral", "positive"}:
            raise ValueError("The model returned unexpected sentiment labels.")

    for label in ["negative", "neutral", "positive"]:
        df["sentiment_" + label] = [scores[label] for scores in score_dicts]
    df["sentiment"] = [
        max(scores, key=scores.get).capitalize() for scores in score_dicts
    ]
    df["sentiment_score"] = df["sentiment_positive"] - df["sentiment_negative"]

    # 13. Validate tidy rows before saving any processed output.
    vis_df = df[[
        "record_id", "tweet_text_raw", "tweet_text", "topic_id", "topic",
        "text_clean", "sentiment_text", "sentiment_negative", "sentiment_neutral",
        "sentiment_positive", "sentiment", "sentiment_score",
    ]].copy()
    probabilities = vis_df[["sentiment_negative", "sentiment_neutral", "sentiment_positive"]]
    assert vis_df["record_id"].is_unique
    assert vis_df["tweet_text"].is_unique
    assert not vis_df.isna().any().any()
    assert vis_df["sentiment_score"].between(-1, 1).all()
    assert ((probabilities >= 0) & (probabilities <= 1)).all().all()
    assert (probabilities.sum(axis=1) - 1).abs().lt(0.00001).all()

    # 14. Aggregate counts by topic for checking the D3 chart.
    counts = (
        vis_df.groupby(["topic_id", "topic", "sentiment"])
        .size().reset_index(name="count")
    )
    counts["topic_total"] = counts.groupby("topic")["count"].transform("sum")
    counts["percentage"] = counts["count"] / counts["topic_total"] * 100
    assert counts["count"].sum() == len(vis_df)

    report.update({
        "clean_rows": len(vis_df),
        "removed_rows": report["raw_rows"] - len(vis_df),
        "topic_count": int(vis_df["topic"].nunique()),
        "sentiment_counts": vis_df["sentiment"].value_counts().astype(int).to_dict(),
        "dtm_shape": list(dtm.shape),
        "tfidf_shape": list(tfidf.shape),
        "model": MODEL,
        "model_revision": MODEL_REVISION,
        "device": device,
        "versions": {
            name: version(name)
            for name in ["pandas", "torch", "transformers", "nltk", "scikit-learn"]
        },
    })

    vis_df.to_csv(DATA_DIR / "lab4_clean_tweets.csv", index=False)
    counts.to_csv(DATA_DIR / "lab4_sentiment_by_topic.csv", index=False)
    term_summary.to_csv(DATA_DIR / "lab4_tfidf_terms.csv", index=False)
    report["clean_sha256"] = hashlib.sha256(
        (DATA_DIR / "lab4_clean_tweets.csv").read_bytes()
    ).hexdigest()
    (DATA_DIR / "lab4_quality_report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    print("Saved cleaned tweets, topic counts, TF-IDF terms, and the quality report.")


if __name__ == "__main__":
    main()
