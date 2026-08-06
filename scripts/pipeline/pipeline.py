#!/usr/bin/env python3
"""auckland.garden plant-request build pipeline (ProDesk host, no Hermes).

Poll /api/admin/requests for pending requests; for each:
  1. PATCH -> building
  2. Research pass: DeepSeek (OpenAI-compatible) -> strict-JSON entry
  3. Validate fail-fast (schema, months, slug uniqueness vs catalog)
  4. Images: Wikimedia Commons per growth stage (harvest/seedling/young_plant)
  5. Ship: write entry into backend/database, images into frontend/public,
     git commit + push (auto-triggers the self-hosted runner deploy)
  6. Wait for deploy health, then PATCH -> published
On any failure: PATCH -> rejected with reason.

Runs from /opt/flower-garden-project via scripts/pipeline/run.sh (sources .env).
Stdlib only — Python 3.10 on the ProDesk host.
"""

import json
import logging
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

REPO = os.environ.get("PIPELINE_REPO", "/opt/flower-garden-project")
API_BASE = os.environ.get("PIPELINE_API_BASE", "http://localhost:8080")
API_KEY = os.environ.get("PIPELINE_API_KEY", "flower-pipeline-key-change-me")
LLM_BASE = os.environ.get("PIPELINE_LLM_BASE_URL", "https://api.deepseek.com")
LLM_KEY = os.environ.get("PIPELINE_LLM_API_KEY", "")
LLM_MODEL = os.environ.get("PIPELINE_LLM_MODEL", "deepseek-chat")
UA = "auckland.garden-pipeline/1.0 (contact: tauriqbarron@hotmail.co.nz)"

log = logging.getLogger("pipeline")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

