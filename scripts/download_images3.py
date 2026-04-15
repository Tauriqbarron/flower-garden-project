#!/usr/bin/env python3
"""Download remaining flower images - ultra-slow to avoid rate limits."""

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

flowers = data["flowers"]
total = len(flowers)
success = 0
already_done = 0
failed = []

def clean_filename(name):
    result = name.lower()
    for ch in "()'/!,":
        result = result.replace(ch, "-")
    result = result.replace(" ", "-")
    while "--" in result:
        result = result.replace("--", "-")
    return result.strip("-")

print("Downloading remaining images (12s per flower to avoid rate limits)...\n")

for i, flower in enumerate(flowers, 1):
    botanical = flower["botanical_name"]
    common = flower["common_name"]
    clean_name = clean_filename(common)
    filepath = os.path.join(img_dir, f"{clean_name}.jpg")

    if os.path.exists(filepath) and os.path.getsize(filepath) > 5000:
        print(f"  [{i}/{total}] SKIP: {common}")
        already_done += 1
        continue

    # 12 second delay between requests
    time.sleep(12)

    image_url = None
    best_title = None

    search_url = (
        "https://commons.wikimedia.org/w/api.php"
        "?action=query"
        "&generator=search"
        f"&gsrsearch=File%3A{urllib.parse.quote(botanical)}&gsrnamespace=6"
        "&gsrlimit=5&prop=imageinfo"
        "&iiprop=url|thumburl"
        "&iiurlwidth=800"
        "&format=json&origin=*"
    )

    try:
        req = urllib.request.Request(search_url, headers={
            "User-Agent": "Mozilla/5.0 FlowerGardenApp/1.0",
            "Accept": "application/json"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            search_results = json.loads(resp.read())

        pages = search_results.get("query", {}).get("pages", {})

        for page_id, page in pages.items():
            title = page.get("title", "")
            if "imageinfo" in page:
                info = page["imageinfo"][0]
                candidate = info.get("thumburl") or info.get("url")
                if candidate and title:
                    image_url = candidate
                    best_title = title
                    break

    except Exception as e:
        err_str = str(e)
        if "429" in err_str:
            print(f"  [{i}/{total}] RATE LIMITED again - backing off 15s: {common}")
            time.sleep(15)
        else:
            print(f"  [{i}/{total}] API ERROR: {common} - {err_str[:50]}")

    if not image_url:
        failed.append(common)
        print(f"  [{i}/{total}] NO IMAGE: {common}")
        continue

    # Download image
    try:
        req = urllib.request.Request(image_url, headers={
            "User-Agent": "Mozilla/5.0 FlowerGardenApp/1.0",
            "Accept": "image/*"
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            img_data = resp.read()

        if len(img_data) < 2000:
            raise ValueError(f"Too small: {len(img_data)} bytes")

        with open(filepath, "wb") as f:
            f.write(img_data)

        size_kb = os.path.getsize(filepath) / 1024
        success += 1
        print(f"  [{i}/{total}] OK: {common} ({size_kb:.0f}KB)")

    except Exception as e:
        failed.append(common)
        print(f"  [{i}/{total}] DOWNLOAD FAIL: {common} - {str(e)[:50]}")


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
print(f"Already had: {already_done}")
print(f"Downloaded: {success}")
print(f"Total: {already_done + success}/{total}")
if failed:
    print(f"Failed: {', '.join(failed)}")
