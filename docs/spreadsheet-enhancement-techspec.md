# Spreadsheet Enhancement Technical Specification

> Based on `docs/spreadsheet-enhancement-prd.md`

## 1. Scope and Objectives

This document describes how to implement the spreadsheet enhancements described in the PRD, covering:

- Row and column labels (spreadsheet-style headers)
- Currency formatting for numeric values
- Cell selection, edit state management, and keyboard navigation

The goal is to give enough detail that an LLM (or engineer) can implement the feature end-to-end without seeing the PRD.

Unless otherwise noted, the target is the existing React + Chakra UI app in this repo, specifically:

- `pages/index.tsx`
- `src/components/App.tsx`
- `src/components/Spreadsheet.tsx`
- `src/components/Cell.tsx`

Assumptions (confirm or update as needed):

- Spreadsheet size remains **10 rows x 10 columns** for now (`NUM_ROWS`, `NUM_COLUMNS` constants), but the design should not hard-code this into logic that would make future expansion difficult.
- All cell values are stored as **strings** in a 2D array state.
- Chakra UI is the primary UI library and should be used for layout and basic styling.
- No persistence beyond in-memory React state is required.
- No automated tests are strictly required, but the design should be testable.

## 2. High-Level Architecture Changes

### 2.1 New/Updated Modules

- `src/components/Spreadsheet.tsx`

  - Extend to render:
    - Corner cell (top-left, non-editable)
    - Column header row (A, B, C, …)
    - Row header column (1, 2, 3, …)
    - Data cell grid (existing `Cell` component instances)
  - Manage spreadsheet-wide state:
    - `spreadsheetState: string[][]`
    - `selectedCell: { row: number; col: number }`
    - `editingCell: { row: number; col: number } | null` — Tracks which cell is in edit mode.
    - Keyboard navigation and focus management.
    - Commit/cancel operations for cell edits.

- `src/components/Cell.tsx`

  - Extend from a simple controlled input to a richer cell component that understands:
    - Selected vs. non-selected state (visual border).
    - Editing vs. display mode (driven by props from the parent).
    - Displaying either raw or formatted value.
    - Communicating user actions (selection, edit requests, commits) back to the parent.

- `src/components/RowLabel.tsx` (new)

  - Render row number in a styled, non-editable header cell.

- `src/components/ColumnLabel.tsx` (new)

  - Render column letter label in a styled, non-editable header cell.

- `src/utils/spreadsheet.ts` (new)
  - Pure utility functions (no React, no Chakra):
    - `getColumnLabel(index: number): string`
    - `isNumeric(value: string): boolean`
    - `formatCurrency(value: string): string`

### 2.2 Data Flow Overview

- `Spreadsheet` owns all canonical state: `spreadsheetState` (2D string array), `selectedCell`, and `editingCell`.
- Each `Cell` receives its display `value`, selection state (`isSelected`), and editing state (`isEditing`) as props.
- `Cell` is responsible for rendering the correct view (formatted or raw) and forwarding user events (clicks, key presses, paste) to the `Spreadsheet` component via callbacks.
- `Spreadsheet` contains all the logic for state transitions, such as starting an edit, committing a value, or navigating the grid.
- Keyboard events are handled by a single, focusable grid container within `Spreadsheet` to ensure performance and prevent race conditions. When a cell is not in edit mode, this container processes navigation events. When a cell _is_ in edit mode, the `Cell`'s input element handles typing, but navigation-related keys (Enter, Tab, Escape) are still managed by the parent.

## 3. Data Model and State Management

### 3.1 Spreadsheet State

In `Spreadsheet`:

- Keep the existing 2D array state structure, but make its role explicit:

  - `spreadsheetState: string[][]` — contains **raw** cell values (never with currency symbols or formatting characters from display-only logic).
  - Initialize as a 10x10 matrix of empty strings using a pure helper (e.g., using lodash as done today) to keep it readable.

- Selected cell state:

  - `selectedCell: { row: number; col: number }`
  - Initial value: `{ row: 0, col: 0 }` (cell A1).
  - This is the **only** selected cell; selection is single-cell only.

