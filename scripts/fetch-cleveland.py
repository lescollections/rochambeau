#!/usr/bin/env python3
"""Build a large demo collection from the Cleveland Museum of Art open access API.

The museum publishes its catalogue under CC0 with a REST API. This script pulls
artworks that have a picture and writes them in the "lescollections-vitrine/1"
format, next to each other, exactly as an export pass would:

    example/cleveland/collection.json
    example/cleveland/objets.ndjson
    example/cleveland/objets.csv
    example/cleveland/objets.xlsx

Its reason to exist is load testing: 2,500 objects, all with pictures, is the
top of the lescollections.fr plans, so it tells us how the showcase behaves at
the largest size it will realistically face.

Usage:
    python3 scripts/fetch-cleveland.py [count]

No third-party dependency: the XLSX is written straight as its underlying
zip of XML parts.
"""

from __future__ import annotations

import csv
import json
import re
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

API = "https://openaccess-api.clevelandart.org/api/artworks/"
PAGE_SIZE = 1000  # hard ceiling of the API
MAX_PICTURES = 6  # alternates beyond this add weight without adding coverage
OUTPUT = Path(__file__).resolve().parent.parent / "example" / "cleveland"

# Order here is display order in the showcase.
SCHEMA = [
    ("denomination", "Object type", False),
    ("auteur", "Artist", True),
    ("datation", "Date", True),
    ("domaine", "Department", True),
    ("culture", "Culture", True),
    ("materiaux", "Materials", False),
    ("technique", "Technique", False),
    ("dimensions", "Dimensions", False),
    ("provenance", "Credit line", False),
    ("localisation", "Location", True),
]


def fetch_page(skip: int, limit: int) -> list[dict]:
    url = f"{API}?has_image=1&limit={limit}&skip={skip}"
    request = urllib.request.Request(url, headers={"User-Agent": "rochambeau-demo/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response).get("data", [])


def as_text_list(value) -> list[str]:
    """Some list fields hold plain strings, others objects carrying a description."""
    items = []
    for item in value or []:
        if isinstance(item, str):
            text = item.strip()
        elif isinstance(item, dict):
            text = str(item.get("description") or item.get("name") or "").strip()
        else:
            text = str(item).strip()
        if text:
            items.append(text)
    return items


def artist_of(record: dict) -> str:
    """Keep the name, drop the parenthetical biography that follows it."""
    names = []
    for creator in record.get("creators") or []:
        description = (creator.get("description") or "").strip()
        if not description:
            continue
        names.append(re.sub(r"\s*\(.*", "", description).strip())
    return " — ".join(name for name in names if name)


def pictures_of(record: dict) -> list[dict]:
    """Display versions only, never the full TIFF original."""
    pictures = []
    images = record.get("images") or {}
    web = images.get("web") or {}

    def add(url: str, width, height, main: bool) -> None:
        if not url:
            return
        picture = {"plein": url, "apercu": url}
        try:
            picture["l"] = int(width)
            picture["h"] = int(height)
        except (TypeError, ValueError):
            pass
        if record.get("title"):
            picture["legende"] = record["title"]
        if main:
            picture["principale"] = True
        pictures.append(picture)

    add(web.get("url"), web.get("width"), web.get("height"), True)

    for alternate in (record.get("alternate_images") or [])[: MAX_PICTURES - 1]:
        alternate_web = (alternate or {}).get("web") or {}
        add(alternate_web.get("url"), alternate_web.get("width"), alternate_web.get("height"), False)

    return pictures


def transform(record: dict) -> dict | None:
    pictures = pictures_of(record)
    if not pictures:
        return None

    identifier = (record.get("accession_number") or "").strip()
    title = (record.get("title") or "").strip()
    if not identifier or not title:
        return None

    fields = {
        "denomination": (record.get("type") or "").strip(),
        "auteur": artist_of(record),
        "datation": (record.get("creation_date") or "").strip(),
        "domaine": (record.get("department") or "").strip(),
        "culture": as_text_list(record.get("culture")),
        "materiaux": " — ".join(as_text_list(record.get("support_materials"))),
        "technique": (record.get("technique") or "").strip(),
        "dimensions": (record.get("measurements") or "").strip(),
        "provenance": (record.get("creditline") or "").strip(),
        "localisation": (record.get("current_location") or "").strip()
        or "The Cleveland Museum of Art",
    }
    # The format carries non-empty fields only.
    fields = {code: value for code, value in fields.items() if value}

    return {
        "id": identifier,
        "titre": title,
        "champs": fields,
        "images": pictures,
        "credit": "CC0 — The Cleveland Museum of Art",
    }


def flatten(value) -> str:
    if value is None:
        return ""
    return " — ".join(value) if isinstance(value, list) else str(value)


def table_rows(objects: list[dict]) -> tuple[list[str], list[list[str]]]:
    header = ["Accession no.", "Title"] + [label for _, label, _ in SCHEMA] + ["Credit", "Image"]
    rows = []
    for obj in objects:
        main = next((p for p in obj["images"] if p.get("principale")), obj["images"][0])
        rows.append(
            [obj["id"], obj["titre"]]
            + [flatten(obj["champs"].get(code)) for code, _, _ in SCHEMA]
            + [obj.get("credit", ""), main["plein"]]
        )
    return header, rows


def write_xlsx(path: Path, header: list[str], rows: list[list[str]]) -> None:
    """Write the workbook with openpyxl when available, by hand otherwise."""
    try:
        import openpyxl
    except ImportError:
        write_xlsx_by_hand(path, header, rows)
        return

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Objets"
    sheet.append(header)
    for row in rows:
        sheet.append(row)

    # Freeze the header and give each column a workable width.
    sheet.freeze_panes = "A2"
    for index, label in enumerate(header, start=1):
        longest = max((len(str(row[index - 1])) for row in rows[:200]), default=0)
        letter = openpyxl.utils.get_column_letter(index)
        sheet.column_dimensions[letter].width = min(60, max(len(label) + 2, min(longest, 60)))
    for cell in sheet[1]:
        cell.font = openpyxl.styles.Font(bold=True)

    workbook.save(path)


def write_xlsx_by_hand(path: Path, header: list[str], rows: list[list[str]]) -> None:
    """Minimal but valid XLSX: one sheet, inline strings, no shared table."""

    def column_name(index: int) -> str:
        name = ""
        while index >= 0:
            name = chr(ord("A") + index % 26) + name
            index = index // 26 - 1
        return name

    def cell(column: int, row: int, text: str) -> str:
        # Control characters are not allowed in the XML payload.
        clean = "".join(c for c in text if c >= " " or c in "\t\n")
        return (
            f'<c r="{column_name(column)}{row}" t="inlineStr">'
            f"<is><t xml:space=\"preserve\">{escape(clean)}</t></is></c>"
        )

    sheet = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
    sheet.append(
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        "<sheetData>"
    )
    for number, values in enumerate([header] + rows, start=1):
        cells = "".join(cell(column, number, value) for column, value in enumerate(values))
        sheet.append(f'<row r="{number}">{cells}</row>')
    sheet.append("</sheetData></worksheet>")

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>"
    )
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Objets" sheetId="1" r:id="rId1"/></sheets></workbook>'
    )
    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", "".join(sheet))


