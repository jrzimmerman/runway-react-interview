// src/utils/spreadsheet.ts

/**
 * Converts a zero-based column index into spreadsheet-like labels (A, B, ..., Z, AA, AB, ...).
 * This is a base-26-like conversion, where 0 -> A, 25 -> Z, 26 -> AA.
 * @param index The 0-based column index.
 * @returns The column label as an uppercase string.
 */
export const getColumnLabel = (index: number): string => {
  let label = '';
  let temp = index + 1;
  while (temp > 0) {
    const remainder = (temp - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    temp = Math.floor((temp - 1) / 26);
  }
  return label;
};

/**
 * Checks if a string represents a numeric value.
 * This is used to determine whether a cell's value should be formatted as currency.
 * It trims whitespace and uses `isFinite(Number(...))` for robust checking,
 * which correctly handles integers, decimals, and signs, while rejecting empty or mixed strings.
 * @param value The string to check.
 * @returns True if the string is numeric, false otherwise.
 */
export const isNumeric = (value: string): boolean => {
  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return false;
  }
  return isFinite(Number(trimmedValue));
};

/**
 * Formats a numeric string as a USD currency string (e.g., "$1,234.56").
 * It uses the `Intl.NumberFormat` API for locale-aware formatting.
 * If the value is not numeric or is empty, it returns the original value unchanged
 * to ensure non-numeric data is displayed as-is.
 * @param value The string value to format.
 * @returns The formatted currency string or the original value.
 */
export const formatCurrency = (value: string): string => {
  if (value === '' || !isNumeric(value)) {
    return value;
  }
  const numericValue = Number(value.trim());
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericValue);
};

export const stripCurrencyFormatting = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const normalized = trimmed.replace(/[$,]/g, '');
  return normalized;
};

export const parseCellAddress = (
  label: string,
  maxRows: number = 10,
  maxCols: number = 10,
): { row: number; col: number } | null => {
  const trimmed = label.trim().toUpperCase();
  const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(trimmed);
  if (!match) return null;
  const [, colPart, rowPart] = match;

  let colIndex = 0;
  for (let i = 0; i < colPart.length; i += 1) {
    colIndex = colIndex * 26 + (colPart.charCodeAt(i) - 64);
  }
  colIndex -= 1;

  const rowIndex = parseInt(rowPart, 10) - 1;
  if (rowIndex < 0 || rowIndex >= maxRows || colIndex < 0 || colIndex >= maxCols) {
    return null;
  }

  return { row: rowIndex, col: colIndex };
};

export const getCellLabel = (row: number, col: number): string => {
  return `${getColumnLabel(col)}${row + 1}`;
};

export const parseRange = (
  range: string,
  maxRows: number = 10,
  maxCols: number = 10,
): Array<{ row: number; col: number }> => {
  const [startLabel, endLabel] = range.split(':');
  if (!startLabel || !endLabel) return [];
  const start = parseCellAddress(startLabel, maxRows, maxCols);
  const end = parseCellAddress(endLabel, maxRows, maxCols);
  if (!start || !end) return [];

  const rows = [start.row, end.row].sort((a, b) => a - b);
  const cols = [start.col, end.col].sort((a, b) => a - b);

  const result: Array<{ row: number; col: number }> = [];
  for (let r = rows[0]; r <= rows[1]; r += 1) {
    for (let c = cols[0]; c <= cols[1]; c += 1) {
      result.push({ row: r, col: c });
    }
  }
  return result;
};

const isErrorValue = (value: string): boolean => value.startsWith('#');

const CELL_REF_REGEX = /^[A-Z]+[1-9][0-9]*$/i;

const getCellRawValue = (
  grid: string[][],
  row: number,
  col: number,
): string => {
  if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) {
    return '#ERROR:REF';
  }
  return grid[row][col];
};

export const evaluateFunction = (
  name: string,
  args: string[],
  grid: string[][],
): string => {
  const upperName = name.trim().toUpperCase();
  const maxRows = grid.length;
  const maxCols = grid[0]?.length ?? 0;

  const numericValues: number[] = [];
  let countNonEmpty = 0;

  const pushFromCoord = (row: number, col: number) => {
    const raw = getCellRawValue(grid, row, col);
    const stripped = stripCurrencyFormatting(raw);
    if (raw !== '') countNonEmpty += 1;
    if (isNumeric(stripped)) {
      numericValues.push(Number(stripped));
    }
  };

  const processArg = (arg: string) => {
    const trimmed = arg.trim();
    if (!trimmed) return;
    if (trimmed.includes(':')) {
      const coords = parseRange(trimmed, maxRows, maxCols);
      coords.forEach((coord) => pushFromCoord(coord.row, coord.col));
      return;
    }
    if (CELL_REF_REGEX.test(trimmed)) {
      const addr = parseCellAddress(trimmed, maxRows, maxCols);
      if (!addr) return;
      pushFromCoord(addr.row, addr.col);
      return;
    }
    const stripped = stripCurrencyFormatting(trimmed);
    if (stripped !== '') countNonEmpty += 1;
    if (isNumeric(stripped)) {
      numericValues.push(Number(stripped));
    }
  };

  args.forEach(processArg);

  switch (upperName) {
    case 'SUM': {
      if (args.length === 0) return '#ERROR:ARGS';
      const sum = numericValues.reduce((acc, v) => acc + v, 0);
      return String(sum);
    }
    case 'AVG': {
      if (args.length === 0) return '#ERROR:ARGS';
      if (numericValues.length === 0) return '0';
      const sum = numericValues.reduce((acc, v) => acc + v, 0);
      return String(sum / numericValues.length);
    }
    case 'MIN': {
      if (args.length === 0) return '#ERROR:ARGS';
      if (numericValues.length === 0) return '0';
      return String(Math.min(...numericValues));
    }
    case 'MAX': {
      if (args.length === 0) return '#ERROR:ARGS';
      if (numericValues.length === 0) return '0';
      return String(Math.max(...numericValues));
    }
    case 'COUNT': {
      if (args.length === 0) return '#ERROR:ARGS';
      return String(countNonEmpty);
    }
    default:
      return '#ERROR:FUNC';
  }
};