- Editing state:
  - `editingCell: { row: number; col: number } | null` — The coordinates of the cell currently in edit mode. If `null`, no cell is being edited. This is the single source of truth for which cell is active.
  - `editValue: string` — The current value being typed into the active cell's input. This state lives in `Spreadsheet` and is passed down to the editing `Cell`.
  - Parent (`Spreadsheet`) owns all editing state. `Cell` components become more presentational, receiving `isEditing` and `editValue` as props.

### 3.2 Update API Between `Spreadsheet` and `Cell`

`Spreadsheet` should pass to each `Cell`:

- `value: string` — raw value from `spreadsheetState[row][col]`.
- `editValue: string` — The current value for the input if this cell is being edited.
- `rowIndex: number` — row index for that cell.
- `colIndex: number` — column index for that cell.
- `isSelected: boolean` — whether this cell matches `selectedCell`.
- `isEditing: boolean` — whether this cell matches `editingCell`.
- `onSelect: () => void` — called when the cell is clicked to select it.
- `onStartEdit: () => void` — called on double-click or when typing begins on a selected cell.
- `onEdit: (newValue: string) => void` — updates the `editValue` in the parent on every keystroke.
- `onCommit: () => void` — called when editing ends successfully (e.g., on navigation or blur). The parent reads the final `editValue` and updates `spreadsheetState`.
- `onCancel: () => void` — called when editing is cancelled (Escape).
- `onPaste: (pastedValue: string) => void` — called when content is pasted into the cell.

### 3.3 Navigation and Commit Semantics

- Navigation (arrow keys, Tab, Enter) or clicking another cell must **commit** the current cell edit before moving selection.
- To prevent race conditions between `blur` and `keyDown`/`click` events, a state flag (e.g., `isCommitting`) should be used to ensure `onCommit` is only processed once per edit session.
- Escape cancels the edit in the active cell and does **not** move selection.
- All commit operations ensure `spreadsheetState` is updated with the **raw** value from the parent's `editValue` state.

Implementation-wise, this is achieved by centralizing all event handling in `Spreadsheet`. The parent component decides when to commit based on user actions and then updates the selection.

## 4. Utility Functions (`src/utils/spreadsheet.ts`)

### 4.1 `getColumnLabel(index: number): string`

Purpose:

- Convert a zero-based column index (0,1,2,…) into spreadsheet-like labels (A, B, …, Z, AA, AB, …).

Requirements:

- Input: `index >= 0`.
- Output: uppercase string.
- Behavior examples:
  - `0` → `"A"`
  - `25` → `"Z"`
  - `26` → `"AA"`
  - `27` → `"AB"`
  - `51` → `"AZ"`
  - `52` → `"BA"`
  - Continue beyond 676 to support `AAA`, `AAB`, etc.

Design notes:

- Use a loop or recursion to implement a base-26-like conversion with `A` mapped to 1 (not 0).
- Avoid dependencies on browser APIs; keep it pure.

### 4.2 `isNumeric(value: string): boolean`

Purpose:

- Determine if a string should be treated as a numeric value for currency formatting.

Requirements:

- Consider these as numeric:
  - Optional leading/trailing whitespace.
  - Optional leading plus/minus sign.
  - Integer or decimal numbers.
  - Leading zeros should be allowed (e.g., `"007"`).
- Consider these as **non-numeric**:
  - Empty string.
  - Strings with non-numeric characters other than the allowed decimal point and sign (e.g., `"abc"`, `"123abc"`).

Design notes:

- Implement by trimming whitespace, checking if the result is an empty string (which is not numeric), and then using `isFinite(Number(value))`. This robustly handles integers, decimals, and signs while correctly rejecting mixed strings like `"123abc"`.

### 4.3 `formatCurrency(value: string): string`

Purpose:

- Convert a raw numeric string into a formatted USD currency string using `Intl.NumberFormat`.

Requirements:

- Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- Only format when `isNumeric(value)` is true and value is non-empty.
- Examples:
  - `"1000"` → `"$1,000.00"`
  - `"1000000"` → `"$1,000,000.00"`
  - `"-500"` → `"-$500.00"`
  - `"1234.56"` → `"$1,234.56"`
- Negative values should appear with a leading minus sign before the dollar sign.
- Very large and very small values should format correctly per `Intl.NumberFormat` defaults.
- Non-numeric values should be returned **unchanged**.
- Empty string should return an empty string (not `$0.00`).

Design notes:

- Implement by verifying `isNumeric(value)` first, parsing it into a `number`, then formatting.
- Keep this function pure and deterministic.

