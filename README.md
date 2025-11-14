# react-interview

Welcome to the Runway frontend exercise! We really appreciate you taking time to show us your
frontend development skills.

This repository is configured with a bunch of widely-used tools that are part of our
frontend engineering stack at Runway: React, NextJS, TypeScript, and more. It also includes
[Chakra UI](https://chakra-ui.com/docs/getting-started), a flexible component library that contains
handy building blocks for creating React apps.

Along with the tooling, you'll find a few components to help get you up and running on the
exercise. Our goal with the repo is to save you time creating a modern development
environment and writing boilerplate code. You're welcome to use some,
all, or none of what's included here. If you prefer to start with something like
[create-react-app](https://github.com/facebook/create-react-app) and to
borrow selectively from this repo, please feel free to do so.

## Installation

You can install dependencies using `yarn install` and run the app using `yarn dev`.

## **Requirements**

1. Add row and column labels to the spreadsheet.
2. Display numeric cell values as comma-ized dollars (e.g. 1000 → $1,000).
3. Add single-cell selection functionality, and allow user to move the selection with arrow keys.
4. If you have time remaining, feel free to add whatever you like beyond the given requirements, or to outline in the README what you would have liked to add with additional time.

**Evaluation Criteria**

The requirements above are intentionally open-ended to give you room to be creative. The most important things we look for in a solution are:

- **Strong usability**
  - Anybody who has used a spreadsheet before can use your solution without issue
- **An eye for design**
- **Well-factored components**
- **Readable and maintainable code**
- **Having few bugs** and handling edge cases gracefully

**Out of scope**

Given the time constraints of the exercise, we understand that you might not have time for everything you'd like to do. Here are some things that aren't as important to us:

- Performance for large spreadsheets
- Pixel-perfect design
- Perfectly typed interfaces
- Persistence of data across refreshes
- Robust error handling and input validation
- Comments beyond what you might normally include in production code

And some things that are totally unimportant:

- The stack you use -- choose whichever tools you are most comfortable with
- Spacing and stylistic differences that can be handled by computers
- Adding tests (just in the context of this exercise!)

## Write Up

I chose to highlight my approach leveraging AI tools to accelerate development. I used copilot to use a persona based approach to generate a PRD, Design Doc, and ultimately implement the features.

I like to follow the approach outlined in this URL: https://humanwhocodes.com/blog/2025/06/persona-based-approach-ai-assisted-programming/

Starting with a [PRD file](docs/spreadsheet-enhancement-prd.md) to outline the user experience and acceptance criteria.
Then created a [technical spec](docs/spreadsheet-enhancement-techspec.md) to outline the implementation details.
To ensure alignment with the project goals and constraints, I created a project-wide [AGENTS.md](AGENTS.md) to ensure we conform to the project's requirements.

Adding these files ensures the AI stays on task and meets feature requirements.

## Completed Features

I implemented the following core requirements and enhancements:

1.  **Editable Sheet Title**: The sheet title at the top of the page now behaves like a familiar document title field. You can click to rename it inline, press `Enter` to save, or press `Escape` to revert to the previous value.

2.  **Row and Column Labels**: The spreadsheet now features classic row (1, 2, 3...) and column (A, B, C...) headers. These labels remain fixed and visible as you scroll, providing clear orientation within the grid.

3.  **Currency Formatting**: The application automatically displays any numeric value entered into a cell as a comma-separated USD currency string (e.g., `1234.5` becomes `$1,234.50`). It preserves the raw numeric value for editing, ensuring a seamless data entry experience.

4.  **Single-Cell Selection and Keyboard Navigation**:

- Users can select a single cell, which highlights with a blue border.
- The corresponding row and column headers are also highlighted to improve visibility.
- Users can move the selection using the arrow keys, `Tab`/`Shift+Tab`, and `Enter`/`Shift+Enter`, providing a familiar navigation experience consistent with popular spreadsheet applications.
- Pressing `Enter` or starting to type on a selected cell initiates editing. While editing, keys like `Tab`, `Enter`, and the vertical arrow keys (`ArrowUp`/`ArrowDown`) will first commit the change and then move the selection, while the horizontal arrow keys move the caret within the cell.
- Pressing the `Escape` key while editing will cancel the changes and revert the cell to its original value.

5.  **Formula Support**:

- Cells that start with `=` act as formulas, supporting arithmetic (`+`, `-`, `*`, `/`), parentheses, and cell references (e.g., `=A1+B2`).
- The grid supports common functions like `SUM`, `AVG`, `MIN`, `MAX`, and `COUNT`, with both individual cell references and ranges (e.g., `=SUM(A1:A10)`).
- The engine detects invalid references, argument errors, and cyclic dependencies and surfaces them as spreadsheet-style error values (e.g., `#ERROR`, `#CYCLE`).
- Numeric results show using the same USD currency formatting as raw numeric cells.

6.  **Burn Rate Easter Egg**:

- The grid includes a small hidden feature: entering a special formula in a cell triggers a burn-rate style animation that radiates across the sheet while leaving selection and editing behavior intact.
- The effect stays temporary; you can dismiss it via keyboard or interaction, returning the grid to its normal appearance.
