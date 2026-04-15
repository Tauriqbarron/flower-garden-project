#!/usr/bin/env python3
"""Fix the 2 missing flower images by downloading from Wikimedia Commons."""

import json, urllib.request, urllib.parse, ssl, os, time

ssl._create_default_https_context = ssl._create_unverified_context

img_dir = "/home/tauriqbarron/Github/flower-garden-project/frontend/public/images/flowers"

# Fix Freesia - try Commons with different search
freesia_file = os.path.join(img_dir, "freesia.jpg")
sweet_william_file = os.path.join(img_dir, "sweet-william.jpg")

# Freesia: search Commons Files with "Freesia flower"
for attempt in range(3):
    try:
        # Use Wikipedia pageimages API for Freesia
        url = "https://en.wikipedia.org/w/api.php?action=query&titles=Freesia_x_hybrida&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*"
        req = urllib.request.Request(url, headers={"User-Agent": "FlowerGardenApp/1.0"})
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        
        img_url = None
        for pid, page in data.get("query", {}).get("pages", {}).items():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                img_url = thumb
                break
        
        # Fallback: try pageimages for just "Freesia"  
        if not img_url:
            url2 = "https://en.wikipedia.org/w/api.php?action=query&titles=Freesia&prop=pageimages&piprop=original&format=json&origin=*"
            req2 = urllib.request.Request(url2, headers={"User-Agent": "FlowerGardenApp/1.0"})
            resp2 = urllib.request.urlopen(req2, timeout=15)
            data2 = json.loads(resp2.read())
            for pid, page in data2.get("query", {}).get("pages", {}).items():
                thumb = page.get("pageimage")
                if thumb and ".svg" not in thumb:
                    # Get the file info
                    url3 = f"https://en.wikipedia.org/w/api.php?action=query&titles=File:{thumb}&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*"
                    req3 = urllib.request.Request(url3, headers={"User-Agent": "FlowerGardenApp/1.0"})
                    resp3 = urllib.request.urlopen(req3, timeout=15)
                    data3 = json.loads(resp3.read())
                    for p2 in data3.get("query", {}).get("pages", {}).values():
                        if "imageinfo" in p2:
                            img_url = p2["imageinfo"][0].get("thumburl") or p2["imageinfo"][0].get("url")
                            break
        
        if img_url:
            req_dl = urllib.request.Request(img_url, headers={"User-Agent": "FlowerGardenApp/1.0"})
            with urllib.request.urlopen(req_dl, timeout=20) as resp_dl:
                img_data = resp_dl.read()
            if len(img_data) > 3000:
                with open(freesia_file, "wb") as f:
                    f.write(img_data)
                print(f"Freesia downloaded: {os.path.getsize(freesia_file)/1024:.0f}KB")
                break
            else:
                print(f"Freesia image too small: {len(img_data)} bytes")
        else:
            print("Freesia: No image found")
    
    except Exception as e:
        print(f"Freesia attempt {attempt+1} failed: {str(e)[:60]}")
        time.sleep(2)

# Sweet William - Dianthus barbatus
for attempt in range(3):
    try:
        url = "https://en.wikipedia.org/w/api.php?action=query&titles=Dianthus_barbatus&prop=pageimages&piprop=original&format=json&origin=*"
        req = urllib.request.Request(url, headers={"User-Agent": "FlowerGardenApp/1.0"})
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read())
        
        img_url = None
        for pid, page in data.get("query", {}).get("pages", {}).items():
            # Get the main image of the article
            main_img = page.get("pageimage")
            if main_img and ".svg" not in main_img:
                # Get file info with thumbnail
                url2 = f"https://en.wikipedia.org/w/api.php?action=query&titles=File:{main_img}&prop=imageinfo&iiprop=url|thumburl&iiurlwidth=800&format=json&origin=*"
                req2 = urllib.request.Request(url2, headers={"User-Agent": "FlowerGardenApp/1.0"})
                resp2 = urllib.request.urlopen(req2, timeout=15)
                data2 = json.loads(resp2.read())
                for p2 in data2.get("query", {}).get("pages", {}).values():
                    if "imageinfo" in p2:
                        info = p2["imageinfo"][0]
                        img_url = info.get("thumburl") or info.get("url")
                        break
        
        if img_url:
            req_dl = urllib.request.Request(img_url, headers={"User-Agent": "FlowerGardenApp/1.0"})
            with urllib.request.urlopen(req_dl, timeout=20) as resp_dl:
                img_data = resp_dl.read()
            if len(img_data) > 3000:
                with open(sweet_william_file, "wb") as f:
                    f.write(img_data)
                print(f"Sweet William downloaded: {os.path.getsize(sweet_william_file)/1024:.0f}KB")
                break
            else:
                print(f"Sweet William image too small: {len(img_data)} bytes")
        else:
            print("Sweet William: No image found")
    
    except Exception as e:
        print(f"Sweet William attempt {attempt+1} failed: {str(e)[:60]}")
        time.sleep(2)

# Count total images
all_imgs = [f for f in os.listdir(img_dir) if f.endswith(".jpg")]
print(f"\nTotal images: {len(all_imgs)}/30")