## 5. Component Design

### 5.1 `ColumnLabel` Component

Location:

- `src/components/ColumnLabel.tsx`

Props:

- `label: string` — column label text (e.g., `"A"`, `"AA"`).
- `isSelected: boolean` — whether this column is the currently selected column.

Responsibilities:

- Render a header cell that:
  - Uses Chakra UI container component (`Box` or equivalent).
  - Has light gray background.
  - Uses bold font-weight and centered text.
  - Matches the width of data cells.
- Visual state when its column contains the selected cell:
  - Apply a blue overlay background (semi-transparent) when `isSelected` is true.
- Non-editable:
  - No input elements, no `onClick` for editing.

### 5.2 `RowLabel` Component

Location:

- `src/components/RowLabel.tsx`

Props:

- `label: number` — row number (1-based, i.e., first row is 1).
- `isSelected: boolean` — whether this row contains the selected cell.

Responsibilities:

- Render a header cell that:
  - Uses Chakra UI container component.
  - Has light gray background.
  - Uses bold font-weight and centered text.
  - Is narrower than data cells (fixed width sufficient for at least 3-digit row numbers).
- Visual state when its row contains the selected cell:
  - Apply the same blue overlay background when `isSelected` is true.
- Non-editable:
  - Purely display; no editable input.

### 5.3 Corner Cell (Top-Left)

Rendered in `Spreadsheet`.

Responsibilities:

- Represent the intersection of row and column headers.
- Display either an empty cell or an optional icon.
- Styling:
  - Same background and border style as header cells.
  - Centered content (even if empty, for consistency).
- Non-editable and non-focusable by default.

### 5.4 `Cell` Component (Updated)

Location:

- `src/components/Cell.tsx`

Props:

- `value: string` — raw value from `spreadsheetState`.
- `editValue: string` — current value of the input if this cell is being edited.
- `isSelected: boolean` — whether this cell is currently selected.
- `isEditing: boolean` — whether this cell is in edit mode.
- `onSelect: () => void` — invoked on click to select this cell.
- `onStartEdit: () => void` — invoked on double-click or key press to request edit mode.
- `onEdit: (newValue: string) => void` — callback to update `editValue` in parent.
- `onCommit: () => void` — callback to commit the final value to `spreadsheetState`.
- `onCancel: () => void` — callback to cancel an edit.
- `onPaste: (pastedData: string) => void` — callback to handle pasted content.

Local State in `Cell`:

- The `Cell` component becomes primarily presentational and should not hold local state for its value or editing status. It receives all necessary state as props.

Transitions & Behaviors:

- **Selection**: On a single `click`, the cell invokes `onSelect()`.
- **Entering Edit Mode**:
  - On `double-click`, the cell invokes `onStartEdit()`.
  - When selected, if the user types a character, the parent `Spreadsheet` component will handle the keydown event and transition the cell into edit mode by setting the `isEditing` prop to true.
- **Display vs. Raw Value**:
  - When `!isEditing`:
    - If `isNumeric(value)` and `value` is not empty: show `formatCurrency(value)`.
    - Otherwise: show `value` as-is.
  - When `isEditing`:
    - Render a focused `<input>` element displaying the `editValue` prop.
- **Editing Lifecycle**:
  - **Typing**: The `<input>` element's `onChange` handler calls `onEdit(e.target.value)`.
  - **Committing**: The parent `Spreadsheet` handles commit logic on navigation, blur, or Enter/Tab key presses. The `Cell` itself does not decide when to commit.
  - **Cancelling**: The parent handles the Escape key to cancel an edit.
- **Pasting**: The `onPaste` event on the `<input>` is captured and forwarded to the parent's `onPaste` handler for sanitization.

Visual Styling:

- Use a Chakra `Input` (when editing) or `Box` (when displaying) inside a container.
- Default border: light gray.
- When `isSelected` is true:
  - Render a thicker blue border (e.g., 2px) around the cell.
  - Ensure the border does not cause layout shifts (e.g., using `box-sizing: border-box` and consistent padding).

Keyboard Handling Inside `Cell`:

- When `isEditing` is true, the `Cell`'s `<input>` should have focus.
- All keyboard events (`onKeyDown`) are bubbled up to the parent `Spreadsheet` grid container for centralized handling. This ensures that navigation keys (Enter, Tab, Arrows) and control keys (Escape) are managed consistently by the parent, which has the full context of the spreadsheet's state.

