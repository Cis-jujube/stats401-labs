import pandas as pd
import json
from pathlib import Path

data_folder = Path(__file__).resolve().parent.parent / "data"


def build_hierarchy(dataframe, levels, value_column, output_column, status_column=None):
    # At the last level, save each country (or city) as a leaf.
    if len(levels) == 1:
        leaves = []
        for _, row in dataframe.iterrows():
            leaf = {
                "name": row[levels[0]],
                output_column: float(row[value_column]),
            }
            if status_column:
                leaf["status"] = row[status_column]
            leaves.append(leaf)
        return leaves

    # Group one level, then repeat for the next level.
    children = []
    for name, group in dataframe.groupby(levels[0], sort=False):
        children.append({
            "name": name,
            "children": build_hierarchy(
                group, levels[1:], value_column, output_column, status_column
            ),
        })
    return children


def convert_file(filename, levels, value_column, output_column, status_column=None):
    df = pd.read_csv(data_folder / filename)
    required = levels + [value_column]
    if status_column:
        required.append(status_column)
    if df.empty or df[required].isna().any().any():
        raise ValueError("The CSV is empty or contains missing values.")
    if df.duplicated(levels).any():
        raise ValueError("The CSV contains a duplicate hierarchy path.")
    values = pd.to_numeric(df[value_column], errors="raise")
    if not ((values > 0) & (values < float("inf"))).all():
        raise ValueError("Values must be finite and positive.")
    df[value_column] = values
    if status_column and not df[status_column].isin(
        ["Increase", "Unchanged", "Decrease"]
    ).all():
        raise ValueError("Unexpected GDP status.")

    hierarchy = {
        "name": "World",
        "children": build_hierarchy(
            df, levels, value_column, output_column, status_column
        ),
    }
    output_path = (data_folder / filename).with_suffix(".json")
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(hierarchy, file, indent=2, ensure_ascii=False, allow_nan=False)
        file.write("\n")
    print(f"Saved {output_path.name}: {len(df)} leaves, total {values.sum():,.0f}")


if __name__ == "__main__":
    # Keep the geographic example from the tutorial.
    convert_file(
        "lab6_small_hierarchy.csv",
        ["continent", "country", "region", "city"],
        "population_thousands", "value",
    )
    # The formal assignment uses GDP and keeps status on every country.
    convert_file(
        "lab6_assignment_gdp.csv",
        ["continent", "area", "country"],
        "gdp_billion_usd", "gdp", "gdp_status",
    )
