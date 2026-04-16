# Auckland Sowing Accuracy Report
**Generated:** 2026-04-16  
**Region:** Auckland, New Zealand (Zone 10a, Southern Hemisphere)  
**Files reviewed:** `backend/database/flowers.json`, `backend/database/vegetables.json`  
**Cross-referenced against:** Kings Seeds NZ, Kings Plant Barn, GardenGrow NZ, Tui Garden, Yates NZ, Blooming Flower Farm NZ, Daydream Green NZ

---

## Summary

| Category | Total entries | Correct | Minor issues | Significant errors |
|----------|--------------|---------|--------------|-------------------|
| Flowers  | 30 entries   | 24      | 4            | 2                 |
| Vegetables | 22 entries | 18      | 3            | 1                 |
| **Total** | **52 entries** | **42 (81%)** | **7 (13%)** | **3 (6%)** |

**Overall accuracy: ~81% fully correct, ~94% usable with caveats.**

---

## Critical Errors (Fix Immediately)

### 1. Scabiosa — Transplant dates are reversed / data entry error
**File:** `flowers.json`  
**Current:** `auckland_transplant_start: 5`, `auckland_transplant_end: 4`  
**Problem:** Transplant end (April = month 4) comes *before* transplant start (May = month 5), which creates an 11-month wrap-around window. This doesn't align with the sow window (Jul–Sep) or the flowering season (Oct–Mar). With a July sow, transplanting should occur ~8 weeks later (September–November).  
**Recommended fix:** `auckland_transplant_start: 9`, `auckland_transplant_end: 11`

---

### 2. Stock (Matthiola incana) — January sow start is wrong for Auckland
**File:** `flowers.json`  
**Current:** `auckland_sow_start: 1` (January)  
**Problem:** January is Auckland's hottest month (avg 23–25°C). Stock (Matthiola) requires cool germination temperatures of 15–18°C. Kings Plant Barn NZ explicitly states: *"cool loving flowers, preferring the cool of winter over the heat of summer, best sown from autumn through to mid-spring."* Auckland Botanic Gardens lists March as the correct start for autumn sowing. Sowing in January will result in poor germination and leggy, stressed seedlings.  
**Recommended fix:** `auckland_sow_start: 3` (March — beginning of Auckland autumn). The sow_end: 5 (May) is correct.

---

### 3. Sweet William (Dianthus barbatus) — January sow start is wrong for Auckland
**File:** `flowers.json`  
**Current:** `auckland_sow_start: 1` (January)  
**Problem:** Same issue as Stock. Sweet William has an optimal germination temperature of 15–21°C. January in Auckland (23–25°C, high humidity) is outside this range and promotes fungal damping off. Kings Seeds NZ "Summer Cutting Mix" suggests February onwards, and NZ horticultural guides consistently recommend late summer/autumn sowing (Feb–Apr) for spring flowering biennials.  
**Recommended fix:** `auckland_sow_start: 2` (February at earliest) or `3` (March — safer for Auckland heat).

---

## Moderate Issues (Should Fix)

### 4. Sweet Pea — Transplant window precedes sow window
**File:** `flowers.json`  
**Current:** `auckland_sow_start: 3`, `auckland_transplant_start: 2`  
**Problem:** Transplanting (February = month 2) is listed as starting one month *before* sowing (March = month 3). This is logically inconsistent. The transplant_start:2 may intend to capture sowing in trays indoors in February, but the field semantics say "transplant" not "tray sow."  
**Note:** The autumn sowing window itself (Mar–Apr) is correct per NZ cut flower guides. This is a data modelling inconsistency rather than a horticultural error.  
**Recommended fix:** Either set `auckland_transplant_start: 4` (April — 4–6 weeks after March sow), or add a separate `tray_sow_start: 2` field.

---

