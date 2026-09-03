import time
from pathlib import Path

import requests
import pandas as pd
from bs4 import BeautifulSoup


# ToScrape lists this fictional bookstore as a scraping practice site.
# Check https://toscrape.com/ and the site's robots.txt before collecting again.
headers = {"User-Agent": "STATS401-Class-Exercise/1.0"}
rating_numbers = {"One": 1, "Two": 2, "Three": 3, "Four": 4, "Five": 5}
records = []

for page in range(1, 51):
    url = f"https://books.toscrape.com/catalogue/page-{page}.html"

    # Wait before every request, including requests after a slow response.
    time.sleep(1)

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as error:
        # Do not save an incomplete dataset or retry a blocked request.
        raise SystemExit(f"Failed on page {page}. Dataset not saved: {error}")

    # Read the original HTML bytes so that the pound sign is decoded correctly.
    soup = BeautifulSoup(response.content, "html.parser")
    books = soup.select("article.product_pod")

    if len(books) != 20:
        raise SystemExit(f"Expected 20 books on page {page}. Dataset not saved.")

    for book in books:
        try:
            link = book.select_one("h3 a")
            title = link["title"]
            # A link looks like a-light-in-the-attic_1000/index.html.
            book_id = int(link["href"].split("_")[-1].split("/")[0])

            price_text = book.select_one(".price_color").get_text(strip=True)
            price = float(price_text.replace("£", ""))

            rating_word = book.select_one(".star-rating")["class"][1]
            rating = rating_numbers[rating_word]
            availability = book.select_one(".availability").get_text(strip=True)

            if not title.strip() or price <= 0 or not availability:
                raise ValueError("A book has an empty or invalid field.")

        except (AttributeError, KeyError, TypeError, ValueError, IndexError) as error:
            raise SystemExit(f"Invalid book on page {page}. Dataset not saved: {error}")

        records.append({
            "id": book_id,
            "title": title,
            "price_gbp": price,
            "rating": rating,
            "availability": availability
        })

    print(f"Page {page}: {len(records)} records collected", flush=True)

df = pd.DataFrame(records)

if len(df) != 1000 or df["id"].nunique() != 1000:
    raise SystemExit("Expected 1,000 different books. Dataset not saved.")

# This path works whether the script is run from lab3 or the repository root.
output_file = Path(__file__).resolve().parent.parent / "data" / "lab3_data.csv"
df.to_csv(output_file, index=False, encoding="utf-8")
print(f"Saved {len(df)} records to {output_file}")
