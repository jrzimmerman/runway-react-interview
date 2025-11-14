# Spreadsheet Functions and Burn Rate Technical Specification

> Based on `docs/spreadsheet-enhancement-prd.md` (future enhancements section)

## 1. Scope and Objectives

This document describes how to extend the existing spreadsheet with:

- Common spreadsheet functions (e.g., `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`).
- Basic formula parsing using cell references (e.g., `=A1+B2`, `=SUM(A1:A10)`).
- The `=BURNRATE()` easter egg with an animated visual effect.

The goal is to give enough detail that an LLM (or engineer) can implement these features end-to-end **without needing to read the PRD**, building on the current spreadsheet implementation and the existing `docs/spreadsheet-enhancement-techspec.md`.

Out of scope in this phase:

- Full Excel/Sheets-compatible formula engine.
- Multi-cell selection and range editing UX (beyond what is required to support simple ranges in formulas).
- Undo/redo, copy/paste for ranges, or CSV export.

Assumptions:

- The current grid remains 10×10 cells.
- All values in `spreadsheetState` remain **raw strings**.
- Currency formatting behavior defined in the existing tech spec remains unchanged.
- New functionality must integrate cleanly with existing selection, editing, and navigation logic.

## 2. High-Level Architecture Changes

### 2.1 New/Updated Modules

- `src/utils/spreadsheet.ts`
  - Extend with **pure utilities** for formulas:
    - `parseCellAddress(label: string): { row: number; col: number } | null`.
    - `getCellLabel(row: number, col: number): string` (inverse of `parseCellAddress`).
    - `parseRange(range: string): Array<{ row: number; col: number }>`.
    - `evaluateFormula(formula: string, grid: string[][]): string`.
    - `evaluateFunction(name: string, args: string[], grid: string[][]): string`.
    - `stripCurrencyFormatting(value: string): string` (to normalize pasted formatted currency and any formatted outputs when re-used in formulas).
  - All utilities remain framework-agnostic and side-effect free.

- `src/components/Spreadsheet.tsx`
  - Extend evaluation logic so that the **displayed value** for each cell can differ from the raw value when that raw value is a formula.
  - Maintain additional transient state to drive the burn rate animation (e.g., which cells are currently "burning").
  - Provide a way for `Cell` components to access their **computed display value** (either via props or a selector function) without changing the underlying storage model.

- `src/components/Cell.tsx`
  - Update to accept both the raw value and a **pre-computed display value**:
    - `value` (raw, stored string).
    - `displayValue` (already formatted/computed by `Spreadsheet`).
  - Keep the existing edit behavior: when editing, always show the raw value; when not editing, show the `displayValue`.
  - Do not contain formula parsing logic; that belongs in utilities and `Spreadsheet`.

- Optional new module for animation helpers (if it simplifies `Spreadsheet`):
  - `src/utils/burnRate.ts` (pure calculation of which cells should be animated over time, not React/DOM specific).

### 2.2 Data Flow Overview

- `Spreadsheet` continues to own `spreadsheetState` and the editing/selection state described in the existing tech spec.
- For each render, `Spreadsheet` derives a **computed grid**:
  - `computedGrid: string[][]` where each entry is the display value for that cell, based on:
    - If raw value starts with `=` and matches `=BURNRATE()`, then a special marker is used to trigger the easter egg.
    - If raw value starts with `=` and is not `=BURNRATE()`, it is treated as a formula and evaluated via `evaluateFormula`.
    - Otherwise, the raw value is passed to currency formatting logic.
- `Cell` receives the **raw** `value` and the **computed** `displayValue`.
- The burn rate animation state lives in `Spreadsheet` and influences how cells are styled (e.g., fire colors, flame emoji overlay).

## 3. Formula Semantics and Supported Features

### 3.1 Formula Detection

- A cell is considered a formula cell if its raw value:
  - Is a non-empty string.
  - Starts with the `=` character.
- For non-formula cells, existing numeric detection and currency formatting rules apply unchanged.

### 3.2 Supported Syntax

- **Simple arithmetic expressions** using:
  - Binary operators: `+`, `-`, `*`, `/`.
  - Parentheses for grouping.
  - Operands can be:
    - Numeric literals (e.g., `1`, `-2.5`, `0.01`).
    - Cell references (e.g., `A1`, `B3`).
    - Function calls (e.g., `SUM(A1:A3)`).

- **Cell references**:
  - Format: `^[A-Z]+[1-9][0-9]*$`.
  - Column part: one or more uppercase letters, mapping to 0-based column index via `getColumnLabel` inverse.
  - Row part: 1-based integer, mapping to 0-based row index.

