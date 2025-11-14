# AGENTS.md

> Project-wide contract for using AI / agents on this repo.
>
> This file follows the conventions from https://agents.md/ and is for
> both humans and LLM-based agents.

---

## 1. Project Overview

This repo is a small React + Next.js + TypeScript app that implements a spreadsheet-like UI using Chakra UI. The current exercise is to enhance the spreadsheet with:

- Row and column labels (headers)
- Currency formatting for numeric values
- Single-cell selection with keyboard navigation

The primary UX goal is to feel familiar to users of Google Sheets or Excel, while keeping the implementation simple and maintainable.

Key technologies:

- Next.js 14 (`pages` router)
- React 18
- TypeScript 5
- Chakra UI
- Lodash
- Sass for global styling

You can run the app locally with:

```bash
yarn install
yarn dev
```

---

## 2. Source of Truth for Requirements

For spreadsheet enhancements, agents should treat the following docs as the canonical product and technical specs:

- `docs/spreadsheet-enhancement-prd.md` - product requirements and UX expectations
- `docs/spreadsheet-enhancement-techspec.md` - detailed implementation guidance (state model, props contracts, utilities, etc.)

When in doubt:

1. Prefer the PRD for user-facing behavior.
2. Prefer the Tech Spec for architectural and API details.
3. If they conflict, call this out in your summary and align with the PRD unless the user says otherwise.

---

## 3. Code Layout

Important paths for agents:

- `pages/index.tsx` - Next.js entry page that renders the app
- `src/components/App.tsx` - top-level app shell and layout
- `src/components/Spreadsheet.tsx` - owns spreadsheet state and behavior
- `src/components/Cell.tsx` - presentational cell component (selection, editing, display)
- `src/components/RowLabel.tsx` - row header labels
- `src/components/ColumnLabel.tsx` - column header labels
- `src/utils/spreadsheet.ts` - pure utilities for column labels and currency logic

Keep these boundaries in mind:

- `Spreadsheet` owns canonical grid, selection, and editing state.
- `Cell` is presentational and should not own source-of-truth state.
- Utilities in `src/utils/spreadsheet.ts` must be **pure** and framework-agnostic.

---

## 4. Agent Responsibilities and Limits

When acting on this repo, agents should:

- **Respect component boundaries** - keep stateful logic in `Spreadsheet`, keep `Cell` lean.
- **Avoid unnecessary refactors** - prefer minimal, targeted changes that meet the specs.
- **Preserve behavior** - do not change existing UX unless the PRD/Tech Spec or user explicitly asks.
- **Avoid adding external dependencies** unless justified and approved by the user.
- **Do not add tests** unless the user explicitly requests them.
- **Do not change licensing/copyright headers**.

Changes that are **out of scope** unless explicitly requested:

- Switching frameworks (e.g., from Next.js to another stack)
- Large-scale styling overhauls unrelated to the spreadsheet features
- Introducing server-side persistence or multi-user collaboration

---

## 5. Implementation Guidelines for Spreadsheet Features

Agents implementing or extending spreadsheet behavior should follow the patterns in `docs/spreadsheet-enhancement-techspec.md`. Key points:

### 5.1 State Model

- `Spreadsheet` maintains:
  - `spreadsheetState: string[][]` - 2D array of **raw** string values
  - `selectedCell: { row: number; col: number }` - single selected cell
  - `editingCell: { row: number; col: number } | null` - the cell in edit mode
  - Any flags necessary to avoid double-commit race conditions
- `Cell` receives all its state via props (`value`, `editValue`, `isSelected`, `isEditing`, handlers) and forwards user events upward.

### 5.2 Utilities

Create and maintain the following in `src/utils/spreadsheet.ts` as pure functions:

- `getColumnLabel(index: number): string` - 0-based index → `A`, `B`, …, `Z`, `AA`, …
- `isNumeric(value: string): boolean` - trims whitespace, rejects empty and mixed strings, uses `Number` + `isFinite` semantics.
- `formatCurrency(value: string): string` - uses `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, returns unformatted input for non-numeric/empty values.

These functions must not depend on React, Chakra, or browser-specific APIs.

### 5.3 Headers and Layout

- Use `RowLabel` and `ColumnLabel` components for row/column headers.
- Render a static corner cell at the intersection (top-left) with non-editable styling.
- Align header cells with data cells using Chakra layout primitives (e.g., `Flex`) and explicit widths.
- Selected row/column headers should show a blue, semi-transparent overlay matching the selected cell's border color.

### 5.4 Selection, Editing, and Keyboard Navigation

- Selection is single-cell.
- A1 (`row: 0`, `col: 0`) selected on initial load.
- Navigation keys (arrows, Tab/Shift+Tab, Enter/Shift+Enter) move selection within bounds and **commit** any in-progress edits before moving.
- Escape cancels the current edit, reverts to the original value, and keeps the selection in place.
- When **not editing**, the grid-level key handler controls navigation.
- When **editing**, the input handles normal text keys; navigation keys still route to the parent for commit + movement.

---

## 6. How Agents Should Work in This Repo

When performing non-trivial work, agents should:

1. Skim the PRD and Tech Spec to confirm expected behavior.
2. Inspect the relevant component(s) and utilities before editing.
3. Propose or internally track a short plan (2-5 steps) before making code changes.
4. Make minimal, focused edits using `apply_patch` (or a similar tool) to avoid noisy diffs.
5. Run `yarn lint` or `yarn build` / `yarn dev`-equivalent checks when possible and report any failures back to the user.
6. Summarize changes at a high level (per file) in natural language.

If user instructions conflict with this file, **user instructions win**, but agents should mention the conflict in their summary so humans can revisit the contract if needed.

---

## 7. Security, Privacy, and Data

- Treat all code in this repo as private.
- Do not introduce telemetry, analytics, or outbound network calls from the client code without explicit approval.
- Do not hard-code secrets, tokens, or private URLs.

---

## 8. How to Extend This Document

Humans and agents may extend `AGENTS.md` when the project evolves. When updating:

- Keep sections short and scannable.
- Prefer clear rules and examples over vague guidance.
- Note any major policy changes (e.g., "tests now required", "persistence added").

Changes to this file are contract updates and should ideally be mentioned in PR descriptions so future agents and contributors see them.
