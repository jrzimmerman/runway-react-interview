# Spreadsheet Enhancement PRD

## Overview

This PRD outlines the requirements for enhancing the basic spreadsheet application with Google Sheets-like functionality, including row/column labels, currency formatting, and keyboard navigation.

## Goals

- Create a familiar spreadsheet experience similar to Google Sheets
- Enable efficient data entry and navigation using keyboard controls
- Provide clear visual feedback for user interactions
- Display numeric values in a currency format for better readability

## Non-Goals

- Performance optimization for large spreadsheets (>100 cells)
- Pixel-perfect design matching Google Sheets
- Data persistence across browser refreshes
- Robust error handling and input validation
- Comprehensive test coverage

## Success Metrics

- Users can navigate the spreadsheet using keyboard without confusion
- Cell selection state is immediately clear to users
- Numeric values are consistently formatted as USD currency
- Column labels support expansion beyond 26 columns (A-Z to AA, AB, etc.)

---

## Feature 1: Row and Column Labels

### User Story

**As a** spreadsheet user
**I want** to see row numbers and column letters on my spreadsheet
**So that** I can easily identify and reference specific cells

### Background

Currently, the spreadsheet has no way to identify cells by their position. Users expect spreadsheet cells to be labeled with column letters (A, B, C, ..., Z, AA, AB, ...) and row numbers (1, 2, 3, ...) similar to Excel and Google Sheets.

### Requirements

#### Functional Requirements

- Display column labels as letters in a header row above the spreadsheet grid
  - Columns 0-25 should display as A-Z
  - Columns 26+ should display as AA, AB, AC, etc.
  - Algorithm: Convert zero-based column index to base-26 letter system
- Display row labels as numbers in a header column to the left of the spreadsheet grid
  - Rows should be numbered starting from 1 (not 0-indexed)
- Labels should be in separate cells from the data cells
- Label cells should be visually distinct from data cells

#### Visual Design Requirements

- Column header cells:
  - Light gray background color
  - Centered text alignment
  - Bold font weight
  - Same width as data cells
- Row header cells:
  - Light gray background color
  - Centered text alignment
  - Bold font weight
  - Narrower width optimized for displaying numbers
- Top-left corner cell (intersection of row/column headers):
  - Empty or display a subtle icon
  - Same styling as other label cells

#### Technical Requirements

- Create a utility function `getColumnLabel(index: number): string` to convert column index to letter(s)
- Labels should be non-editable (not input fields)
- Headers should use appropriate semantic HTML/Chakra components

### Acceptance Criteria

- [ ] Column labels A-Z are displayed above columns 0-25
- [ ] Column labels correctly expand to AA, AB, AC... for columns 26+
- [ ] Row labels 1-10 are displayed to the left of rows 0-9
- [ ] Label cells have distinct visual styling (gray background, bold text, centered)
- [ ] Labels are not editable by users
- [ ] Labels align properly with their corresponding data cells
- [ ] The top-left corner cell exists and is styled appropriately

### Edge Cases

- Column index 26 should display "AA" (not "A0" or similar)
- Column index 27 should display "AB"
- Very large column indices (>676) should display as AAA, AAB, etc.

---

## Feature 2: Currency Formatting for Numeric Values

### User Story

**As a** spreadsheet user
**I want** numeric cell values to be displayed with dollar signs and thousand separators
**So that** I can easily read and understand monetary values

### Background

Users often work with financial data in spreadsheets. Raw numbers like "1000" or "1000000" are harder to read than formatted values like "$1,000" or "$1,000,000". The spreadsheet should automatically detect and format numeric values.

### Requirements

#### Functional Requirements

- Detect when a cell contains a numeric value
- Format numeric values using `Intl.NumberFormat` with USD currency style
- Display formatted value in the cell while preserving the original value in state
- Support both integers and decimal numbers
- Support negative numbers

#### Data Management

- **Storage**: Store the raw, unformatted value in the spreadsheet state
- **Display**: Show the formatted value to the user
- **Editing**: When a user focuses/edits a cell, show the raw value for editing
- **On blur**: Re-apply formatting after user finishes editing

#### Formatting Specifications

- Use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
- Examples:
  - `1000` → `$1,000.00`
  - `1000000` → `$1,000,000.00`
  - `-500` → `-$500.00`
  - `1234.56` → `$1,234.56`
