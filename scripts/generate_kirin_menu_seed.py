"""Generate scripts/seed-kirin-menu.sql from menu-data-export.sql"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = (ROOT / "menu-data-export.sql").read_text(encoding="utf-8")
out: list[str] = [
    "-- Seed Kirin Hibachi Express menu (tenant_id=kirin)",
    "-- Starter menu based on shared hibachi/sushi structure.",
    "-- Adjust prices/SKUs later to match Kirin Square catalog.",
    "-- IDs prefixed with kirin- to avoid PK clash with Samurai.",
    "",
    "DELETE FROM menu_items WHERE tenant_id = 'kirin';",
    "DELETE FROM menu_categories WHERE tenant_id = 'kirin';",
    "",
]

cat_re = re.compile(
    r"INSERT INTO public\.menu_categories \(id, name, description, sort_order\) "
    r"VALUES \('([^']+)', '([^']*)', (NULL|'[^']*'), (\d+)\);"
)
for cid, name, desc, sort in cat_re.findall(src):
    out.append(
        "INSERT INTO menu_categories (id, tenant_id, name, description, sort_order) "
        f"VALUES ('kirin-{cid}', 'kirin', '{name}', {desc}, {sort});"
    )

out.append("")

item_re = re.compile(
    r"INSERT INTO public\.menu_items \(id, sku, name, description, category, price, "
    r"image_url, available, featured\) VALUES \('([^']+)', '([^']+)', '([^']*)', "
    r"(NULL|'[^']*'), '([^']+)', ([0-9.]+), NULL, (true|false), (true|false)\);"
)

def brand(text: str) -> str:
    return (
        text.replace("Samurai Steak", "Kirin Steak")
        .replace("Samurai Roll", "Kirin Roll")
        .replace("Indiana Roll", "Kentucky Roll")
        .replace("Samurai", "Kirin")
        .replace("Indiana", "Kentucky")
    )

for item_id, sku, name, desc, cat, price, avail, feat in item_re.findall(src):
    name = brand(name).replace("'", "''")
    if desc == "NULL":
        desc_sql = "NULL"
    else:
        inner = brand(desc[1:-1]).replace("'", "''")
        desc_sql = f"'{inner}'"
    out.append(
        "INSERT INTO menu_items "
        "(id, tenant_id, sku, name, description, category, price, image_url, available, featured) "
        f"VALUES ('kirin-{item_id}', 'kirin', '{sku}', '{name}', {desc_sql}, "
        f"'kirin-{cat}', {price}, NULL, {avail}, {feat});"
    )

out.append("")
out.append(
    "SELECT 'kirin categories' AS kind, count(*)::text AS n "
    "FROM menu_categories WHERE tenant_id='kirin' "
    "UNION ALL "
    "SELECT 'kirin items', count(*)::text FROM menu_items WHERE tenant_id='kirin';"
)

dest = ROOT / "scripts" / "seed-kirin-menu.sql"
dest.write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"Wrote {dest} ({len(out)} lines)")