- **Ranges**:
  - Format: `<startRef>:<endRef>` (e.g., `A1:A10`, `A1:C3`).
  - Both ends must be valid cell references.
  - The range covers all cells in the rectangle defined by the two references (inclusive, row-first iteration).

- **Functions** (case-insensitive names, but stored normalized):
  - `SUM(range or list of args)`
  - `AVG(range or list of args)`
  - `MIN(range or list of args)`
  - `MAX(range or list of args)`
  - `COUNT(range or list of args)`

  Function arguments can be:

  - Single cell references.
  - Ranges.
  - Numeric literals.

- **Easter egg function**:
  - `=BURNRATE()` — no arguments.
  - Any additional characters or arguments should cause this to be treated as a normal (unsupported) formula and **not** trigger the animation.

### 3.3 Evaluation Rules

- **Order of operations**:
  - Parentheses, then `*` and `/`, then `+` and `-`.
  - Left-to-right within the same precedence.
  - Functions are evaluated first on their argument list, which may include ranges or expressions.

- **Cell reference resolution**:
  - When evaluating a reference, use the **raw value** of the referenced cell.
  - If the referenced cell contains a formula, evaluate it recursively.
  - Prevent infinite loops by tracking a set of currently-evaluating cells; if a cycle is detected, return an error marker string like `"#CYCLE"` for the offending cell.

- **Numeric conversion**:
  - Before using a cell value as a number:
    - Strip any currency formatting or thousands separators via `stripCurrencyFormatting`.
    - Use `isNumeric` to determine if it can be treated as a number.
    - If non-numeric, treat as `0` for aggregation functions but count as non-numeric for `COUNT` (see below).

- **Function behavior**:
  - `SUM`: sum of all numeric argument values (non-numeric treated as `0`).
  - `AVG`: arithmetic mean of numeric arguments; non-numeric are ignored for the divisor and treated as `0` in the sum. If no numeric arguments, return `"0"`.
  - `MIN` / `MAX`: minimum/maximum among numeric arguments; if no numeric arguments, return `"0"`.
  - `COUNT`: number of **non-empty cells** among arguments, regardless of numeric/non-numeric but excluding pure empty strings.

- **Error handling**:
  - Parsing errors, invalid references, or invalid function usage should result in a display string prefixed with `"#ERROR"` (e.g., `"#ERROR"`, `"#ERROR:REF"`).
  - Errors from referenced cells propagate as literal strings (e.g., referencing a cell that displays `"#CYCLE"` yields `"#CYCLE"`).

- **Final representation**:
  - Internally, evaluation functions return raw numeric strings or error strings.
  - When rendering in `Cell`, numeric results are passed through currency formatting logic if the cell is **not** a `BURNRATE` cell.

## 4. Utility Functions in `src/utils/spreadsheet.ts`

### 4.1 `stripCurrencyFormatting(value: string): string`

Purpose:

- Normalize values that may already contain currency symbols or thousands separators (e.g., pasted `$1,234.50`).

Behavior:

- Trim whitespace.
- Remove leading `$` and commas.
- Preserve minus sign and decimal point.
- Return the cleaned string; do not attempt to evaluate or format.

Usage:

- Before numeric checks in formula evaluation.
- When handling paste events for cells to ensure stored values remain raw.

### 4.2 `parseCellAddress(label: string)` and `getCellLabel(row, col)`

Purpose:

- Convert between labels like `"A1"` and 0-based indices.

Behavior:

- `parseCellAddress`:
  - Split the label into column letters and row digits.
  - Convert column letters to index using the inverse of `getColumnLabel` logic.
  - Convert row digits to 0-based index.
  - Return `null` if the label is invalid or out of grid bounds.

- `getCellLabel`:
  - Compute `getColumnLabel(col)` + `(row + 1)`.
  - Used mainly for debugging and potential future features; not strictly required for this phase but helps maintain symmetry.

### 4.3 `parseRange(range: string)`

Purpose:

- Interpret ranges like `"A1:C3"`.

Behavior:

- Split on `":"` into `start` and `end` labels.
- Use `parseCellAddress` for both.
- If either is invalid, return an empty list (caller will treat as no arguments).
- Determine min/max for row and col separately and generate all coordinates inclusive.

### 4.4 `evaluateFunction(name: string, args: string[], grid: string[][])`

Purpose:

- Evaluate supported functions on their arguments.

Behavior:

- Normalize `name` to uppercase.
- For each argument string:
  - If it contains `":"`, treat as a range and expand via `parseRange`.
  - Else if it matches a cell reference pattern, resolve that single cell.
  - Else treat as a literal numeric or string value.
- Collect numeric values using `stripCurrencyFormatting` + `isNumeric`.
- Apply function-specific rules specified in section 3.3.
- Return a numeric string result or an error string.

