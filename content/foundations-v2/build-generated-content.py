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

def guided_blocks(markdown, section_id):
    """Extract explicitly marked authored blocks without splitting Markdown structures.

    Markers are HTML comments in the canonical source. The scanner tracks fenced
    code so marker-looking text or blank lines inside Python examples are never
    interpreted as content-block boundaries.
    """
    blocks = []
    current_id = None
    current_lines = []
    in_fence = False
    unmarked = []

    def flush():
        nonlocal current_id, current_lines
        content = "".join(current_lines).strip("\n")
        if current_id:
            if not content.strip():
                raise SystemExit(f"{section_id} guided block {current_id} is empty")
            blocks.append({"id": current_id, "markdown": content})
        elif content.strip():
            unmarked.append(content[:80])
        current_lines = []

    for line in markdown.splitlines(keepends=True):
        stripped = line.strip()
        marker = None if in_fence else re.fullmatch(r"<!--\s*guided-block:\s*([A-Za-z0-9._-]+)\s*-->", stripped)
        if marker:
            flush()
            current_id = marker.group(1)
            continue
        current_lines.append(line)
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
    flush()
    if in_fence:
        raise SystemExit(f"{section_id} learner copy has an unterminated fenced code block")
    if unmarked:
        raise SystemExit(f"{section_id} learner copy contains unmarked guided content beginning {unmarked[0]!r}")
    ids = [item["id"] for item in blocks]
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        raise SystemExit(f"{section_id} has duplicate guided block identifiers: {', '.join(duplicates)}")
    if not blocks:
        raise SystemExit(f"{section_id} learner copy has no explicit guided content blocks")
    return blocks

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
                "contentBlocks": guided_blocks(block(body, "Learner copy"), section_id),
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
