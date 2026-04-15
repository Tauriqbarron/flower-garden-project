#!/usr/bin/env python3
"""Download remaining flower images from Wikimedia Commons with rate limiting."""

import json
import urllib.request
import urllib.parse
import ssl
import os
import time
import random

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
already_done = 0

def clean_filename(name):
    result = name.lower()
    for ch in "()'/!,":
        result = result.replace(ch, "-")
    result = result.replace(" ", "-")
    while "--" in result:
        result = result.replace("--", "-")
    return result.strip("-")

print("Downloading remaining flower images (slow, ~3s per image)...\n")

for i, flower in enumerate(flowers, 1):
    botanical = flower["botanical_name"]
    common = flower["common_name"]
    clean_name = clean_filename(common)
    filepath = os.path.join(img_dir, f"{clean_name}.jpg")

    if os.path.exists(filepath) and os.path.getsize(filepath) > 5000:
        print(f"  [{i}/{total}] SKIP (exists): {common}")
        already_done += 1
        continue

    # Wait 3-5 seconds between requests to avoid rate limiting
    time.sleep(3 + random.random() * 2)

    image_url = None
    best_title = None

    search_terms = [
        f"File:{botanical}",
        f"File:{botanical.split()[0]}" if botanical else None,
        f"File:{common}",
    ]
    search_terms = [t for t in search_terms if t]

    for attempt, term in enumerate(search_terms, 1):
        search_url = (
            "https://commons.wikimedia.org/w/api.php"
            "?action=query"
            "&generator=search"
            f"&gsrsearch={urllib.parse.quote(term)}"
            "&gsrnamespace=6&gsrlimit=5"
            "&prop=imageinfo"
            "&iiprop=url|thumburl|extmetadata"
            "&iiurlwidth=800"
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
                    candidate = info.get("thumburl") or info.get("url")
                    if candidate:
                        # Verify it's relevant to our flower
                        if any(w.replace(" ", "") in title.replace(" ", "_").lower()
                               for w in botanical.split()[:2] + common.split()[:2]):
                            image_url = candidate
                            best_title = page.get("title", "")
                            break

            if image_url:
                break

        except Exception as e:
            if "429" in str(e) or "403" in str(e):
                print(f"    Rate limited, waiting 5s...")
                time.sleep(5)
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

        if len(img_data) < 2000:
            raise ValueError("Image too small")

        with open(filepath, "wb") as f:
            f.write(img_data)

        size_kb = os.path.getsize(filepath) / 1024
        success += 1
        print(f"  [{i}/{total}] OK: {common} ({size_kb:.0f}KB) - {best_title}")

    except Exception as e:
        failed.append(common)
        print(f"  [{i}/{total}] FAIL: {common} - {str(e)[:50]}")

# Save mapping
mapping = {}
for flower in flowers:
    clean_name = clean_filename(flower["common_name"])
    filepath = os.path.join(img_dir, f"{clean_name}.jpg")
    if os.path.exists(filepath) and os.path.getsize(filepath) > 1000:
        mapping[flower["common_name"]] = f"/images/flowers/{clean_name}.jpg"

with open(os.path.join(base, "frontend/src/lib/flower-images.json"), "w") as f:
    json.dump(mapping, f, indent=2)

print(f"\n=== Results ===")
print(f"Already downloaded: {already_done}")
print(f"Newly downloaded: {success}")
print(f"Total with images: {already_done + success}/{total}")
print(f"Failed: {len(failed)}")
if failed:
    print(f"Still missing: {', '.join(failed)}")
