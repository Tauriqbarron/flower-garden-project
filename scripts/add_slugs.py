import json, os

base = "/home/tauriqbarron/Github/flower-garden-project"

with open(os.path.join(base, "backend/database/flowers.json")) as f:
    data = json.load(f)

for flower in data["flowers"]:
    # Generate URL-safe slug
    slug = flower["common_name"].lower()
    for ch in "()'/!,":
        slug = slug.replace(ch, "-")
    slug = slug.replace(" ", "-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    slug = slug.strip("-")
    flower["slug"] = slug

with open(os.path.join(base, "backend/database/flowers.json"), "w") as f:
    json.dump(data, f, indent=2)

print("Added slugs to all flowers:")
for flower in data["flowers"]:
    print(f"  {flower['common_name']} -> {flower['slug']}")