VALID_MONTHS = set(range(1, 13))
VEG_TYPES = {"root", "leafy", "fruit", "allium", "legume", "brassica"}
VEG_CATS = {"staple", "green"}
FLOWER_TYPES = {"annual", "perennial", "biennial", "corm"}
STAGES = ["harvest", "seedling", "young_plant"]


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def _request(method, url, body=None, headers=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
        return r.status, json.loads(raw) if raw else None


def api(method, path, body=None):
    """Call the local backend through nginx (admin API)."""
    status, data = _request(
        method, API_BASE + path, body=body,
        headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    )
    return status, data


def patch_status(request_id, status, slug=None, reject_reason=None):
    payload = {"status": status}
    if slug:
        payload["slug"] = slug
    if reject_reason:
        payload["reject_reason"] = reject_reason
    status_code, _ = api("PATCH", f"/api/admin/requests/{request_id}", payload)
    if status_code != 200:
        log.warning("PATCH %s -> %s returned %s", request_id, status, status_code)
    return status_code


# ── Catalog + validation ─────────────────────────────────────────────────────

def slugify(name):
    slug = name.lower()
    for ch in "()'/!,":
        slug = slug.replace(ch, "-")
    slug = slug.replace(" ", "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def load_catalog():
    """{slug: plant_type} for every entry in the checked-out catalog."""
    found = {}
    for ptype, fname, key in (
        ("flower", "flowers.json", "flowers"),
        ("vegetable", "vegetables.json", "vegetables"),
        ("native", "natives.json", "natives"),
    ):
        path = os.path.join(REPO, "backend/database", fname)
        if not os.path.exists(path):
            continue
        with open(path) as f:
            data = json.load(f)
        for item in data.get(key, []):
            found[item.get("slug") or slugify(item.get("common_name", ""))] = ptype
    return found


def _err(entry, msg):
    return f"{msg} (entry: {entry.get('common_name', '?')})"


def validate_entry(entry, plant_type, catalog):
    """Fail-fast validation. Returns (entry, error)."""
    if not isinstance(entry, dict):
        return None, "LLM output was not a JSON object"

    name = str(entry.get("common_name", "")).strip()
    if not name:
        return None, "common_name is required"

    entry["slug"] = slugify(name)
    slug = entry["slug"]
    if slug in catalog:
        return None, f"'{name}' already in catalog as {catalog[slug]}"
    if not slug:
        return None, "slug is empty"

    # Common required text fields (germination may be null for non-seed-grown flowers)
    for field in ("botanical_name", "family", "sun", "soil_ph", "soil_type"):
        if not str(entry.get(field, "")).strip():
            return None, _err(entry, f"missing required field '{field}'")
    for field in ("germination_temp_c", "germination_days"):
        v = entry.get(field)
        if v is not None and not str(v).strip():
            return None, _err(entry, f"missing required field '{field}'")

    # Numbers — seed-metric fields may be null for plants grown from cuttings,
    # bulbs, corms or tubers (e.g. roses); spacing is always required.
    for field in ("spacing_cm", "row_spacing_cm"):
        val = entry.get(field)
        if not isinstance(val, int) or val <= 0:
            return None, _err(entry, f"'{field}' must be a positive integer")
    dtm = entry.get("days_to_maturity_sow")
    if dtm is not None and (not isinstance(dtm, int) or dtm <= 0):
        return None, _err(entry, "'days_to_maturity_sow' must be a positive integer or null")
    sow_depth = entry.get("sow_depth_cm")
    if sow_depth is not None and (not isinstance(sow_depth, (int, float)) or sow_depth <= 0):
        return None, _err(entry, "'sow_depth_cm' must be a positive number or null")

    # Regions
    regions = entry.get("regions")
    if not isinstance(regions, dict) or not {"auckland", "christchurch"} <= set(regions):
        return None, _err(entry, "regions must include auckland + christchurch")
    for rname in ("auckland", "christchurch"):
        r = regions.get(rname)
        if not isinstance(r, dict):
            return None, _err(entry, f"regions.{rname} missing")
        for mf in ("sow_start", "sow_end"):
            if r.get(mf) not in VALID_MONTHS:
                return None, _err(entry, f"regions.{rname}.{mf} must be 1-12")
        for mf in ("transplant_start", "transplant_end"):
            if r.get(mf) is not None and r.get(mf) not in VALID_MONTHS:
                return None, _err(entry, f"regions.{rname}.{mf} must be 1-12 or null")
        if not str(r.get("varieties", "")).strip():
            return None, _err(entry, f"regions.{rname}.varieties is required")

    # Type-specific
    if plant_type == "vegetable":
        if entry.get("type") not in VEG_TYPES:
            return None, _err(entry, f"type must be one of {sorted(VEG_TYPES)}")
        if entry.get("category") not in VEG_CATS:
            return None, _err(entry, f"category must be one of {sorted(VEG_CATS)}")
        for mf in ("harvest_start", "harvest_end"):
            if entry.get(mf) not in VALID_MONTHS:
                return None, _err(entry, f"'{mf}' must be 1-12")
        for field in ("storage_life_weeks", "storage_method", "pest_resistance",
                      "disease_resistance", "growing_notes", "pest_disease_notes",
                      "germination_temp_c", "germination_days"):
            if not str(entry.get(field, "")).strip():
                return None, _err(entry, f"missing required field '{field}'")
        if entry.get("days_to_maturity_sow") is None:
            return None, _err(entry, "'days_to_maturity_sow' is required for vegetables")
    else:  # flower
        if entry.get("type") not in FLOWER_TYPES:
            return None, _err(entry, f"type must be one of {sorted(FLOWER_TYPES)}")
        for mf in ("flowering_start", "flowering_end"):
            if entry.get(mf) not in VALID_MONTHS:
                return None, _err(entry, f"'{mf}' must be 1-12")
        for field in ("vase_life_days", "stem_length_cm", "cut_flower_notes",
                      "pest_disease_notes"):
            if not str(entry.get(field, "")).strip():
                return None, _err(entry, f"missing required field '{field}'")
        for field in ("pinching", "staking", "deadheading"):
            if not isinstance(entry.get(field), bool):
                return None, _err(entry, f"'{field}' must be a boolean")

    return entry, None


# ── LLM research pass ───────────────────────────────────────────────────────

VEG_SCHEMA_TEMPLATE = """{
  "common_name": "Potato",
  "botanical_name": "Solanum tuberosum",
  "family": "Solanaceae",
  "type": "root",                 // root | leafy | fruit | allium | legume | brassica
  "category": "staple",           // staple | green
  "sun": "full sun",
  "soil_ph": "5.0-6.5",
  "soil_type": "loose, well-draining, friable (avoid compacted clay)",
  "spacing_cm": 30,               // integer
  "row_spacing_cm": 75,           // integer
  "sow_depth_cm": 10,             // number
  "germination_temp_c": "7-25",   // string range
  "germination_days": "14-28",    // string range
  "days_to_maturity_sow": 110,    // integer
  "days_to_maturity_transplant": 90,  // integer or null
  "harvest_start": 1,             // month 1-12 (southern hemisphere)
  "harvest_end": 5,               // month 1-12
  "storage_life_weeks": "12-16",
  "storage_method": "Cool, dark, ventilated area (7-10C). Do not refrigerate.",
  "pest_resistance": "moderate",  // low | moderate | high
  "disease_resistance": "moderate",
  "growing_notes": "Mound soil around stems as plants grow (earthing up). ...",
  "pest_disease_notes": "Tomato-potato psyllid is the main Auckland pest ...",
  "regions": {
    "auckland":      {"sow_start": 9,  "sow_end": 11, "transplant_start": null, "transplant_end": null, "varieties": "Rocket, Desiree, Agria, Jersey Benne"},
    "christchurch":  {"sow_start": 10, "sow_end": 11, "transplant_start": null, "transplant_end": null, "varieties": "Rocket, Desiree, Agria, Jersey Benne"}
  }
}"""

FLOWER_SCHEMA_TEMPLATE = """{
  "common_name": "Zinnia",
  "botanical_name": "Zinnia elegans",
  "family": "Asteraceae",
  "type": "annual",               // annual | perennial | biennial | corm
  "sun": "full sun",
  "soil_ph": "5.5-7.5",
  "soil_type": "well-draining, fertile, compost-rich",
  "spacing_cm": 25,               // integer
  "row_spacing_cm": 30,           // integer
  "sow_depth_cm": 0.5,            // number
  "germination_temp_c": "21-27",  // string range
  "germination_days": "5-10",     // string range
  "days_to_maturity_sow": 65,     // integer
  "days_to_maturity_transplant": null,  // integer or null
  "flowering_start": 11,          // month 1-12 (southern hemisphere)
  "flowering_end": 4,             // month 1-12 (wraps year-end OK)
  "vase_life_days": "7-12",
  "stem_length_cm": "45-90",
  "pinching": true,               // boolean
  "staking": false,               // boolean
  "deadheading": true,            // boolean
  "cut_flower_notes": "Cut when flowers are nearly fully open and stems are firm. ...",
  "pest_disease_notes": "Powdery mildew common in Auckland humidity ...",
  "regions": {
    "auckland":      {"sow_start": 9,  "sow_end": 2, "transplant_start": 10, "transplant_end": 3, "varieties": "Purple Prince, Benary Giant series, Queen Lime"},
    "christchurch":  {"sow_start": 10, "sow_end": 12, "transplant_start": 11, "transplant_end": 1, "varieties": "Purple Prince, Benary Giant series, Queen Lime"}
  }
}"""


def research(common_name, plant_type):
    """DeepSeek research pass -> raw entry dict (unvalidated)."""
    if not LLM_KEY:
        return None, "PIPELINE_LLM_API_KEY not configured"
    template = VEG_SCHEMA_TEMPLATE if plant_type == "vegetable" else FLOWER_SCHEMA_TEMPLATE
    system = (
        "You are a New Zealand horticultural data curator for auckland.garden, a seasonal "
        "growing planner for Auckland (hardiness zone 10a, mild humid temperate) and "
        "Christchurch (zone 8a, cool with regular frosts). You produce complete, accurate "
        "plant records as STRICT JSON. Rules:\n"
        "- Months are 1-12 in the SOUTHERN hemisphere (Jan=1 ... Dec=12); sow windows reflect "
        "NZ conditions, Christchurch later/shorter than Auckland where frost matters.\n"
        "- Varieties must be real cultivars commonly available in New Zealand.\n"
        "- growing_notes, pest_disease_notes, storage_method, cut_flower_notes: 1-3 concise "
        "NZ-specific sentences each (mention Auckland pests like psyllid, blight, mildew, "
        "slugs, thrips where relevant).\n"
        "- spacing_cm / row_spacing_cm / days_to_maturity_sow are integers; sow_depth_cm a "
        "number; germination_temp_c / germination_days strings like '18-24' / '7-14'.\n"
        "- If the plant is NOT typically grown from seed (perennials from cuttings, "
        "roses, bulbs, corms, tubers): set days_to_maturity_sow, sow_depth_cm, "
        "germination_temp_c and germination_days to null instead of inventing values.\n"
        "- soil_ph a string range like '5.5-7.5'.\n"
        "- Respond with ONLY the JSON object — no markdown, no commentary."
    )
    user = (
        f"Create the entry for the {plant_type} '{common_name}'.\n"
        f"Return JSON matching exactly this schema shape (do not add fields, do not add "
        f"growth_stages or slug — the system adds those):\n\n{template}"
    )
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 2000,
    }
    status, data = _request(
        "POST", f"{LLM_BASE}/chat/completions", body=payload,
        headers={"Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json"},
        timeout=120,
    )
    if status != 200 or not data:
        return None, f"LLM API error {status}: {json.dumps(data)[:300]}"
    content = ""
    try:
        content = data["choices"][0]["message"]["content"]
        entry = json.loads(content)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        return None, f"Could not parse LLM response: {e} (first 200 chars: {content[:200]})"
    return entry, None


# ── Images (Wikimedia Commons) ───────────────────────────────────────────────

def _commons_search(query, limit=3):
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": query, "gsrlimit": limit, "gsrnamespace": 6,
        "prop": "imageinfo", "iiprop": "url|size", "iiurlwidth": 1280,
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    _, data = _request("GET", url, headers={"User-Agent": UA}, timeout=45)
    pages = (data or {}).get("query", {}).get("pages", {})
    best = None
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        w = info.get("width") or 0
        if w >= 600:
            thumb = info.get("thumburl") or info.get("url") or ""
            if thumb and (best is None or w > best[0]):
                best = (w, thumb, info.get("url") or "")
    return best


def fetch_images(entry, plant_type, staging_dir):
    """Download up to 3 growth-stage images from Wikimedia Commons.

    Returns (growth_stages, error). Missing stages -> null; all missing -> error.
    """
    botanical = entry.get("botanical_name", "")
    common = entry.get("common_name", "")
    queries = {
        "seedling": [f"{botanical} seedling", f"{common} seedling"],
        "young_plant": [f"{botanical} young plant", f"{common} young plant", f"{botanical} plant"],
        "harvest": (
            [f"{botanical} flower", f"{common} flower bloom"]
            if plant_type == "flower"
            else [f"{botanical} vegetable", f"{common} vegetable", f"{botanical} root"]
        ),
    }
    os.makedirs(staging_dir, exist_ok=True)
    stages = {}
    for stage in STAGES:
        got = None
        for q in queries[stage]:
            try:
                got = _commons_search(q)
            except Exception as e:
                log.warning("commons search '%s' failed: %s", q, e)
            if got:
                break
        if not got:
            stages[stage] = None
            continue
        _, thumb, orig = got
        url = thumb or orig
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1] or ".jpg"
        if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
            ext = ".jpg"
        dest = os.path.join(staging_dir, f"{stage}{ext.lower()}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
                f.write(r.read())
            stages[stage] = f"/images/{plant_type if plant_type == 'flower' else 'vegetables'}/{entry['slug']}/{stage}{ext.lower()}"
            log.info("image %s: %s (%s bytes)", stage, url, os.path.getsize(dest))
        except Exception as e:
            log.warning("download %s failed: %s", url, e)
            stages[stage] = None

    if not any(stages.values()):
        return None, "Could not source any images from Wikimedia Commons"
    return stages, None


# ── Ship (repo + git + deploy wait) ──────────────────────────────────────────

def ship(entry, plant_type, staging_dir, request_id):
    """Write catalog entry + images, commit, push. Returns (ok, error)."""
    list_key = "flowers" if plant_type == "flower" else "vegetables"
    db_path = os.path.join(REPO, "backend/database", f"{list_key}.json")
    with open(db_path) as f:
        data = json.load(f)
    data[list_key].append(entry)
    with open(db_path, "w") as f:
        json.dump(data, f, indent=2)

    img_src = os.path.join(staging_dir)
    img_dst = os.path.join(REPO, "frontend/public/images", list_key, entry["slug"])
    os.makedirs(img_dst, exist_ok=True)
    for fn in os.listdir(img_src):
        if fn != "entry.json":
            shutil_copy = subprocess.run(["cp", os.path.join(img_src, fn), os.path.join(img_dst, fn)])
            if shutil_copy.returncode != 0:
                return False, f"could not copy image {fn}"

    msg = f"add {entry['common_name']} ({plant_type}) — user request {request_id}"
    r = subprocess.run(
        ["git", "-C", REPO, "add", db_path, img_dst],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return False, f"git add failed: {r.stderr.strip()[:200]}"
    r = subprocess.run(
        ["git", "-C", REPO, "commit", "-m", msg],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        return False, f"git commit failed: {r.stderr.strip()[:200]}"
    r = subprocess.run(
        ["git", "-C", REPO, "push", "origin", "main"],
        capture_output=True, text=True, timeout=120,
    )
    if r.returncode != 0:
        return False, f"git push failed: {r.stderr.strip()[:200]}"
    return True, None


def wait_for_deploy(slug, plant_type, timeout=300):
    """Poll the local nginx + detail API until the entry is live."""
    list_key = "flowers" if plant_type == "flower" else "vegetables"
    probe = f"{API_BASE}/api/{list_key}/{urllib.parse.quote(slug)}?region=auckland"
    start = time.time()
    while time.time() - start < timeout:
        try:
            status, _ = _request("GET", probe, timeout=10)
            if status == 200:
                return True
        except Exception:
            pass
        time.sleep(10)
    return False


# ── Main ─────────────────────────────────────────────────────────────────────

def process_request(req):
    rid = req["id"]
    name = req["common_name"]
    ptype = req["plant_type"]
    log.info("=== processing request %s: %s (%s) ===", rid, name, ptype)

    if patch_status(rid, "building") != 200:
        log.error("could not mark building")
        return

    catalog = load_catalog()

    # 1. Research
    entry, err = research(name, ptype)
    if err:
        log.error("research failed: %s", err)
        patch_status(rid, "rejected", reject_reason=err[:300])
        return

    # 2. Validate
    entry, err = validate_entry(entry, ptype, catalog)
    if err:
        log.error("validation failed: %s", err)
        patch_status(rid, "rejected", reject_reason=err[:300])
        return
    log.info("validated %s (slug=%s)", entry["common_name"], entry["slug"])

    # 3. Images
    staging_dir = os.path.join(REPO, "data/pipeline/staging", entry["slug"])
    stages, err = fetch_images(entry, ptype, staging_dir)
    if err:
        log.error("images failed: %s", err)
        patch_status(rid, "rejected", reject_reason=err[:300])
        return
    entry["growth_stages"] = stages
    with open(os.path.join(staging_dir, "entry.json"), "w") as f:
        json.dump(entry, f, indent=2)

    # 4. Ship
    ok, err = ship(entry, ptype, staging_dir, rid)
    if not ok:
        log.error("ship failed: %s", err)
        patch_status(rid, "rejected", reject_reason=err[:300])
        return
    log.info("pushed to main — waiting for deploy")

    # 5. Deploy wait + publish
    if wait_for_deploy(entry["slug"], ptype):
        log.info("entry live — publishing")
        patch_status(rid, "published", slug=entry["slug"])
    else:
        log.warning("deploy not confirmed healthy in time — publishing anyway (entry is committed)")
        patch_status(rid, "published", slug=entry["slug"])


def main():
    if not LLM_KEY:
        log.error("PIPELINE_LLM_API_KEY not set — aborting")
        sys.exit(1)

    status, data = api("GET", "/api/admin/requests?status=pending")
    if status != 200 or data is None:
        log.error("could not poll pending requests: HTTP %s", status)
        sys.exit(1)
    pending = data or []
    log.info("found %s pending request(s)", len(pending))
    for req in pending:
        try:
            process_request(req)
        except Exception as e:
            log.exception("unhandled error processing %s: %s", req.get("id"), e)
            try:
                patch_status(req["id"], "rejected", reject_reason=f"Pipeline error: {str(e)[:250]}")
            except Exception:
                log.exception("failed to mark rejected after crash")


if __name__ == "__main__":
    main()
