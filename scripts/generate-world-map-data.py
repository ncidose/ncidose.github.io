#!/usr/bin/env python3
"""Update the public world-map aggregate from the latest STA workbook.

The August 6, 2026 public map is the fixed baseline. Every agreement number that
appears after that baseline is counted once, regardless of whether it appears
under Pending, Executed, Withdrawn, or Closed. No names, institutions, email
addresses, or agreement numbers are written to the generated frontend file.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "scripts" / "world-map-baseline.json"
OUTPUT_PATH = ROOT / "src" / "data" / "worldMap.ts"
DEFAULT_RELEASE_DIR = Path.home() / "ncidose_frontend" / "_release"

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


COUNTRY_META = {
    "ARE": "United Arab Emirates", "ARG": "Argentina", "AUS": "Australia",
    "AUT": "Austria", "BEL": "Belgium", "BGR": "Bulgaria", "BLR": "Belarus",
    "BRA": "Brazil", "CAN": "Canada", "CHE": "Switzerland", "CHL": "Chile",
    "CHN": "China", "COL": "Colombia", "CYP": "Cyprus", "CZE": "Czechia",
    "DEU": "Germany", "DNK": "Denmark", "ESP": "Spain", "ETH": "Ethiopia",
    "FIN": "Finland", "FRA": "France", "GBR": "United Kingdom", "GHA": "Ghana",
    "GRC": "Greece", "HUN": "Hungary", "IDN": "Indonesia", "IND": "India",
    "IRL": "Ireland", "IRN": "Iran", "IRQ": "Iraq", "ISL": "Iceland",
    "ISR": "Israel", "ITA": "Italy", "JPN": "Japan", "KAZ": "Kazakhstan",
    "KOR": "South Korea", "KWT": "Kuwait", "LUX": "Luxembourg", "MAR": "Morocco",
    "MLT": "Malta", "MYS": "Malaysia", "NGA": "Nigeria", "NLD": "Netherlands",
    "NOR": "Norway", "NZL": "New Zealand", "OMN": "Oman", "PHL": "Philippines",
    "PAK": "Pakistan", "POL": "Poland", "PRT": "Portugal", "PSE": "Palestine", "QAT": "Qatar",
    "ROU": "Romania", "SAU": "Saudi Arabia", "SEN": "Senegal", "SGP": "Singapore",
    "SWE": "Sweden", "THA": "Thailand", "TUR": "Turkey", "TWN": "Taiwan",
    "UKR": "Ukraine", "USA": "United States", "ZAF": "South Africa",
}

DOMAIN_SUFFIXES = {
    ".ac.kr": "KOR", ".edu.au": "AUS", ".ac.uk": "GBR", ".co.uk": "GBR",
    ".org.uk": "GBR", ".gov.uk": "GBR", ".com.au": "AUS", ".ac.nz": "NZL",
    ".ae": "ARE", ".ar": "ARG", ".at": "AUT", ".au": "AUS", ".be": "BEL",
    ".bg": "BGR", ".br": "BRA", ".ca": "CAN", ".ch": "CHE", ".cl": "CHL",
    ".cn": "CHN", ".co": "COL", ".cy": "CYP", ".cz": "CZE", ".de": "DEU",
    ".dk": "DNK", ".es": "ESP", ".et": "ETH", ".fi": "FIN", ".fr": "FRA",
    ".gh": "GHA", ".gr": "GRC", ".hk": "CHN", ".hu": "HUN", ".id": "IDN",
    ".ie": "IRL", ".il": "ISR", ".in": "IND", ".iq": "IRQ", ".ir": "IRN",
    ".is": "ISL", ".it": "ITA", ".jp": "JPN", ".kz": "KAZ", ".kr": "KOR",
    ".kw": "KWT", ".lu": "LUX", ".ma": "MAR", ".mt": "MLT", ".my": "MYS",
    ".ng": "NGA", ".nl": "NLD", ".no": "NOR", ".nz": "NZL", ".om": "OMN",
    ".ph": "PHL", ".pk": "PAK", ".pl": "POL", ".ps": "PSE", ".pt": "PRT",
    ".qa": "QAT", ".ro": "ROU", ".sa": "SAU", ".se": "SWE", ".sg": "SGP",
    ".th": "THA", ".tr": "TUR", ".tw": "TWN", ".ua": "UKR", ".uk": "GBR",
    ".za": "ZAF", ".edu": "USA", ".gov": "USA", ".mil": "USA",
}

KEYWORD_COUNTRIES = [
    ("columbia university", "USA"), ("korea university", "KOR"),
    ("united states", "USA"), ("united kingdom", "GBR"),
    ("south korea", "KOR"), ("republic of korea", "KOR"),
    ("united arab emirates", "ARE"),
]


def column_name(cell_reference: str) -> str:
    match = re.match(r"[A-Z]+", cell_reference)
    return match.group(0) if match else ""


def read_workbook(path: Path) -> dict[str, list[dict[str, str]]]:
    with ZipFile(path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
                for item in shared_root.findall(f"{{{MAIN_NS}}}si")
            ]

        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        result: dict[str, list[dict[str, str]]] = {}

        sheets = workbook.find(f"{{{MAIN_NS}}}sheets")
        if sheets is None:
            return result

        for sheet in sheets:
            relationship_id = sheet.attrib[f"{{{REL_NS}}}id"]
            target = targets[relationship_id].lstrip("/")
            if not target.startswith("xl/"):
                target = f"xl/{target}"
            sheet_root = ET.fromstring(archive.read(target))
            rows: list[dict[str, str]] = []
            for row in sheet_root.findall(f".//{{{MAIN_NS}}}sheetData/{{{MAIN_NS}}}row"):
                values: dict[str, str] = {}
                for cell in row.findall(f"{{{MAIN_NS}}}c"):
                    cell_type = cell.attrib.get("t")
                    value_node = cell.find(f"{{{MAIN_NS}}}v")
                    if cell_type == "inlineStr":
                        value = "".join(
                            node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t")
                        )
                    elif value_node is None:
                        value = ""
                    elif cell_type == "s":
                        value = shared_strings[int(value_node.text or "0")]
                    else:
                        value = value_node.text or ""
                    values[column_name(cell.attrib.get("r", ""))] = " ".join(value.split())
                if any(values.values()):
                    rows.append(values)
            result[sheet.attrib["name"]] = rows
        return result


def agreement_records(workbook: dict[str, list[dict[str, str]]]) -> dict[str, dict[str, str]]:
    records: dict[str, dict[str, str]] = {}
    for sheet_name, rows in workbook.items():
        lowered = sheet_name.lower()
        if not any(token in lowered for token in ("pending", "executed", "withdrawn", "closed")):
            continue
        for row in rows:
            agreement_id = row.get("A", "").strip()
            if not re.match(r"^(?:T-|NCI|CASE-)", agreement_id, flags=re.IGNORECASE):
                continue
            current = records.setdefault(agreement_id.upper(), {})
            for key, value in row.items():
                if value and not current.get(key):
                    current[key] = value
    return records


def infer_country(record: dict[str, str]) -> str:
    text = " ".join(record.values()).lower()
    for keyword, iso_a3 in KEYWORD_COUNTRIES:
        if keyword in text:
            return iso_a3

    for iso_a3, country_name in COUNTRY_META.items():
        if country_name.lower() in text:
            return iso_a3

    domains = re.findall(r"@([a-z0-9.-]+)", text)
    for domain in domains:
        for suffix, iso_a3 in sorted(DOMAIN_SUFFIXES.items(), key=lambda item: -len(item[0])):
            if domain.endswith(suffix):
                return iso_a3

    # The map is intentionally approximate. Per project policy, records without
    # enough location information are assigned to the United States.
    return "USA"


def workbook_date_label(path: Path, workbook: dict[str, list[dict[str, str]]]) -> str:
    for rows in workbook.values():
        if not rows:
            continue
        title = rows[0].get("A", "")
        match = re.search(
            r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}",
            title,
        )
        if match:
            return match.group(0)
    match = re.search(r"(\d{1,2})-(\d{1,2})-(\d{4})", path.name)
    if match:
        month, day, year = (int(value) for value in match.groups())
        month_names = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ]
        return f"{month_names[month - 1]} {day}, {year}"
    return path.stem


def latest_workbook(release_dir: Path) -> Path:
    candidates = list(release_dir.glob("STA Status Spreadsheet*.xlsx"))
    if not candidates:
        candidates = list(release_dir.glob("*STA*.xlsx"))
    if not candidates:
        raise FileNotFoundError(f"No STA spreadsheet found in {release_dir}")
    return max(candidates, key=lambda path: path.stat().st_mtime)


def agreement_hash(agreement_id: str) -> str:
    return hashlib.sha256(agreement_id.strip().upper().encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, help="Current STA workbook")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    source = args.source or latest_workbook(
        Path(os.environ.get("NCIDOSE_RELEASE_DIR", DEFAULT_RELEASE_DIR))
    )
    baseline_hash_path = ROOT / baseline["agreementHashFile"]
    baseline_hashes = set(json.loads(baseline_hash_path.read_text(encoding="utf-8")))
    current_workbook = read_workbook(source)
    current_records = agreement_records(current_workbook)
    added_ids = sorted(
        agreement_id
        for agreement_id in current_records
        if agreement_hash(agreement_id) not in baseline_hashes
    )

    additions = Counter(infer_country(current_records[agreement_id]) for agreement_id in added_ids)
    locations = {item["isoA3"]: dict(item) for item in baseline["locations"]}
    for iso_a3, count in additions.items():
        if iso_a3 not in locations:
            locations[iso_a3] = {
                "name": COUNTRY_META.get(iso_a3, "United States"),
                "isoA3": iso_a3 if iso_a3 in COUNTRY_META else "USA",
                "users": 0,
            }
        locations[iso_a3]["users"] += count

    ordered_locations = sorted(
        locations.values(), key=lambda item: (-item["users"], item["name"])
    )
    payload = {
        "updatedAt": workbook_date_label(source, current_workbook),
        "baselineAsOf": baseline["asOf"],
        "sourceWorkbook": source.name,
        "addedSinceBaseline": len(added_ids),
        "locations": ordered_locations,
    }
    generated = (
        "// Generated by scripts/generate-world-map-data.py. Do not edit manually.\n"
        "export const worldMapData = "
        + json.dumps(payload, indent=2, ensure_ascii=False)
        + " as const;\n"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(generated, encoding="utf-8")

    print(f"Source: {source}")
    print(f"Baseline agreements: {len(baseline_hashes)}")
    print(f"Current agreements: {len(current_records)}")
    print(f"Added since baseline: {len(added_ids)}")
    for iso_a3, count in sorted(additions.items()):
        print(f"  {COUNTRY_META.get(iso_a3, iso_a3)}: +{count}")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
