#!/usr/bin/env python3
"""Download remaining flower images using Wikipedia article main images."""

import json
import urllib.request
import urllib.parse
import ssl
import os

ssl._create_default_https_context = ssl._create_unverified_context

base = "/home/tauriqbarron/Github/flower-garden-project"
with open(os.path.join(base, "backend/database/flowers.json")) as f:
    data = json.load(f)

img_dir = os.path.join(base, "frontend/public/images/flowers")

def clean_filename(name):
    result = name.lower()
    for ch in "()'/!,":
        result = result.replace(ch, "-")
    result = result.replace(" ", "-")
    while "--" in result:
        result = result.replace("--", "-")
    return result.strip("-")

flowers = data["flowers"]

# These failed previously - use the Wikipedia article approach (no search API, just page images)
failed_names = [
    "Anemone", "Freesia", "Chrysanthemum", "Snapdragon", "Calendula",
    "Delphinium", "Statice", "Celosia - Plume", "Nigella", 
    "Buddleja (Butterfly Bush) - Cut", "Echinacea", "Rudbeckia", 
    "Strawflower", "Stock", "Larkspur (Annual)", "Scabiosa", 
    "Bupleurum", "Ammi majus", "Gomphrena", "Sweet William", "Lavatera"
]

# Map common names to their Wikipedia article titles
wiki_titles = {
    "Anemone": "Anemone_coronaria",
    "Freesia": "Freesia",
    "Chrysanthemum": "Chrysanthemum_morifolium",
    "Snapdragon": "Antirrhinum",
    "Calendula": "Calendula_officinalis",
    "Delphinium": "Delphinium",
    "Statice": "Limonium_sinuatum",
    "Celosia - Plume": "Celosia_argentea",
    "Nigella": "Nigella_damascena",
    "Buddleja (Butterfly Bush) - Cut": "Buddleja_davidii",
    "Echinacea": "Echinacea_purpurea",
    "Rudbeckia": "Rudbeckia_hirta",
    "Strawflower": "Xerochrysum_bracteatum",
    "Stock": "Matthiola_incana",
    "Larkspur (Annual)": "Consolida",
    "Scabiosa": "Scabiosa",
    "Bupleurum": "Bupleurum",
    "Ammi majus": "Ammi_majus",
    "Gomphrena": "Gomphrena_globosa",
    "Sweet William": "Dianthus_barbatus",
    "Lavatera": "Lavatera_trimestris",
}

print("Downloading remaining flower images using Wikipedia page images API...\n")
success = 0
failed = []

for i, common in enumerate(failed_names, 1):
    clean_name = clean_filename(common)
    filepath = os.path.join(img_dir, f"{clean_name}.jpg")
    
    if os.path.exists(filepath) and os.path.getsize(filepath) > 5000:
        print(f"  [{i}/{len(failed_names)}] SKIP: {common}")
        success += 1
        continue
    
    wiki_title = wiki_titles.get(common, common.replace(" ", "_"))
    
    # Use pageimages API to get the main image from the Wikipedia article
    api_url = (
        f"https://en.wikipedia.org/w/api.php"
        f"?action=query&titles={wiki_title}"
        f"&prop=pageimages&piprop=thumbnail"
        f"&pithumbsize=800"
        f"&format=json&origin=*"
    )
    
    try:
        req = urllib.request.Request(api_url, headers={
            "User-Agent": "FlowerGardenApp/1.0 (https://github.com/tauriqbarron)"
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            page_data = json.loads(resp.read())
        
        pages = page_data.get("query", {}).get("pages", {})
        image_url = None
        
        for page_id, page in pages.items():
            if "thumbnail" in page:
                image_url = page["thumbnail"]["source"]
                break
        
        if not image_url:
            raise ValueError("No thumbnail found")
        
        # Download the image
        req = urllib.request.Request(image_url, headers={
            "User-Agent": "FlowerGardenApp/1.0 (https://github.com/tauriqbarron)"
        })
        with urllib.request.urlopen(req, timeout=15) as resp2:
            img_data = resp2.read()
        
        if len(img_data) < 3000:
            raise ValueError("Image too small")
        
        with open(filepath, "wb") as f:
            f.write(img_data)
        
        size_kb = os.path.getsize(filepath) / 1024
        success += 1
        print(f"  [{i}/{len(failed_names)}] OK: {common} ({size_kb:.0f}KB)")
    
    except Exception as e:
        failed.append(common)
        print(f"  [{i}/{len(failed_names)}] FAIL: {common} - {str(e)[:60]}")
    
    # Small delay between requests
    import time
    time.sleep(1)

print(f"\n=== Summary ===")
print(f"Successfully downloaded: {success}/{len(failed_names)}")
if failed:
    print(f"Still missing: {', '.join(failed)}")