type EvalContext = {
  grid: string[][];
  visiting: Set<string>;
};

const makeKey = (row: number, col: number) => `${row}:${col}`;

export const evaluateFormula = (
  formula: string,
  grid: string[][],
  row: number,
  col: number,
  ctx?: EvalContext,
): string => {
  const context: EvalContext =
    ctx ?? {
      grid,
      visiting: new Set<string>(),
    };

  const key = makeKey(row, col);
  if (context.visiting.has(key)) {
    return '#CYCLE';
  }
  context.visiting.add(key);

  const expr = formula.trim().replace(/^=/, '').trim();
  if (!expr) {
    context.visiting.delete(key);
    return '';
  }

  const burnCheck = expr.toUpperCase();
  if (burnCheck === 'BURNRATE()') {
    context.visiting.delete(key);
    return '';
  }

  const funcMatch = /^([A-Z]+)\((.*)\)$/.exec(expr);
  if (funcMatch) {
    const [, fnName, argStr] = funcMatch;
    const args = argStr.split(',');
    const result = evaluateFunction(fnName, args, grid);
    context.visiting.delete(key);
    return result;
  }

  const tokens: string[] = [];
  const src = expr;
  const len = src.length;
  let i = 0;
  while (i < len) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }
    if (/[()+\-*/]/.test(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9.]/.test(src[j])) j += 1;
      tokens.push(src.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9]/.test(src[j])) j += 1;
      const ident = src.slice(i, j);
      if (CELL_REF_REGEX.test(ident)) {
        tokens.push(ident.toUpperCase());
      } else {
        tokens.push(ident.toUpperCase());
      }
      i = j;
      continue;
    }
    context.visiting.delete(key);
    return '#ERROR';
  }

  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parsePrimary = (): string => {
    const t = peek();
    if (t === '(') {
      consume();
      const v = parseExpression();
      if (peek() !== ')') return '#ERROR';
      consume();
      return v;
    }
    if (CELL_REF_REGEX.test(t)) {
      consume();
      const addr = parseCellAddress(t, grid.length, grid[0]?.length ?? 0);
      if (!addr) return '#ERROR:REF';
      const raw = getCellRawValue(grid, addr.row, addr.col);
      if (raw.trim().startsWith('=')) {
        return evaluateFormula(raw, grid, addr.row, addr.col, context);
      }
      return raw;
    }
    if (/^[A-Z]+$/.test(t)) {
      const name = consume();
      if (peek() !== '(') return '#ERROR';
      consume();
      const argTokens: string[] = [];
      let depth = 1;
      while (pos < tokens.length && depth > 0) {
        const tk = consume();
        if (tk === '(') depth += 1;
        else if (tk === ')') depth -= 1;
        if (depth > 0) argTokens.push(tk);
      }
      const argStr = argTokens.join('');
      const args = argStr.split(',');
      return evaluateFunction(name, args, grid);
    }
    if (t && /[0-9.]/.test(t[0])) {
      return consume();
    }
    return '#ERROR';
  };

  const parseUnary = (): string => {
    const t = peek();
    if (t === '+' || t === '-') {
      const op = consume();
      const v = parseUnary();
      if (!isNumeric(v)) return '#ERROR:VALUE';
      const num = Number(v);
      return op === '-' ? String(-num) : String(num);
    }
    return parsePrimary();
  };

  const applyOp = (left: string, right: string, op: string): string => {
    if (isErrorValue(left)) return left;
    if (isErrorValue(right)) return right;
    if (!isNumeric(left) || !isNumeric(right)) return '#ERROR:VALUE';
    const a = Number(left);
    const b = Number(right);
    switch (op) {
      case '+':
        return String(a + b);
      case '-':
        return String(a - b);
      case '*':
        return String(a * b);
      case '/':
        return b === 0 ? '#ERROR:DIV0' : String(a / b);
      default:
        return '#ERROR';
    }
  };

  const parseTerm = (): string => {
    let left = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseUnary();
      left = applyOp(left, right, op);
    }
    return left;
  };

  const parseExpression = (): string => {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = applyOp(left, right, op);
    }
    return left;
  };

  const result = parseExpression();
  context.visiting.delete(key);
  return result;
};