### 4.5 `evaluateFormula(formula: string, grid: string[][])`

Purpose:

- Evaluate expressions starting with `=` that are not `=BURNRATE()`.

Behavior:

- Strip the leading `=` and surrounding whitespace.
- First, check if the expression is a pure function call like `NAME(...)`:
  - If yes, parse the function name and argument list.
  - Delegate to `evaluateFunction`.
- Otherwise, treat as an arithmetic expression that may contain:
  - Literals, cell references, function calls, parentheses, operators.
- Implement a **minimal expression parser** (e.g., shunting-yard or recursive descent) that:
  - Tokenizes numbers, operators, parentheses, identifiers, ranges, commas.
  - Resolves cell references via `parseCellAddress` and reuses `evaluateFormula` recursively for referenced formulas.
- Maintain a visited set of coordinates for cycle detection; pass it through recursive calls.
- Return a raw numeric or error string.

Implementation constraints:

- Do not depend on `eval` or the global `Function` constructor.
- Keep the parser small and focused on the supported syntax.

## 5. Spreadsheet Integration

### 5.1 Extending `Spreadsheet` State

- Add optional state for the burn rate animation:
  - `burnRateActive: boolean` — whether an animation is currently running.
  - `burnRateOrigin: { row: number; col: number } | null` — the cell where `=BURNRATE()` was entered.
  - `burnRateWave: number` — an integer step representing the current "radius" or progression of the animation.
- Optionally, maintain a derived set of animated cells for the current frame:
  - `burningCells: Set<string>` where keys are `"row-col"` identifiers.

### 5.2 Computing Display Values

- For each render, `Spreadsheet` should derive a computed value for every cell:
  - Iterate over `spreadsheetState[row][col]`.
  - For each raw value:
    - If the value equals `"=BURNRATE()"` (case-insensitive, trimmed):
      - Mark `burnRateOrigin` (if not already set) and set `burnRateActive` to true.
      - The computed value for this cell can be an empty string or a small label like `""` (display will be dominated by the animation visuals).
    - Else if the value begins with `"="`:
      - Call `evaluateFormula` to get a result string.
    - Else:
      - Use the raw value.
  - After obtaining this intermediate computed string:
    - If it is an error string (starts with `"#"`), use it directly as `displayValue` with **no currency formatting**.
    - Else, pass it through the existing currency formatting logic to produce the final `displayValue`.

- Pass `displayValue` into `Cell` as a new prop, alongside the raw `value`.

### 5.3 Burn Rate Animation Logic

- When `burnRateActive` is true:
  - Use a timed effect (e.g., interval or animation frame) to increment `burnRateWave` on a regular cadence (e.g., every 200–300 ms).
  - In each step, determine which cells are part of the current wave:
    - Start at `burnRateOrigin`.
    - Spread diagonally down and to the right forming a chart-like pattern.
    - Example rule: a cell `(r, c)` is burning at wave `k` if:
      - `r >= origin.row` and `c >= origin.col`, and
      - `(r - origin.row) + (c - origin.col) <= k`.
  - Update `burningCells` accordingly.

- Stopping/dismissing the animation:
  - If the user presses Escape while `burnRateActive` is true, set `burnRateActive` to false and clear `burningCells`.
  - If the user clicks anywhere outside the grid or on a dedicated "dismiss" overlay, also clear the animation.

- Animation lifetime:
  - Allow `burnRateWave` to continue until all cells within the grid that satisfy the spread rule have been visited.
  - Optionally, add a maximum duration (e.g., 5–10 seconds), after which the animation stops automatically.

### 5.4 Visual Representation of Burn Rate

- For any cell whose coordinates are in `burningCells`:
  - Adjust the `Cell` styling via additional props:
    - Background color gradient based on the wave index (e.g., yellow → orange → red).
    - Optional overlay icon (e.g., flame emoji) positioned inside the cell.
  - Ensure the animation overlay does not interfere with editing or selection; users should still be able to select and edit cells normally.

- The `=BURNRATE()` cell itself:
  - Always part of the initial burning set.
  - Can have a stronger visual effect (e.g., brighter color or larger icon).

## 6. Cell Component Changes

### 6.1 New Props

- Extend `CellProps` to include:
  - `displayValue: string` — the value already processed by formula evaluation and currency formatting.
  - `isBurning: boolean` — whether this cell is part of the current burn rate animation.

### 6.2 Display vs Edit Mode

- **Edit mode** (unchanged behavior):
  - When `isEditing` is true, render an input showing `editValue`.
  - The user edits the raw string including any leading `=` or function syntax.