## 6. Spreadsheet Layout and Rendering

### 6.1 Grid Structure in `Spreadsheet`

`Spreadsheet` should render a grid with explicit headers:

- Top row:
  - Corner cell (empty) on the far left.
  - Column header cells for each column (0 to `NUM_COLUMNS - 1`).
- Subsequent rows (for each `rowIdx` from 0 to `NUM_ROWS - 1`):
  - Row header cell (row number = `rowIdx + 1`).
  - Data cells for each column (`colIdx` from 0 to `NUM_COLUMNS - 1`).

Use Chakra `Flex` components or CSS grid-like layout to align cells:

- Each row is a `Flex` container.
- Inside each row:
  - First child is a `RowLabel` or corner cell.
  - Remaining children are `Cell` components.
- Column widths should be consistent:
  - Column headers and data cells should share the same width.
  - Row headers should have a fixed narrower width.

### 6.2 Label Alignment

- Ensure padding, border widths, and box sizing are consistent between headers and data cells.
- Use explicit `minWidth` / `width` props to match data cells widths to column headers.
- For vertical alignment:
  - Use consistent `minHeight` / `height` for both header cells and data cells.

### 6.3 Styling Tokens

Use the following values per PRD:

- Colors:
  - Selection blue: `#1a73e8`.
  - Selection blue overlay: `rgba(26, 115, 232, 0.1)`.
  - Label background: `#f8f9fa`.
  - Default border: `#dadce0`.
  - Selected border: `#1a73e8`.
  - Default text: `#202124`.
  - Label text: `#5f6368`.
- Spacing:
  - Cell padding: 8px.
  - Data cell min-width: 100px.
  - Data cell min-height: 32px.
  - Row label width: 50px.
  - Border width default: 1px.
  - Border width selected: 2px.
- Typography:
  - Use Chakra defaults for font family.
  - Cell text size: ~14px.
  - Label text size: ~13px.
  - Label font weight: semi-bold.

## 7. Keyboard Navigation and Selection Logic

### 7.1 Selection State

In `Spreadsheet`:

- Maintain `selectedCell: { row, col }`.
- Maintain `editingCell: { row, col } | null`.
- Maintain `editValue: string`.
- Initial selection: `{ row: 0, col: 0 }`. `editingCell` is `null`.
- Update selection when a `Cell` calls `onSelect`.
- Transition to editing mode when a `Cell` calls `onStartEdit`.

### 7.2 Focus Management

- The `Spreadsheet` component will render a single focusable grid container (e.g., a `div` with `tabIndex={-1}`) that wraps all cells. This container will have an `onKeyDown` handler to manage all keyboard interactions.
- When `selectedCell` changes, the grid container should be focused programmatically.
- The individual `Cell`'s `<input>` element only receives focus when the cell enters edit mode. When editing is finished, focus returns to the main grid container.
- This strategy prevents performance issues from rapid focus-switching during navigation and centralizes control.

### 7.3 `onKeyDown` Handling Strategy

- Attach a single `onKeyDown` handler to the main grid container in `Spreadsheet`.
- This handler will implement all navigation and state transition logic.

**State-Dependent Logic:**

- **If `editingCell` is `null` (Navigation Mode):**
  - **Arrow Keys**: Update `selectedCell` coordinates, clamping to boundaries.
  - **Enter**: Transition to edit mode for the `selectedCell`. Set `editingCell` to `selectedCell` and initialize `editValue` from `spreadsheetState`.
  - **Any Printable Character**: Transition to edit mode, initializing `editValue` with that character.
- **If `editingCell` is not `null` (Editing Mode):**
  - **Arrow Keys**: Let the default input behavior proceed (move cursor in text). Do not navigate.
  - **Enter/Shift+Enter**: Commit the `editValue` to `spreadsheetState`, set `editingCell` to `null`, and move selection down/up.
  - **Tab/Shift+Tab**: Commit the `editValue`, set `editingCell` to `null`, and move selection right/left.
  - **Escape**: Discard `editValue`, set `editingCell` to `null`. The cell reverts to its original display value.

### 7.4 Arrow Keys

Handled in **Navigation Mode** (`editingCell` is `null`):

- Arrow Up:
  - Move `selectedCell.row` up by 1 (clamp at 0).
