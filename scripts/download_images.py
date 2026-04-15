#!/usr/bin/env python3
"""Download flower images from Wikimedia Commons for the Flower Garden app."""

import json
import urllib.request
import urllib.parse
import ssl
import os
import time

ssl._create_default_https_context = ssl._create_unverified_context

base = "/home/tauriqbarron/Github/flower-garden-project"
with open(os.path.join(base, "backend/database/flowers.json")) as f:
    data = json.load(f)

img_dir = os.path.join(base, "frontend/public/images/flowers")
os.makedirs(img_dir, exist_ok=True)

flowers = data["flowers"]
total = len(flowers)
success = 0
failed = []
mapping = {}

def clean_filename(name):
    result = name.lower()
    for ch in "()'/!,":
        result = result.replace(ch, "-")
    result = result.replace(" ", "-")
    while "--" in result:
        result = result.replace("--", "-")
    return result.strip("-")

# Step 1: For each flower, search Commons for the botanical name in File namespace
print("Phase 1: Downloading flower images from Wikimedia Commons...\n")

for i, flower in enumerate(flowers, 1):
    botanical = flower["botanical_name"]
    common = flower["common_name"]
    clean_name = clean_filename(common)
    filepath = os.path.join(img_dir, f"{clean_name}.jpg")

    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        print(f"  [{i}/{total}] SKIP (exists): {common}")
        mapping[common] = f"/images/flowers/{clean_name}.jpg"
        success += 1
        continue

    image_url = None
    best_title = None

    # Try multiple search strategies
    search_terms = [
        f"File:{botanical}",
        botanical,
        f"{botanical} flower",
        f"Category:{botanical}",
        common,
    ]

    for term in search_terms:
        search_url = (
            "https://commons.wikimedia.org/w/api.php"
            "?action=query"
            "&generator=search"
            f"&gsrsearch={urllib.parse.quote(term)}"
            "&gsrnamespace=6&gsrlimit=5"
            "&prop=imageinfo"
            "&iiprop=url|thumburl|extmetadata"
            "&iiurlwidth=600"
            "&format=json&origin=*"
        )

        try:
            req = urllib.request.Request(search_url, headers={"User-Agent": "FlowerGardenApp/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                search_results = json.loads(resp.read())

            pages = search_results.get("query", {}).get("pages", {})

            for page_id, page in pages.items():
                title = page.get("title", "").lower()
                if "imageinfo" in page:
                    info = page["imageinfo"][0]
                    image_url = info.get("thumburl") or info.get("url")
                    best_title = page.get("title", "")
                    # Check if the file actually matches our flower (not a logo or something)
                    if best_title:
                        tl = best_title.lower()
                        if any(w in tl for w in botanical.lower().split()[:2] + common.lower().split()[:2]):
                            break
                        # If the botanical name is in the filename, it's a good match
                        if botanical.split()[0].lower().replace(" ", "") in tl.replace(" ", "").replace("-", ""):
                            break
                    break

            if image_url:
                break

        except Exception:
            continue

    if not image_url:
        failed.append(common)
        print(f"  [{i}/{total}] FAIL: {common}")
        continue

    # Download the image
    try:
        req = urllib.request.Request(image_url, headers={"User-Agent": "FlowerGardenApp/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            img_data = resp.read()

        if len(img_data) < 1000:
            raise ValueError("Image too small")

        with open(filepath, "wb") as f:
            f.write(img_data)

        mapping[common] = f"/images/flowers/{clean_name}.jpg"
        success += 1
        print(f"  [{i}/{total}] OK: {common}")

    except Exception as e:
        failed.append(common)
        print(f"  [{i}/{total}] FAIL: {common} - {str(e)[:50]}")

    time.sleep(0.3)

# Save mapping
with open(os.path.join(base, "frontend/src/lib/flower-images.json"), "w") as f:
    json.dump(mapping, f, indent=2)

print(f"\n=== Results ===")
print(f"Downloaded: {success}/{total}")
print(f"Failed: {len(failed)}")
if failed:
    print(f"Failed list: {', '.join(failed)}")
    print(f"\nFailed images will show a placeholder emoji in the frontend.")
