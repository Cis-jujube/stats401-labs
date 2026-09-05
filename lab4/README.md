# Lab 4: Cleaning Web Data for Visualization

This assignment follows the formal assignment at the end of
[Lab4.md](https://github.com/hiilab/stats-401/blob/bd2d7a2f288166728ecc2e5d248abdb6cd37106d/Lab4.md).
The handout's 50-row dirty file is a tutorial example. This assignment uses the
full validation CSV of a separate dataset with more than 1,000 tweets.

## Dataset and source

- Publisher: zeroshot.
- Dataset: [Twitter Financial News Topic](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic).
- File: `topic_valid.csv`, the complete validation split; no sampling.
- Source revision: `acbc8af2a35ccf0916124efcbe9e6cf25f191012`.
- [Exact source CSV](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic/resolve/acbc8af2a35ccf0916124efcbe9e6cf25f191012/topic_valid.csv).
- Accessed September 5, 2026.
- Actual CSV size: **4,117 rows** with two columns, `text` and `label`.
  The dataset card lists 4,118 validation examples, but the CSV has 4,117.
- The publisher says the tweets were collected using the Twitter API and
  declares the dataset's license to be **MIT** in the
  [versioned dataset card](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic/blob/acbc8af2a35ccf0916124efcbe9e6cf25f191012/README.md).
  The raw and derived CSVs retain this attribution and license information.
- Raw SHA-256: `67396d6cd4a21c3755de783f20fb5842f12ae8edb9367eed5d2644dd85ca9243`.

The raw file is an unchanged copy of the source CSV. Its label is a **topic**
code from 0 to 19, not a precomputed sentiment. `TOPICS` in the script maps
these codes to the names in the dataset card.

The source does not provide tweet IDs, dates, likes, retweets, or authors.
`record_id` is the original CSV's 1-based data row number, not a Twitter ID.
Those unavailable attributes are not fabricated or filled with zero.

## Cleaning and text analysis

The Python script is organized in the same order as the lab:

1. Read the raw CSV with pandas and inspect shape, types, missing values,
   duplicates, and category counts.
2. Check missing and blank text. Remove exact repeated rows, and then repeated
   cleaned text, keeping the first occurrence. Without tweet IDs this is a
   text-based duplicate rule; it cannot distinguish separate identical posts.
3. Preserve `tweet_text_raw`. Decode HTML entities such as `&amp;`, collapse
   repeated whitespace, and strip leading/trailing spaces in `tweet_text`.
4. Convert topic codes to numeric values, validate membership in 0–19, and map
   them to consistent topic names. Dates and engagement counts cannot be
   cleaned because this particular dataset has no such fields.
5. For DTM and TF-IDF only, normalize URLs, mentions, and numbers; tokenize;
   remove English stopwords; and lemmatize alphabetic tokens with NLTK.
   Vocabulary pruning uses `min_df=2` and `max_df=0.90`, as in the handout.
   Full matrices stay sparse; only five rows are converted to dense previews.
   `lab4_tfidf_terms.csv` contains document counts and mean TF-IDF per term.
   The default WordNet lemmatizer mainly handles noun forms. This follows the
   lab example and is not a full part-of-speech-aware language pipeline.
6. For sentiment, start separately from `tweet_text`. Replace mentions with
   `@user` and URLs with `http`, retaining case, punctuation, emoji, and negation.
7. Use **`cardiffnlp/twitter-roberta-base-sentiment-latest`**, the model specified
   by the handout. Select the highest-probability class as `sentiment` and
   calculate `sentiment_score = P(positive) - P(negative)`.
8. Validate the processed data and export tweet-level records and topic counts.

Raw inspection found **zero missing values, zero exact duplicates, zero blank
texts, and zero duplicate cleaned texts**. The cleaned text differs from the
original in 3,770 rows. The script records separate HTML and whitespace counts
in its quality report; these can overlap. There is no reason to invent missing
values or intentionally damage the source just to demonstrate a cleaning step.

The completed run retained **4,117 tweets** in 20 topics: **3,035 Neutral,
604 Positive, and 478 Negative**. It decoded HTML entities in 113 rows and
standardized whitespace in 3,768 rows. Both the DTM and TF-IDF matrix have
shape **4,117 × 4,342** after vocabulary pruning. The chart's percentages are
within each topic, not percentages of the entire dataset.

The model is pinned to revision `3216a57f2a0d9c45a2e6c20157c20c49fb4bf9c7`.
The script uses Apple's MPS device when available and otherwise CPU. Small
floating-point differences across hardware are possible. It does not train a
classifier or use the original topic codes as sentiment labels.
The library's optional remote checkpoint-conversion job is disabled so the
script exits after saving its outputs.

Sentiment is a **model-generated estimate**, not ground truth. Financial
headlines, sarcasm, and mixed language can be misclassified. This dataset is
not a representative sample of all Twitter users, and the topic sample sizes
differ substantially.

## Files

- `index.html`, `lab4.css`, `lab4.js`: simple page and D3 chart.
- `clean_tweets.py`: acquisition, cleaning, TF-IDF, sentiment, and validation.
- `../data/lab4_raw_tweets.csv`: unchanged input tweets and topic codes.
- `../data/lab4_clean_tweets.csv`: one row per retained tweet, including original
  and cleaned text, topic, all three probabilities, sentiment, and score.
- `../data/lab4_sentiment_by_topic.csv`: counts and percentages by topic.
- `../data/lab4_tfidf_terms.csv`: vocabulary and term statistics.
- `../data/lab4_quality_report.json`: row counts, data checks, source/model
  versions, package versions, and data hashes from the actual run.

## Run

From the repository root:

```bash
uv run --project lab4 --frozen python lab4/clean_tweets.py
```

The local environment and exact dependency versions are managed by
`lab4/pyproject.toml` and `lab4/uv.lock`. The first run downloads the Python
packages, NLTK resources, and approximately 500 MB of model weights. The model
and NLTK resources are cached outside the repository. They are not uploaded to
GitHub. Future runs use the same raw file; if it is absent the script acquires
the pinned source CSV. Inference runs locally and may take several minutes.

On this Mac, NLTK 3.10.3's downloader rejected the configured proxy. The four
resources were installed using NLTK's
[official manual installation method](https://www.nltk.org/data.html#manual-installation),
with SHA-256 checks against the official `nltk_data` package index. They are in
`~/nltk_data`, which NLTK searches automatically. No proxy or security setting
was changed. The script checks for existing resources before downloading.
If the same downloader error occurs on another machine, download and unzip
these packages into the indicated folders under your user's `nltk_data`:

- [punkt_tab.zip](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/tokenizers/punkt_tab.zip): `tokenizers/`.
- [stopwords.zip](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/stopwords.zip): `corpora/`.
- [wordnet.zip](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip): `corpora/`.
- [omw-1.4.zip](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/omw-1.4.zip): `corpora/`.

Verify downloaded files against the `sha256_checksum` entries in the
[official package index](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/index.xml).

Viewing the published page needs no Python. D3 loads the saved cleaned CSV and
calculates counts within each topic. Each stacked bar totals 100%; the right
column shows the number of tweets. Topic names are sorted alphabetically.
All topics are included, including small groups. A count table is available
for exact values and for readers who cannot use hover tooltips.

## Verification

- The complete Python script finished successfully. Rerunning it on the same
  machine produced identical SHA-256 hashes for all five saved data files.
- Independent checks matched every raw/clean text pair, source row number,
  topic code, highest-probability label, probability sum, sentiment score,
  and grouped count. No missing values remain in the exported dataset.
- A real Edge browser rendered 20 topic rows and 60 sentiment segments.
  Bar widths and table counts matched the Python aggregate CSV.
- Browser checks at widths of 1,280, 768, and 390 pixels found no page overflow
  or JavaScript errors. The chart can be scrolled with the keyboard, and the
  exact-value table opens normally. Missing CSV and unavailable D3 states
  display error messages. Desktop and phone screenshots were visually reviewed.
- The analysis below the chart contains 172 words.

## Assignment checklist

- At least 1,000 original tweet records with text: the raw CSV has 4,117.
- Keep raw and processed datasets: both CSVs are included with source attribution.
- Inspect and clean the actual data-quality problems: see the script and report.
- Run the assigned RoBERTa model for every retained tweet: see the probability
  columns, categorical sentiment, continuous score, and recorded model revision.
- Use tidy data and a meaningful D3 visualization: sentiment proportions by topic.
- Put a 100–200 word analysis below the chart: see the page's Short Analysis.
- Include the Python script in the repository.
- Check the page after GitHub Pages deployment.

Submission URL: <https://cis-jujube.github.io/stats401-labs/lab4/>.
GitHub publication and submission to the course platform are separate steps.

## LLM Usage Disclosure

OpenAI Codex helped select the dataset, write and run the Python and D3 code,
draft the analysis, and check the results.