- Non-numeric values (text) should display as-is without formatting

#### Technical Requirements

- Create a utility function `formatCurrency(value: string): string`
- Create a utility function `isNumeric(value: string): boolean`
- Cell component should handle displaying formatted vs raw value based on focus state

### Acceptance Criteria

- [ ] Integer values are displayed with dollar sign and thousand separators (e.g., "$1,000")
- [ ] Decimal values are displayed with proper formatting (e.g., "$1,234.56")
- [ ] Negative numbers are formatted correctly (e.g., "-$500.00")
- [ ] Non-numeric text values are displayed unchanged
- [ ] When editing a cell, the raw unformatted value is shown
- [ ] After editing, the formatted value is displayed again
- [ ] Original numeric values are preserved in state (not converted to strings with $ symbols)
- [ ] Empty cells display as empty (not "$0.00")

### Edge Cases

- Empty string should not be formatted as "$0.00"
- String "abc" should display as "abc" (not formatted)
- String "123abc" should display as "123abc" (not formatted)
- Leading zeros like "007" should be treated as numeric and formatted
- Very large numbers (>1 trillion) should format correctly
- Very small decimals (e.g., 0.001) should format correctly

---

## Feature 3: Cell Selection and Keyboard Navigation

### User Story

**As a** spreadsheet user
**I want** to select cells and navigate using my keyboard
**So that** I can efficiently enter and edit data without using my mouse

### Background

Keyboard navigation is essential for spreadsheet efficiency. Users expect to use arrow keys, Tab, and Enter to move between cells quickly. Visual feedback must clearly indicate which cell is currently selected.

### Requirements

#### Selection State Management

- Track currently selected cell by row and column index
- Only one cell can be selected at a time (no multi-select for this version)
- Initial state: Cell A1 (row 0, column 0) should be selected on spreadsheet load
- Clicking a cell should select it
- Keyboard navigation should update the selection

#### Visual Feedback - Google Sheets Style

**Selected Cell:**

