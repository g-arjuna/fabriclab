#!/usr/bin/env python3
"""Build browser-consumable authored foundations content and its maintained source mapping."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
FILES = [
    ("moving-data", "01-host-architecture.md"),
    ("moving-data", "02-tcp-from-application-to-wire.md"),
    ("why-rdma", "03-dma-rdma-soft-roce.md"),
    ("memory", "04-rdma-resources-and-keys.md"),
    ("queues", "04-rdma-resources-and-keys.md"),
]

def block(body, name):
    match = re.search(r"^### " + re.escape(name) + r"\n\n(.*?)(?=^### |\Z)", body, re.M | re.S)
    return match.group(1).strip() if match else ""

def build():
    sections = []
    for lesson, filename in FILES:
        text = (ROOT / filename).read_text()
        for match in re.finditer(r"^## (\d+\.\d+) (.+?)\n(.*?)(?=^## \d+\.\d+ |\Z)", text, re.M | re.S):
            section_id, title, body = match.groups()
            subsection = int(section_id.split(".")[1])
            if lesson == "memory" and subsection >= 10:
                continue
            if lesson == "queues" and subsection < 10:
                continue
            sections.append({
                "id": section_id,
                "lesson": lesson,
                "title": title.strip(),
                "learnerCopy": block(body, "Learner copy"),
                "visualSpec": block(body, "Visual and interaction"),
                "revealCopy": block(body, "Reveal/feedback"),
                "inspectCopy": block(body, "Inspect"),
                "sourceFile": filename,
                "componentId": f"foundation-{section_id.replace('.', '-')}",
            })
    return sections

def main():
    sections = build()
    output = REPO / "apps" / "web" / "lib" / "practical" / "foundationsContent.generated.json"
    output.write_text(json.dumps(sections, indent=2, ensure_ascii=False) + "\n")
    mapping = [{key: section[key] for key in ["id", "lesson", "title", "sourceFile", "componentId"]} for section in sections]
    (ROOT / "section-map.json").write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n")
    public_map = REPO / "apps" / "web" / "public" / "practical" / "rdma" / "foundations-section-map.json"
    public_map.parent.mkdir(parents=True, exist_ok=True)
    public_map.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n")
    print(f"built {len(sections)} authored foundation sections")

if __name__ == "__main__":
    main()