- Arrow Down:
  - Move `selectedCell.row` down by 1 (clamp at `NUM_ROWS - 1`).
- Arrow Left:
  - Move `selectedCell.col` left by 1 (clamp at 0).
- Arrow Right:
  - Move `selectedCell.col` right by 1 (clamp at `NUM_COLUMNS - 1`).

For each move, prevent the default browser behavior (e.g., scrolling).

### 7.5 Tab and Shift+Tab

Behavior in **Editing Mode** (`editingCell` is not `null`):

- Tab:
  - Commit the current `editValue`.
  - Set `editingCell` to `null`.
  - Move selection one column to the right (`col + 1`), clamping at the last column.
- Shift+Tab:
  - Commit the current `editValue`.
  - Set `editingCell` to `null`.
  - Move selection one column to the left (`col - 1`), clamping at column `0`.

Prevent default browser tabbing to keep focus within the grid container.

### 7.6 Enter and Shift+Enter

Behavior:

- **Navigation Mode**: Pressing Enter transitions the selected cell to **Editing Mode**.
- **Editing Mode**:
  - **Enter**: Commit `editValue`, exit editing mode, and move selection one row down.
  - **Shift+Enter**: Commit `editValue`, exit editing mode, and move selection one row up.

Boundary clamping applies as with arrow keys.

### 7.7 Escape Key

Behavior in **Editing Mode**:

- Escape:
  - Discard the current `editValue`.
  - Exit editing mode (`editingCell = null`).
  - Do **not** change `selectedCell`.

Implementation:

- The parent `Spreadsheet`'s `onKeyDown` handler will check for the Escape key when `editingCell` is not null and perform these state updates.

### 7.8 Click Behavior

- **Single-clicking** a data cell:
  - If another cell is currently editing, first commit its value.
  - Set `selectedCell` to the clicked cell's indices.
  - If the clicked cell was already the selected cell, do nothing.
- **Double-clicking** a data cell:
  - If another cell is currently editing, first commit its value.
  - Set `selectedCell` to the clicked cell's indices.
  - Immediately enter editing mode for that cell.
- Clicking header cells (`ColumnLabel` or `RowLabel`):
  - Should not change selection or editing state in this version.

## 8. Currency Formatting Behavior

### 8.1 Storage vs Display

- Storage:

  - Always store raw values in `spreadsheetState`.
  - Raw values should never include `$`, commas, or other formatting characters injected by the formatter.

- Display:

  - When a cell is not in edit mode:
    - If `isNumeric(value)` and value is non-empty:
      - Display `formatCurrency(value)`.
    - Otherwise:
      - Display `value` unchanged.

- Editing:
  - When a cell enters edit mode, its input shows the **raw** value (e.g., `"1000"`), not the formatted one (`"$1,000.00"`).
  - On commit, the raw value is stored; formatting is reapplied when returning to display mode.

### 8.2 Edge Cases

- Empty string:
  - Display as an empty cell.
  - Do not format as `$0.00`.
- Mixed alphanumeric (e.g., `"123abc"`):
  - Treated as non-numeric; display unchanged.
- Pasted values:
  - Pasted content (e.g., `"$1,000.00"`) must be sanitized by stripping currency symbols and thousand separators before being stored.
- Very large numbers and very small decimals:
  - Rely on `Intl.NumberFormat` to produce correct formatted strings.

## 9. Visual Feedback and Styling

### 9.1 Selected Cell Borders

- Selected cell:

  - Blue border, thickness 2-3px, color matching selection blue.
  - Ensure border is applied around the entire cell, not just the input.

- Non-selected cells:
  - Default thin light gray border.

### 9.2 Row and Column Highlighting

- Row containing selected cell:

  - `RowLabel` for that row uses blue overlay background color.

- Column containing selected cell:
  - `ColumnLabel` for that column uses blue overlay background color.

All other header cells use the default light gray label background.

## 10. Integration Steps

This section provides an ordered guide for implementing the above design.

### 10.1 Create Utility Module

1. Create `src/utils/spreadsheet.ts`.
2. Implement `getColumnLabel(index: number): string`.
3. Implement `isNumeric(value: string): boolean`.
4. Implement `formatCurrency(value: string): string`.
5. Export all three functions from the module.
6. Ensure no React or browser-specific dependencies are used.

