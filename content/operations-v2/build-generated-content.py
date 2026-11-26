#!/usr/bin/env python3
"""Build browser-consumable authored Operations V2 content and its maintained source mapping."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
FILES = [
    ("send-receive", "05-send-receive.md"),
    ("write", "06-rdma-write.md"),
    ("read", "07-rdma-read.md"),
    ("packets", "08-packets-and-ai-fabrics.md"),
]

def block(body, name):
    match = re.search(r"^### " + re.escape(name) + r"\n\n(.*?)(?=^### |\Z)", body, re.M | re.S)
    return match.group(1).strip() if match else ""

def load_references():
    text = (ROOT / "10-research-notes.md").read_text()
    references = {}
    for match in re.finditer(r"^\*\*(R\d+) — (.+?)\*\*  \n(.*?)(?=^\*\*R\d+ — |^## |\Z)", text, re.M | re.S):
        ref_id, title, body = match.groups()
        urls = re.findall(r"https?://\S+", body)
        references[ref_id] = {
            "id": ref_id,
            "title": title.strip(),
            "url": urls[0].rstrip(".,;") if urls else "",
        }
    return references

def cited_reference_ids(text):
    cited = []
    for token in re.findall(r"R\d+(?:–R\d+)?", text):
        if "–" in token:
            start, end = [int(part[1:]) for part in token.split("–")]
            cited.extend(f"R{number}" for number in range(start, end + 1))
        else:
            cited.append(token)
    return list(dict.fromkeys(cited))

def build():
    references = load_references()
    sections = []
    for lesson, filename in FILES:
        text = (ROOT / filename).read_text()
        for match in re.finditer(r"^## (\d+\.\d+) (.+?)\n(.*?)(?=^## \d+\.\d+ |\Z)", text, re.M | re.S):
            section_id, title, body = match.groups()
            sections.append({
                "id": section_id,
                "lesson": lesson,
                "title": title.strip(),
                "learnerCopy": block(body, "Learner copy"),
                "visualSpec": block(body, "Visual and interaction"),
                "revealCopy": block(body, "Reveal/feedback"),
                "inspectCopy": block(body, "Inspect"),
                "sourceFile": filename,
                "componentId": f"operations-v2-{section_id.replace('.', '-')}",
                "references": [references[ref] for ref in cited_reference_ids("\n".join([block(body, "Learner copy"), block(body, "Reveal/feedback"), block(body, "Inspect")])) if ref in references],
            })
    return sections

def validate(sections):
    manifest = json.loads((ROOT / "section-manifest.json").read_text())
    expected = manifest["sections"]
    if len(sections) != manifest["sectionCount"] or len(sections) != len(expected):
        raise SystemExit(f"section count mismatch: built {len(sections)}, manifest {len(expected)}")
    for actual, wanted in zip(sections, expected):
        for key in ["id", "lesson", "title", "componentId"]:
            if actual[key] != wanted[key]:
                raise SystemExit(f"{key} mismatch for {actual['id']}: {actual[key]!r} != {wanted[key]!r}")
        if actual["sourceFile"] != wanted["source"]:
            raise SystemExit(f"source mismatch for {actual['id']}: {actual['sourceFile']!r} != {wanted['source']!r}")
        if not actual["learnerCopy"]:
            raise SystemExit(f"missing learner copy for {actual['id']}")
        if not actual["visualSpec"]:
            raise SystemExit(f"missing visual specification for {actual['id']}")

def main():
    sections = build()
    validate(sections)
    output = REPO / "apps" / "web" / "lib" / "practical" / "operationsContent.generated.json"
    output.write_text(json.dumps(sections, indent=2, ensure_ascii=False) + "\n")
    mapping = [{key: section[key] for key in ["id", "lesson", "title", "sourceFile", "componentId"]} for section in sections]
    (ROOT / "section-map.json").write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n")
    public_map = REPO / "apps" / "web" / "public" / "practical" / "rdma" / "operations-section-map.json"
    public_map.parent.mkdir(parents=True, exist_ok=True)
    public_map.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n")
    print(f"built {len(sections)} authored operations sections")

if __name__ == "__main__":
    main()
