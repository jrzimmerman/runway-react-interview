import { Box, Flex, Input, Text } from '@chakra-ui/react';
import _ from 'lodash';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { ColumnLabel } from './ColumnLabel';
import { RowLabel } from './RowLabel';
import { getColumnLabel, evaluateFormula, isNumeric, formatCurrency } from '../utils/spreadsheet';

const NUM_ROWS = 10;
const NUM_COLUMNS = 10;

/**
 * The Spreadsheet component is the main stateful component that maintaings the state of the
 * spreadsheet grid. It owns all state and logic for cell values, selection, and editing.
 */
const Spreadsheet: React.FC = () => {
  const [title, setTitle] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleBeforeEdit, setTitleBeforeEdit] = useState('');
  // `spreadsheetState` holds the raw string values for all cells in a 2D array.
  // This is the single source of truth for the spreadsheet's data.
  const [spreadsheetState, setSpreadsheetState] = useState<string[][]>(
    _.times(NUM_ROWS, () => _.times(NUM_COLUMNS, _.constant(''))),
  );
  // `selectedCell` tracks the currently selected cell's coordinates. We default to A1.
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number }>({
    row: 0,
    col: 0,
  });
  // `editingCell` tracks the coordinates of the cell currently in edit mode.
  // If `null`, no cell is being edited.
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  // `editValue` holds the temporary string value of the cell being edited.
  // This state is controlled by the Spreadsheet component, not the Cell.
  const [editValue, setEditValue] = useState('');
  // `isCommitting` is a flag to prevent race conditions between blur/keydown events.
  // This ensures that a commit action only happens once per edit session.
  const [isCommitting, setIsCommitting] = useState(false);

  const [burnRateActive, setBurnRateActive] = useState(false);
  const [burnRateOrigin, setBurnRateOrigin] = useState<{ row: number; col: number } | null>(null);
  const [burnRateWave, setBurnRateWave] = useState(0);
  const [burningCells, setBurningCells] = useState<Set<string>>(new Set());
  const [burnRateOriginalValue, setBurnRateOriginalValue] = useState<string | null>(null);

  // `gridRef` provides a direct reference to the main grid container DOM element.
  // This is used to manage focus for keyboard navigation.
  const gridRef = useRef<HTMLDivElement>(null);

  // `commitEdit` is responsible for taking the `editValue` and saving it to the
  // main `spreadsheetState`.
  // `useCallback` is used to memoize this function, preventing it from being
  // recreated on every render, to avoid unnecessary re-renders of child components.
  const commitEdit = useCallback(() => {
    if (editingCell && !isCommitting) {
      setIsCommitting(true);
      const { row, col } = editingCell;
      const trimmed = editValue.trim();

      if (trimmed.toUpperCase() === '=BURNRATE()') {
        if (!burnRateActive && !burnRateOrigin) {
          setBurnRateActive(true);
          setBurnRateOrigin({ row, col });
          setBurnRateWave(0);
          setBurnRateOriginalValue(spreadsheetState[row][col]);
        }
      } else {
        setSpreadsheetState((prev) => {
          const newRows = [...prev];
          newRows[row] = [...newRows[row]];
          newRows[row][col] = editValue;
          return newRows;
        });
      }

      setBurnRateWave(0);
      setEditingCell(null);
      // A timeout is used to reset the committing flag. This is a micro-task that
      // ensures other events in the current event loop (like blur) can resolve
      // before we allow another commit. Thanks micro event loop :)
      setTimeout(() => setIsCommitting(false), 0);
    }
  }, [burnRateActive, burnRateOrigin, editValue, editingCell, isCommitting, spreadsheetState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent new actions while a commit is in progress to avoid race conditions.
      if (isCommitting) return;

      if (e.key === 'Escape' && burnRateActive) {
        e.preventDefault();
        setBurnRateActive(false);
        setBurnRateOrigin(null);
        setBurnRateOriginalValue(null);
        setBurningCells(new Set());
        return;
      }

      const move = (dr: number, dc: number) => {
        commitEdit();
        setSelectedCell((prev) => ({
          row: Math.max(0, Math.min(NUM_ROWS - 1, prev.row + dr)),
          col: Math.max(0, Math.min(NUM_COLUMNS - 1, prev.col + dc)),
        }));
      };

      // The behavior of keys like Enter, Tab, and Arrows changes depending
      // on whether we are in "editing mode" or "navigation mode".
      if (editingCell) {
        // --- Editing Mode ---
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (editValue.trim().startsWith('=')) {
              // For formulas, commit but keep selection on the same cell.
              commitEdit();
            } else {
              move(e.shiftKey ? -1 : 1, 0);
            }
            break;
          case 'Tab':
            e.preventDefault();
            move(0, e.shiftKey ? -1 : 1);
            break;
          case 'Escape':
            e.preventDefault();
            setEditingCell(null);
            break;
          // Arrow up/down keys in edit mode should commit the edit and then navigate.
          case 'ArrowUp':
            e.preventDefault();
            move(-1, 0);
            break;
          case 'ArrowDown':
            e.preventDefault();
            move(1, 0);
            break;
          default:
            // Allow other keys (like text input) to be handled by the input field.
            break;
        }
      } else {
        // --- Navigation Mode ---
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            move(-1, 0);
            break;
          case 'ArrowDown':
            e.preventDefault();
            move(1, 0);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            move(0, -1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            move(0, 1);
            break;
          case 'Tab':
            e.preventDefault();
            move(0, e.shiftKey ? -1 : 1);
            break;
          case 'Enter':
            // Enter starts an edit.
            e.preventDefault();
            setEditingCell(selectedCell);
            setEditValue(spreadsheetState[selectedCell.row][selectedCell.col]);
            break;
          default:
            // Any printable character starts an edit and replaces the current value.
            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
              setEditingCell(selectedCell);
              setEditValue(e.key);
            }
            break;
        }
      }
    },
    [
      commitEdit,
      editingCell,
      selectedCell,
      spreadsheetState,
      isCommitting,
      burnRateActive,
      editValue,
    ],
  );

  // This `useEffect` hook manages focus. When the user is not editing, we want
  // the main grid container to be focused so it can receive keyboard events.
  // This is a key part of the keyboard navigation strategy.
  useEffect(() => {
    if (!editingCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [selectedCell, editingCell]);

  useEffect(() => {
    if (!burnRateActive || !burnRateOrigin) {
      return;
    }
    const interval = setInterval(() => {
      setBurnRateWave((prev) => prev + 1);
    }, 250);
    return () => clearInterval(interval);
  }, [burnRateActive, burnRateOrigin]);

  useEffect(() => {
    if (!burnRateActive || !burnRateOrigin) {
      setBurningCells(new Set());
      return;
    }

    const next = new Set<string>();
    let maxDistance = 0;
    for (let r = burnRateOrigin.row; r < NUM_ROWS; r += 1) {
      for (let c = burnRateOrigin.col; c < NUM_COLUMNS; c += 1) {
        const distance = r - burnRateOrigin.row + (c - burnRateOrigin.col);
        if (distance < 0) continue;
        if (distance <= burnRateWave) {
          next.add(`${r}-${c}`);
        }
        if (distance > maxDistance) {
          maxDistance = distance;
        }
      }
    }

    setBurningCells(next);

    if (burnRateWave > maxDistance) {
      // Animation has reached beyond the furthest cell; clean up.
      setBurnRateActive(false);
      setBurnRateWave(0);
      setBurningCells(new Set());
      setBurnRateOrigin(null);
      setBurnRateOriginalValue(null);
    }
  }, [burnRateActive, burnRateOrigin, burnRateWave, burnRateOriginalValue]);

  const computedGrid: string[][] = React.useMemo(() => {
    return spreadsheetState.map((rowValues, rowIdx) =>
      rowValues.map((raw, colIdx) => {
        const trimmed = raw.trim();

        if (trimmed.toUpperCase() === '=BURNRATE()') {
          if (!burnRateActive && !burnRateOrigin) {
            setBurnRateActive(true);
            setBurnRateOrigin({ row: rowIdx, col: colIdx });
            setBurnRateWave(0);
            setBurnRateOriginalValue(spreadsheetState[rowIdx][colIdx]);
          }

          if (!burnRateActive && burnRateOriginalValue !== null) {
            const intermediateOriginal = burnRateOriginalValue;
            if (intermediateOriginal.startsWith('#')) {
              return intermediateOriginal;
            }
            if (intermediateOriginal === '' || !isNumeric(intermediateOriginal)) {
              return intermediateOriginal;
            }
            return formatCurrency(intermediateOriginal);
          }

          return '';
        }

        let intermediate = raw;
        if (trimmed.startsWith('=')) {
          intermediate = evaluateFormula(trimmed, spreadsheetState, rowIdx, colIdx);
        }
        if (intermediate.startsWith('#')) {
          return intermediate;
        }
        if (intermediate === '' || !isNumeric(intermediate)) {
          return intermediate;
        }
        return formatCurrency(intermediate);
      }),
    );
  }, [spreadsheetState, burnRateActive, burnRateOrigin, burnRateOriginalValue]);

  return (
    <Box width="full">
      <Box marginBottom="1rem">
        {isTitleEditing ? (
          <Input
            size="sm"
            width="260px"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsTitleEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsTitleEditing(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setTitle(titleBeforeEdit);
                setIsTitleEditing(false);
              }
            }}
          />
        ) : (
          <Text
            fontSize="lg"
            fontWeight="semibold"
            color={title ? 'gray.800' : 'gray.400'}
            cursor="text"
            onClick={() => {
              setTitleBeforeEdit(title);
              setIsTitleEditing(true);
            }}
          >
            {title || 'Untitled Spreadsheet'}
          </Text>
        )}
      </Box>
      <Box
        width="full"
        overflowX="auto"
        onKeyDown={handleKeyDown}
        ref={gridRef}
        tabIndex={-1} // Makes the Box focusable
        _focus={{ outline: 'none' }} // Removes the default focus ring
      >
        {/* Header Row */}
        <Flex>
          {/* Corner Cell */}
          <Box w="50px" minH="32px" bg="#f8f9fa" border="1px solid #dadce0" />
          {_.times(NUM_COLUMNS, (colIdx) => (
            <ColumnLabel
              key={colIdx}
              label={getColumnLabel(colIdx)}
              isSelected={selectedCell.col === colIdx}
            />
          ))}
        </Flex>
        {/* Data Rows */}
        {_.times(NUM_ROWS, (rowIdx) => (
          <Flex key={rowIdx}>
            <RowLabel label={rowIdx + 1} isSelected={selectedCell.row === rowIdx} />
            {_.times(NUM_COLUMNS, (colIdx) => {
              const isSelected = selectedCell.row === rowIdx && selectedCell.col === colIdx;
              const isEditing = editingCell?.row === rowIdx && editingCell?.col === colIdx;
              const displayValue = computedGrid[rowIdx][colIdx];
              const isBurning = burningCells.has(`${rowIdx}-${colIdx}`);
              return (
                <Cell
                  key={`${rowIdx}-${colIdx}`}
                  value={spreadsheetState[rowIdx][colIdx]}
                  displayValue={displayValue}
                  editValue={isEditing ? editValue : ''}
                  isSelected={isSelected}
                  isEditing={!!isEditing}
                  isBurning={isBurning}
                  onSelect={() => {
                    if (editingCell) {
                      if (editingCell.row === rowIdx && editingCell.col === colIdx) {
                        return;
                      }
                      commitEdit();
                    }
                    setSelectedCell({ row: rowIdx, col: colIdx });
                  }}
                  onStartEdit={() => {
                    if (editingCell) commitEdit();
                    setEditingCell({ row: rowIdx, col: colIdx });
                    setEditValue(spreadsheetState[rowIdx][colIdx]);
                  }}
                  onEdit={setEditValue}
                  onCommit={commitEdit}
                  onCancel={() => setEditingCell(null)}
                  onPaste={(pasted) => {
                    // A paste action immediately sets the value and commits it.
                    setEditValue(pasted);
                    commitEdit();
                  }}
                />
              );
            })}
          </Flex>
        ))}
      </Box>
    </Box>
  );
};

export default Spreadsheet;