- Bold border (2-3px) in blue color (similar to Google Sheets blue: #1a73e8)
- Border should be clearly visible and distinct from unselected cells

**Row Label for Selected Cell:**

- Apply a blue semi-transparent overlay/background (e.g., rgba(26, 115, 232, 0.1))
- Indicates which row contains the selected cell

**Column Label for Selected Cell:**

- Apply a blue semi-transparent overlay/background (e.g., rgba(26, 115, 232, 0.1))
- Indicates which column contains the selected cell

#### Keyboard Navigation

**Arrow Keys:**

- ↑ (ArrowUp): Move selection one cell up
- ↓ (ArrowDown): Move selection one cell down
- → (ArrowRight): Move selection one cell right
- ← (ArrowLeft): Move selection one cell left

**Tab Navigation:**

- Tab: Commit current cell value and move selection one cell to the right
- Shift + Tab: Commit current cell value and move selection one cell to the left

**Enter Key:**

- Enter: Commit current cell value and move selection one cell down
- Shift + Enter: Commit current cell value and move selection one cell up

**Escape Key:**

- Escape: Revert cell to original value (before editing began) and exit edit mode
- Does not move selection, keeps current cell selected

#### Boundary Handling

- Navigation should stop at spreadsheet boundaries (no wrapping)
- Pressing up arrow when in row 0 should keep selection in row 0
- Pressing left arrow when in column 0 (A) should keep selection in column 0
- Pressing down arrow when in last row should keep selection in last row
- Pressing right arrow when in last column should keep selection in last column
- Tab on last column should keep selection in last column (no wrap to next row)

#### Focus Management

- Selected cell should receive keyboard focus
- When a cell is focused, user can type to edit
- Store the original cell value when editing begins
- Commit changes to state when:
  - User navigates away with arrow keys
  - User presses Enter or Shift+Enter
  - User presses Tab or Shift+Tab
  - User clicks another cell
- Revert to original value when:
  - User presses Escape (cancels edit, restores original value)
- Arrow keys should navigate when cell is not in edit mode
- When editing (typing in cell), arrow keys should move cursor within the text (not navigate cells)

#### Technical Requirements

- Add selection state: `const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 })`
- Track original value when editing begins: Store value when cell enters edit mode
- Implement `onKeyDown` handler at spreadsheet level
- Pass selection state and handlers to Cell components via props
- Prevent default browser behavior for navigation keys
- Distinguish between "selected but not editing" and "selected and editing" states
- Cell component should manage temporary edit state separate from committed spreadsheet state

### Acceptance Criteria

**Initial Load:**

- [ ] Cell A1 is selected by default when spreadsheet loads
- [ ] Cell A1 has blue border and row/column labels have blue overlay

**Cell Selection:**

- [ ] Clicking any cell selects it
- [ ] Selected cell displays with bold blue border
- [ ] Row label for selected cell row has blue overlay
- [ ] Column label for selected cell column has blue overlay
- [ ] Only one cell is selected at a time

**Arrow Key Navigation:**

- [ ] Arrow Up moves selection up (unless already at row 0)
- [ ] Arrow Down moves selection down (unless already at last row)
- [ ] Arrow Left moves selection left (unless already at column 0)
- [ ] Arrow Right moves selection right (unless already at last column)
- [ ] Navigation updates visual selection immediately

**Tab Navigation:**

- [ ] Tab commits cell value and moves selection right (unless already at last column)
- [ ] Shift+Tab commits cell value and moves selection left (unless already at column 0)

**Enter Navigation:**

- [ ] Enter commits cell value and moves selection down (unless already at last row)
- [ ] Shift+Enter commits cell value and moves selection up (unless already at row 0)

**Escape Key:**

- [ ] Escape reverts cell to its original value (before editing started)
- [ ] Escape exits edit mode but keeps cell selected
- [ ] Escape does not navigate to a different cell

**Value Persistence:**

- [ ] Navigating away from a cell with arrow keys commits the current value
- [ ] Pressing Tab/Shift+Tab commits the current value before navigating
- [ ] Pressing Enter/Shift+Enter commits the current value before navigating
- [ ] Clicking a different cell commits the current value
- [ ] Only Escape key reverts to original value

**Boundary Conditions:**

- [ ] Cannot navigate beyond row 0 using up arrow or Shift+Enter
- [ ] Cannot navigate beyond last row using down arrow or Enter
- [ ] Cannot navigate beyond column 0 using left arrow or Shift+Tab
- [ ] Cannot navigate beyond last column using right arrow or Tab

**Focus and Editing:**

- [ ] Selected cell can be focused for editing
- [ ] Original value is stored when cell enters edit mode
- [ ] When editing (typing), arrow keys move cursor within text (do not navigate)
- [ ] When not editing, arrow keys navigate between cells
- [ ] Pressing Escape restores original value and exits edit mode without saving changes

### Edge Cases

- User rapidly presses navigation keys (should not skip cells or get into invalid state)
- User holds down navigation key (should navigate smoothly without errors)
- User presses multiple keys simultaneously
- Cell contains long text that overflows visually (should still navigate correctly)
- Window resize during selection (selection should remain valid)
- User edits cell, presses Escape, original value should be restored exactly
- User enters edit mode but doesn't change anything, then presses Escape (should not trigger unnecessary state updates)
- User edits cell, navigates away, then navigates back (should show committed value, not allow undo)
- User starts editing, then clicks same cell again (should remain in edit mode)

---

## Feature 4: Future Enhancements (Stretch Goals)

These features are documented for potential future implementation after core requirements are complete.

### Editable Spreadsheet Title

**User Story:** As a spreadsheet user, I want to rename my spreadsheet so that I can organize my work with meaningful names.

**Requirements:**

- Display spreadsheet title at the top of the page (above the grid)
- Default title: "Untitled Spreadsheet"
- Title should be clickable to enter edit mode
- Visual indication that title is editable (e.g., hover effect, cursor change)
- Clicking title converts it to an input field
- Pressing Enter or clicking outside commits the new name
- Pressing Escape cancels edit and reverts to previous name
- Empty titles should revert to "Untitled Spreadsheet"
- Title should have reasonable max length (e.g., 100 characters)

**Visual Design:**

- Title displayed as heading (larger font, prominent placement)
- Subtle underline or border on hover to indicate clickability
- Similar styling to Google Sheets title behavior
- Should fit naturally above the spreadsheet grid

**Acceptance Criteria:**

- [ ] "Untitled Spreadsheet" is displayed by default
- [ ] Clicking title enters edit mode with input field
- [ ] Input field is pre-filled with current title
- [ ] Enter key commits the new title
- [ ] Clicking outside the input commits the new title
- [ ] Escape key cancels edit and restores previous title
- [ ] Empty titles revert to "Untitled Spreadsheet"
- [ ] Title has visual hover effect indicating it's clickable
- [ ] Title change is reflected immediately in the UI

### Copy/Paste Functionality

**User Story:** As a spreadsheet user, I want to copy and paste cell values so that I can duplicate data efficiently.

**Requirements:**

- Ctrl/Cmd+C to copy selected cell value
- Ctrl/Cmd+V to paste into selected cell
- Visual feedback when copy is performed
- Support for pasting from external sources

### Undo/Redo

**User Story:** As a spreadsheet user, I want to undo and redo my changes so that I can recover from mistakes.

**Requirements:**

- Ctrl/Cmd+Z for undo
- Ctrl/Cmd+Shift+Z for redo
- Maintain history stack of changes
- Limit history to reasonable size (e.g., last 50 actions)

### Basic Formulas

**User Story:** As a spreadsheet user, I want to enter basic formulas so that I can perform calculations automatically.

**Requirements:**

- Support formulas starting with "=" (e.g., "=A1+B1")
- Basic operators: +, -, \*, /
- Cell references (e.g., A1, B2)
- Simple functions: SUM, AVERAGE, MIN, MAX
- Display calculated result (not formula) in cell
- Show formula in edit mode or formula bar

### Resizable Columns

**User Story:** As a spreadsheet user, I want to resize column widths so that I can view long text values.

**Requirements:**

- Drag handle between column headers
- Double-click to auto-fit content
- Minimum and maximum width constraints

### Multi-Cell Selection

**User Story:** As a spreadsheet user, I want to select multiple cells so that I can perform bulk operations.

**Requirements:**

- Click and drag to select range
- Shift+Click to extend selection
- Visual highlight for selected range
- Copy/paste for ranges
- Fill down/right functionality

### Export to CSV

**User Story:** As a spreadsheet user, I want to export my data to CSV so that I can use it in other applications.

**Requirements:**

- Button to trigger export
- Download CSV file with current data
- Preserve raw values (not formatted)
- Handle special characters and quotes properly

### Cell Formatting Options

**User Story:** As a spreadsheet user, I want to choose different formatting options so that I can display data appropriately.

**Requirements:**

- Format selector (currency, percentage, number, text, date)
- Decimal place selector for numbers
- Currency selector (USD, EUR, etc.)
- Text alignment options
- Font styling (bold, italic, color)

### Easter Egg: Burn Rate Animation 🔥

**User Story:** As a Runway team member, I want a fun easter egg that celebrates our "Burn Rate" hot sauce so that users discover a delightful surprise.

**Requirements:**

- Detect when a cell contains the formula `=BURNRATE()`
- Trigger a flame animation effect starting from that cell
- Animation should spread across cells in a burn rate chart pattern (typically downward and to the right, showing declining resources over time)
- Visual effects:
  - Flame emoji (🔥) or animated fire effects on affected cells
  - Cells transition through colors: yellow → orange → red
  - Animation spreads gradually to simulate burning
  - Possible addition of particle effects or embers
- Animation should be non-intrusive and can be dismissed
- Consider adding a subtle "Burn Rate by Runway" branding watermark during animation
- Optional: Play a brief sound effect (crackling fire or sizzle)

**Technical Considerations:**

- Use CSS animations and transitions for smooth effects
- Implement using React animation libraries (e.g., Framer Motion, React Spring) or CSS keyframes
- Animation should not interfere with spreadsheet functionality
- Should work across different spreadsheet sizes
- Consider performance impact of animation

**Acceptance Criteria:**

- [ ] Typing `=BURNRATE()` in a cell triggers the easter egg
- [ ] Flame animation starts at the formula cell
- [ ] Animation spreads in burn rate chart direction (down and right)
- [ ] Visual effects include fire colors and flame emojis
- [ ] Animation is smooth and visually appealing
- [ ] Animation can be stopped/dismissed by pressing Escape or clicking
- [ ] Animation does not break spreadsheet functionality
- [ ] Easter egg works on both desktop and mobile viewports

---

## Technical Architecture

### Component Structure

```
App
└── Spreadsheet
    ├── CornerCell (empty top-left cell)
    ├── ColumnHeader (row of column labels)
    │   └── ColumnLabel (individual label: A, B, C, ...)
    ├── Row (each data row)
    │   ├── RowLabel (row number: 1, 2, 3, ...)
    │   └── Cell (individual data cell)
    └── (repeated for each row)
```

### State Management

```typescript
// In Spreadsheet component
const [spreadsheetState, setSpreadsheetState] = useState<string[][]>(/* initial grid */);
const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

// In Cell component (local state for editing)
const [editValue, setEditValue] = useState<string>(value);
const [originalValue, setOriginalValue] = useState<string>(value);
const [isEditing, setIsEditing] = useState<boolean>(false);
```

### Utility Functions

```typescript
// utils/spreadsheet.ts
export function getColumnLabel(index: number): string;
export function isNumeric(value: string): boolean;
export function formatCurrency(value: string): string;
```

### Key Props

**Cell Component:**

```typescript
interface CellProps {
  value: string;
  onChange: (newValue: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  onCommit: (newValue: string) => void; // Commit changes to parent state
  onCancel: () => void; // Cancel editing and revert to original
  rowIndex: number;
  colIndex: number;
}
```

**ColumnLabel Component:**

```typescript
interface ColumnLabelProps {
  label: string;
  isSelected: boolean;
}
```

**RowLabel Component:**

```typescript
interface RowLabelProps {
  label: number;
  isSelected: boolean;
}
```

---

## Design Specifications

### Color Palette

- **Selection Blue**: `#1a73e8` (primary)
- **Selection Blue (overlay)**: `rgba(26, 115, 232, 0.1)` (10% opacity)
- **Label Background**: `#f8f9fa` (light gray)
- **Border Default**: `#dadce0` (light gray)
- **Border Selected**: `#1a73e8` (blue, 2px)
- **Text Default**: `#202124` (dark gray)
- **Text Label**: `#5f6368` (medium gray)

### Spacing

- Cell padding: 8px
- Cell min-width: 100px (data cells)
- Cell min-height: 32px
- Row label width: 50px
- Border width (default): 1px
- Border width (selected): 2px

### Typography

- Font family: System font stack (use Chakra defaults)
- Cell text size: 14px
- Label text size: 13px
- Label font weight: 600 (semi-bold)

---

## Implementation Phases

### Phase 1: Row and Column Labels

1. Create utility function for column label generation
2. Create ColumnLabel component
3. Create RowLabel component
4. Update Spreadsheet component to render labels
5. Apply styling to match design specs

### Phase 2: Currency Formatting

1. Create utility functions (isNumeric, formatCurrency)
2. Update Cell component to handle formatted display
3. Implement edit mode vs display mode
4. Test with various numeric inputs

### Phase 3: Cell Selection and Navigation

1. Add selection state to Spreadsheet
2. Update Cell component to handle selection
3. Add original value tracking in Cell component
4. Implement edit mode state management (isEditing, editValue, originalValue)
5. Implement click-to-select
6. Add visual styling for selection
7. Implement keyboard event handler
8. Add arrow key navigation with auto-commit
9. Add Tab/Shift+Tab navigation with auto-commit
10. Add Enter/Shift+Enter navigation with auto-commit
11. Add Escape key to cancel and revert to original value
12. Implement boundary checking
13. Add row/column label highlighting

### Phase 4: Testing and Refinement

1. Manual testing of all navigation paths
2. Test boundary conditions
3. Test with various data inputs
4. Refinement of visual design
5. Code cleanup and optimization

---

## Open Questions

- Should we support more than 10 rows and 10 columns in the future?
- Should numeric values always show 2 decimal places, or only when decimals are present?
- Should we add a visual indicator when navigation is blocked by a boundary?
- Should there be a "formula bar" above the spreadsheet showing the raw value of selected cell?

---

## Appendix

### Column Label Algorithm

To convert a zero-based column index to spreadsheet letters:

```
Index 0 → A
Index 1 → B
...
Index 25 → Z
Index 26 → AA
Index 27 → AB
...
Index 51 → AZ
Index 52 → BA
```

This is similar to base-26 conversion but with A=1 instead of A=0.

### Reference Implementations

- Google Sheets: https://sheets.google.com
- Excel Online: https://www.office.com/launch/excel

### Resources

- Intl.NumberFormat documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- Chakra UI components: https://chakra-ui.com/docs/components
- React keyboard event handling: https://react.dev/reference/react-dom/components/common#react-event-object
