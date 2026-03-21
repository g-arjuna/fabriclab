# FabricLab Module Format

Use this format for authored chapter content in the app.

## Goals

- Keep modules simple and readable
- Build mental model first
- Move from hardware to behavior
- Bridge directly into the lab

## File Location

Store final module files in:

- `content/modules/<slug>/module.md`

## Markdown Structure

```md
# Module Title

## Learning Objective
One short paragraph describing what the learner should understand before starting the lab.

## Section Title
@visual Placeholder Label
- Concept point 1
- Concept point 2
- Concept point 3

## Section Title
@visual Placeholder Label
- Concept point 1
- Concept point 2

## Bridge
Short paragraph connecting the content to the lab.

## Lab
lab-id
Lab Title
```

## Rules

- Use at most 3 to 4 content sections
- Keep concept bullets short and direct
- Use one visual placeholder per section
- Learning Objective should be concise
- Bridge should explain why the lab matters
- Lab section must contain:
  - first line: lab id
  - second line: lab title

## Authoring Flow

1. Put rough notes into `content/input`
2. Convert into `content/modules/<slug>/module.md`
3. Render in the app
4. Iterate chapter by chapter