### 10.2 Add Header Components

1. Create `src/components/ColumnLabel.tsx` with the props and behaviors described.
2. Create `src/components/RowLabel.tsx` with the props and behaviors described.
3. Use Chakra UI components for layout and styling.
4. Use constants or inline values for colors, paddings, and font styles per PRD.

### 10.3 Refactor `Cell` Component

1. Update `src/components/Cell.tsx` to accept the extended props.
2. Introduce local state: `editValue`, `originalValue`, `isEditing`.
3. Implement logic for:
   - Entering edit mode on selection/click.
   - Showing formatted vs raw values based on `isEditing`.
   - Handling input changes and updating `editValue`.
   - Committing value on blur/Enter/Tab (calling `onCommit`).
   - Cancelling on Escape (calling `onCancel`).
4. Apply styling for selected vs non-selected cells.
5. Ensure the component remains fully controlled by parent for committing raw value.

### 10.4 Update `Spreadsheet` Layout

1. Modify `src/components/Spreadsheet.tsx` to:
   - Keep existing `spreadsheetState` initialization.
   - Add `selectedCell` state with initial `{ row: 0, col: 0 }`.
2. Render the header row:
   - Outer container row containing:
     - Corner cell.
     - `ColumnLabel` for each column using `getColumnLabel`.
   - Next, render each data row:
     - `RowLabel` at column 0, label `rowIdx + 1`.
     - `Cell` components for each column.
3. Pass correct props to `Cell`:
   - Raw `value` index from `spreadsheetState[rowIdx][colIdx]`.
   - `rowIndex`, `colIndex`.
   - `isSelected` computed from `selectedCell`.
   - `onSelect` that sets `selectedCell`.
   - `onCommit` that updates `spreadsheetState` at that position.
   - `onChange` if incremental updates are desired.
   - `onCancel` (may be a no-op in parent except for potential future features).
4. Make sure header labels align visually with data cells.

### 10.5 Implement Keyboard Navigation

1. Decide on where to attach `onKeyDown`:
   - Either on a wrapper element around the grid or on each `Cell`.
   - Ensure events for navigation are centralized in `Spreadsheet`.
2. Implement parent state or callbacks to track whether the selected cell is in editing mode.
3. For arrow keys, Tab, Enter, and Escape:
   - Prevent default behavior as needed.
   - Delegate non-editing navigation to `Spreadsheet`.
   - Commit or cancel edits as specified.
   - Enforce boundaries (no wrapping, no crossing edges).
4. After updating `selectedCell`, ensure focus moves to the new `Cell`.

### 10.6 Verify Acceptance Criteria

Use the PRD's acceptance criteria as a checklist:

- Column and row labels:
  - Confirm A-Z and AA+ generation.
  - Confirm row numbering 1-10.
  - Confirm labels are non-editable and visually distinct.
- Currency formatting:
  - Confirm integer, decimal, negative numbers format correctly.
  - Confirm raw values are preserved in state and editing.
  - Confirm non-numeric values remain unchanged.
- Selection and navigation:
  - Confirm initial selection at A1.
  - Confirm visual borders and row/column highlighting.
  - Confirm arrow, Tab, Enter, Shift+Enter, Escape behaviors.
  - Confirm boundaries (no navigation beyond grid edges).
  - Confirm editing vs navigation behaviors with arrow keys.

## 11. Open Questions / Assumptions

The following have been addressed based on the architectural review:

- **Selection vs. Editing**: The model is now a distinct two-mode system (Navigation and Editing), which aligns with the PRD and standard spreadsheet UX. A cell is selected, and a separate action (Enter, double-click, typing) transitions it to edit mode.
- **State Management**: All editing state (`editingCell`, `editValue`) is now lifted to the `Spreadsheet` component, creating a single source of truth and simplifying the `Cell` component.
- **Race Conditions**: Centralizing keyboard logic in a single `onKeyDown` handler and managing state transitions explicitly (commit-then-navigate) mitigates race conditions.
- **Focus Management**: The strategy has been updated to use a single focusable grid container for better performance and control.
- **Paste Handling**: A requirement to sanitize pasted data has been added.
- **Double-Click**: Double-click is now a defined action to enter edit mode.
- **`onChange` Prop**: The ambiguous `onChange` prop has been removed in favor of a clearer `onEdit`/`onCommit` flow.