- **Display mode** (updated behavior):
  - Show `displayValue` instead of computing currency format locally.
  - If `isBurning` is true, apply additional visual styles:
    - Background color or overlay to indicate fire.
    - Optional flame icon text appended or layered.
  - For error strings (starting with `"#"`), use default left alignment and avoid currency formatting.

### 6.3 Paste Handling

- When handling paste in edit mode:
  - Normalize the pasted string via `stripCurrencyFormatting` before committing, so that:
    - Pasted `$1,000.00` becomes raw `"1000.00"`.
  - Preserve formulas as-is if they start with `=`.

## 7. Keyboard and Interaction Behavior Extensions

### 7.1 Burn Rate Dismissal

- Update the grid-level `onKeyDown` in `Spreadsheet` to:
  - If `burnRateActive` is true and the user presses Escape:
    - Stop the animation and clear state.
    - Do not affect current cell editing state unless Escape is also meant to cancel an edit (if both conditions apply, prioritise cancelling the edit but also clear the animation).

### 7.2 Formula Editing Flow

- Entering a cell starting with `=` behaves like any other cell:
  - Navigating away commits the raw formula string.
  - When selection returns to the cell and it is not in edit mode, the evaluated display value is shown.
  - Double-clicking or pressing Enter enters edit mode to show and edit the raw formula.

## 8. Acceptance Criteria Mapping

- **Formula support:**
  - Cells starting with `=` evaluate as formulas, including simple arithmetic and supported functions.
  - Cell references and ranges are resolved correctly within the 10×10 grid.
  - Cyclic references are detected and surfaced as error values.

- **Function behavior:**
  - `SUM`, `AVG`, `MIN`, `MAX`, and `COUNT` behave as specified, supporting both ranges and argument lists.
  - Non-numeric values are handled according to rules in section 3.3.

- **Display vs storage:**
  - Raw values (including formulas) are stored unchanged in `spreadsheetState`.
  - Display values for numeric results are currency-formatted using existing utilities.
  - Error values are displayed without currency formatting.

- **Burn rate easter egg:**
  - Typing `=BURNRATE()` into any cell triggers a burn rate animation originating from that cell.
  - The animation visually spreads across the grid in a diagonal/down-right pattern.
  - The animation uses flame-like colors and may include flame icons.
  - Pressing Escape or clicking outside/dedicated dismiss area stops the animation and restores normal appearance.
  - The animation does not break selection, editing, or formula evaluation.

## 9. Implementation Order (Step-by-Step Guide)

1. **Extend utilities in `src/utils/spreadsheet.ts`:**
   - Add `stripCurrencyFormatting`, `parseCellAddress`, `getCellLabel`, `parseRange`, `evaluateFunction`, and `evaluateFormula` as pure helpers.
   - Ensure they do not import React or Chakra.

2. **Integrate formula evaluation into `Spreadsheet`:**
   - In `Spreadsheet`, derive a `computedGrid` based on `spreadsheetState` using the new utilities.
   - Add logic to treat `=BURNRATE()` specially and to apply currency formatting to numeric results.

3. **Update `Cell` props and rendering:**
   - Add `displayValue` and `isBurning` props to `Cell`.
   - Use `displayValue` in display mode and raw `editValue` in edit mode.
   - Adjust styling to support error display and burn rate visuals.

4. **Implement burn rate animation state in `Spreadsheet`:**
   - Add `burnRateActive`, `burnRateOrigin`, `burnRateWave`, and `burningCells` state.
   - Use a timed effect to update `burnRateWave` and recompute `burningCells` based on the origin.
   - Provide `isBurning` to each `Cell` based on `burningCells`.

5. **Hook up keyboard and dismiss interactions:**
   - Extend the existing `onKeyDown` in `Spreadsheet` to stop the burn rate animation on Escape.
   - Optionally add click-outside or overlay-based dismissal.

6. **Verify behavior against acceptance criteria:**
   - Manually test formulas, functions, and numeric formatting.
   - Test `=BURNRATE()` triggering, animation progression, and dismissal.
   - Confirm that navigation, selection, and editing remain consistent with the original tech spec.

## 10. Open Questions and Assumptions

- **Multiple `=BURNRATE()` cells:**
  - Assumption: only the **first** cell containing `=BURNRATE()` in the current grid triggers the animation; additional occurrences are treated as normal formulas or ignored for animation.
- **Error styling:**
  - Assumption: error values (strings starting with `"#"`) are rendered in default text color without extra emphasis; this can be adjusted in a future iteration.
- **Numeric formatting in formulas:**
  - Assumption: all numeric formula results use the same currency formatting as raw numeric cells; there is no separate "plain number" format in this phase.
- **Function set extensibility:**
  - Assumption: future functions can be added by extending `evaluateFunction` without changing the core `evaluateFormula` parser.