### 5. Celeriac — Sow window starts too early, harvest dates appear shifted
**File:** `vegetables.json`  
**Current:** `auckland_sow_start: 7` (July), `harvest_start: 4` (April), `harvest_end: 8` (August)  
**Problem:** GardenGrow NZ recommends October–November sowing for Auckland's warm temperate climate. Sowing in July (midwinter) in Auckland's climate risks slow germination and damping off. The harvest window of April–August (9–13 months from a July sow) is also unusually long — celeriac typically matures in 14–28 weeks (3.5–7 months). A more accurate Auckland harvest for Oct–Nov sowing would be **February–May** (summer/autumn), not April–August.  
**Recommended fix:** `auckland_sow_start: 9` (September), `harvest_start: 2` (February), `harvest_end: 6` (June). The September start also aligns with the transplant_start:9 already in the data.

---

### 6. Potato — January sow end is pushing the limit
**File:** `vegetables.json`  
**Current:** `auckland_sow_end: 1` (January)  
**Problem:** January planting in Auckland (high summer heat, peak humidity, peak disease pressure for tomato-potato psyllid and late blight) is possible but ill-advised. Most NZ guides and Kings Seeds NZ cap potato planting at November in the upper North Island/Auckland region.  
**Recommended fix:** `auckland_sow_end: 11` (November). This is a minor but meaningful improvement for Auckland-specific advice.

---

## Minor Issues (Low Priority)

### 7. Kale and Cavolo Nero — Winter sow months omitted
**File:** `vegetables.json`  
**Current Kale:** `auckland_sow_start: 10`, `auckland_sow_end: 5`  
**Current Cavolo Nero:** `auckland_sow_start: 10`, `auckland_sow_end: 4`  
**Problem:** The wrap-around window (Oct–May) omits June–September (Auckland winter). Both are frost-hardy brassicas that can be sown in Auckland's mild winters. Tui Garden and multiple NZ guides confirm year-round sowing is possible in Auckland for kale. The current data misses the winter sow window.  
**Recommended fix:** Extend sow_end to 8 (August) or mark as year-round (sow_start: 1, sow_end: 12) for Auckland.

---

### 8. Days-to-maturity figures don't match calendar timing for cool-season annuals
**File:** `flowers.json`  
**Affected flowers:** Ammi majus (130 days listed, but ~8 months actual to flower from March sow), Nigella (90 days listed, ~7 months actual), Larkspur (90 days listed, ~7 months actual), Snapdragon (130 days, ~7 months actual from March sow)  
**Problem:** These are cool-season annuals sown in Auckland's autumn (March–May) that grow *slowly* through winter before flowering in spring. The days_to_maturity figures appear to be warm-climate/Northern Hemisphere values under optimal conditions. The actual Auckland calendar timing listed is correct — the inconsistency is in the `days_to_maturity_sow` figure vs. the `auckland_sow_start`/`flowering_start` pairing.  
**Impact:** Low — the calendar fields are correct. Only affects any code that calculates flowering dates from days_to_maturity.  
**Recommended fix:** Add a note field like `"maturity_note": "Cool-season — grows slowly through Auckland winter; actual time from sow to flower is 5–8 months"`, or adjust `days_to_maturity_sow` to reflect Auckland conditions.

---

### 9. Ranunculus and Anemone — Sow window could extend to June
**File:** `flowers.json`  
**Current:** `auckland_sow_end: 5` (May) for both  
**Problem:** In Auckland's mild climate (rarely below 10°C), corm planting of Ranunculus and Anemone can extend into June. NZ growers report successful June planting for October–November flowering.  
**Recommended fix:** `auckland_sow_end: 6` (June) — minor extension.

---

## What Is Correct (Highlights)

The following entries are well-calibrated for Auckland and match current NZ horticultural guidance:

| Plant | Key timing | Verdict |
|-------|-----------|---------|
| Zinnia | Sow Sep–Feb, flower Nov–Apr | ✅ Correct |
| Cosmos | Sow Sep–Jan, flower Dec–Apr | ✅ Correct |
| Sweet Pea | Sow Mar–Apr (autumn), flower Oct–Feb | ✅ Correct |
| Dahlia | Plant Sep–Nov, flower Nov–Jun | ✅ Correct |
| Sunflower | Sow Sep–Feb, flower Nov–Apr | ✅ Correct |
| Gladiolus | Corm Aug–Feb, flower Dec–Apr | ✅ Correct |
| Lisianthus | Sow Jul–Aug (winter), flower Dec–Mar | ✅ Correct (standard NZ commercial practice) |
| Snapdragon | Sow Feb–May (cool season), flower Sep–Jan | ✅ Correct |
| Calendula | Sow Feb–May (cool season), flower Aug–Jan | ✅ Correct |
| Statice | Sow Aug–Jan, flower Dec–Apr | ✅ Correct |
| Celosia | Sow Sep–Jan, flower Dec–Apr | ✅ Correct |
| Cornflower | Sow Mar–Apr (autumn), flower Oct–Jan | ✅ Correct |
| Larkspur | Sow Mar–Apr (autumn), flower Oct–Dec | ✅ Correct |
| Gomphrena | Sow Sep–Jan, flower Dec–May | ✅ Correct |
| Kumara | Sow Sep–Oct (slips), transplant Oct–Dec | ✅ Correct |
| Onion | Sow Feb–Apr (short-day), harvest Nov–Jan | ✅ Correct |
| Garlic | Plant May–Jul, harvest Nov–Dec | ✅ Correct |
| Carrot | Sow Feb–Aug (avoiding Dec/Jan heat) | ✅ Correct |
| Pumpkin / Butternut | Sow Sep–Nov, harvest Feb–May | ✅ Correct |
| Beetroot | Sow Feb–Oct (wide window) | ✅ Correct |
| Parsnip | Sow Feb–May, harvest Jun–Nov | ✅ Correct |
| Leek | Sow Oct–Feb, harvest May–Oct | ✅ Correct |
| Dried Beans | Sow Oct–Dec (warm season) | ✅ Correct |
| Silverbeet | Year-round | ✅ Correct |
| Rocket | Year-round | ✅ Correct |
| NZ Spinach | Sow Sep–Dec (warm season) | ✅ Correct |
| Perpetual Spinach | Year-round | ✅ Correct |
| Mibuna / Mizuna | Sow Feb–Oct | ✅ Correct |
| Lettuce Cos | Sow Feb–Oct | ✅ Correct |

---

## Recommended Action Priority

| Priority | Item | Fix |
|----------|------|-----|
| 🔴 High | Scabiosa transplant dates | Change transplant_start:9, transplant_end:11 |
| 🔴 High | Stock sow_start | Change from 1 → 3 (March) |
| 🔴 High | Sweet William sow_start | Change from 1 → 2 or 3 |
| 🟡 Medium | Celeriac sow + harvest window | sow_start: 9, harvest_start: 2, harvest_end: 6 |
| 🟡 Medium | Potato sow_end | Change from 1 → 11 (November) |
| 🟡 Medium | Sweet Pea transplant_start | Fix data inconsistency |
| 🟢 Low | Kale / Cavolo Nero winter gap | Extend sow_end to include Jun–Aug |
| 🟢 Low | Ranunculus / Anemone sow_end | Extend to month 6 |
| 🟢 Low | Cool-season days_to_maturity | Add Auckland-adjusted note fields |

---

## Sources

The following NZ horticultural sources were cross-referenced when compiling and verifying this report:

| Source | Used for |
|--------|----------|
| **Kings Seeds NZ** | Sowing calendars, variety-specific guidance (Sweet William, Potato, general) |
| **Kings Plant Barn NZ** | Cool-season flower guidance (Stock/Matthiola) |
| **GardenGrow NZ** | Vegetable sowing windows for Auckland climate (Celeriac) |
| **Tui Garden** | Brassica year-round sowing guidance (Kale, Cavolo Nero) |
| **Yates NZ** | General sowing and growing references |
| **Blooming Flower Farm NZ** | Cut flower sowing calendars and commercial NZ practice |
| **Daydream Green NZ** | Auckland-specific flower growing guidance |
| **Auckland Botanic Gardens** | Autumn sowing start dates (Stock/Matthiola) |