def main() -> None:
    wanted = int(sys.argv[1]) if len(sys.argv) > 1 else 2500

    objects: list[dict] = []
    seen: set[str] = set()
    skip = 0

    while len(objects) < wanted:
        batch = fetch_page(skip, PAGE_SIZE)
        if not batch:
            print(f"API returned nothing at skip={skip}, stopping early", file=sys.stderr)
            break
        for record in batch:
            transformed = transform(record)
            if not transformed or transformed["id"] in seen:
                continue
            seen.add(transformed["id"])
            objects.append(transformed)
            if len(objects) == wanted:
                break
        skip += PAGE_SIZE
        print(f"  {len(objects)} / {wanted}", file=sys.stderr)
        time.sleep(0.5)  # be a good citizen with a public API

    OUTPUT.mkdir(parents=True, exist_ok=True)

    manifest = {
        "format": "lescollections-vitrine/1",
        "genere_le": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "collection": {
            "slug": "cleveland",
            "titre": "Cleveland Museum of Art — open access selection",
            "description": f"Load-testing set — {len(objects)} CC0 artworks, all with pictures.",
            "langue": "en",
            "nb_objets": len(objects),
        },
        "champs": [
            {"code": code, "libelle": label, "type": "texte", **({"facette": True} if facet else {})}
            for code, label, facet in SCHEMA
        ],
        "objets": "objets.ndjson",
    }
    (OUTPUT / "collection.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    with (OUTPUT / "objets.ndjson").open("w", encoding="utf-8") as stream:
        for obj in objects:
            stream.write(json.dumps(obj, ensure_ascii=False) + "\n")

    header, rows = table_rows(objects)
    with (OUTPUT / "objets.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(header)
        writer.writerows(rows)

    write_xlsx(OUTPUT / "objets.xlsx", header, rows)

    print(f"{len(objects)} objects written to {OUTPUT}")


if __name__ == "__main__":
    main()
