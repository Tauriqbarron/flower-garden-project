#!/usr/bin/env python3
"""Download the 2 remaining flower images using different Wikipedia titles."""

import json
import urllib.request
import ssl
import os
import time

ssl._create_default_https_context = ssl._create_unverified_context

img_dir = "/home/tauriqbarron/Github/flower-garden-project/frontend/public/images/flowers"

# Try different Wikipedia article titles for the 2 remaining
remaining = {
    "Chrysanthemum": [
        "Chrysanthemum",
        "Chrysanthemoides",
        "Leucanthemum",
        "Chrysanthemum_segetum",
        "Tanacetum_coccineum",
    ],
    "Lavatera": [
        "Lavatera",
        "Lavatera_trimestris",
        "Malva_trimestris",
        "Lavatera_old",
        "Malva_trimestris",
        "Malvaceae",
    ]
}

for common, titles in remaining.items():
    filepath = os.path.join(img_dir, f"{common.lower()}.jpg")
    if os.path.exists(filepath) and os.path.getsize(filepath) > 5000:
        print(f"SKIP: {common} (already exists)")
        continue
    
    for wiki_title in titles:
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
            with urllib.request.urlopen(req, timeout=10) as resp:
                page_data = json.loads(resp.read())
            
            pages = page_data.get("query", {}).get("pages", {})
            
            for page_id, page in pages.items():
                if "thumbnail" in page:
                    image_url = page["thumbnail"]["source"]
                    
                    # Download
                    req2 = urllib.request.Request(image_url, headers={
                        "User-Agent": "FlowerGardenApp/1.0"
                    })
                    with urllib.request.urlopen(req2, timeout=15) as resp2:
                        img_data = resp2.read()
                    
                    if len(img_data) > 3000:
                        with open(filepath, "wb") as f:
                            f.write(img_data)
                        size_kb = os.path.getsize(filepath) / 1024
                        print(f"OK: {common} via {wiki_title} ({size_kb:.0f}KB)")
                        break
                else:
                    print(f"  No thumbnail in article: {wiki_title}")
        
        except Exception as e:
            print(f"  Error with {wiki_title}: {str(e)[:50]}")
        
    if os.path.exists(filepath):
        break
    
    time.sleep(1)
