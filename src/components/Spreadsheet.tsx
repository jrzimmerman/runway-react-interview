import { Box, Flex } from '@chakra-ui/react';
import _ from 'lodash';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { ColumnLabel } from './ColumnLabel';
import { RowLabel } from './RowLabel';
import { getColumnLabel } from '../utils/spreadsheet';

const NUM_ROWS = 10;
const NUM_COLUMNS = 10;

/**
 * The Spreadsheet component is the main stateful component that maintaings the state of the
 * spreadsheet grid. It owns all state and logic for cell values, selection, and editing.
 */
const Spreadsheet: React.FC = () => {
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
      setSpreadsheetState((prev) => {
        const { row, col } = editingCell;
        const newRows = [...prev];
        newRows[row] = [...newRows[row]];
        newRows[row][col] = editValue;
        return newRows;
      });
      setEditingCell(null);
      // A timeout is used to reset the committing flag. This is a micro-task that
      // ensures other events in the current event loop (like blur) can resolve
      // before we allow another commit. Thanks micro event loop :)
      setTimeout(() => setIsCommitting(false), 0);
    }
  }, [editingCell, editValue, isCommitting]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Prevent new actions while a commit is in progress to avoid race conditions.
      if (isCommitting) return;

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
            move(e.shiftKey ? -1 : 1, 0);
            break;
          case 'Tab':
            e.preventDefault();
            move(0, e.shiftKey ? -1 : 1);
            break;
          case 'Escape':
            e.preventDefault();
            setEditingCell(null);
            break;
          // Arrow keys in edit mode should commit the edit and then navigate.
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
    [commitEdit, editingCell, selectedCell, spreadsheetState, isCommitting],
  );

  // This `useEffect` hook manages focus. When the user is not editing, we want
  // the main grid container to be focused so it can receive keyboard events.
  // This is a key part of the keyboard navigation strategy.
  useEffect(() => {
    if (!editingCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [selectedCell, editingCell]);

  return (
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
            return (
              <Cell
                key={`${rowIdx}-${colIdx}`}
                value={spreadsheetState[rowIdx][colIdx]}
                editValue={isEditing ? editValue : ''}
                isSelected={isSelected}
                isEditing={!!isEditing}
                onSelect={() => {
                  if (editingCell) commitEdit();
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
  );
};

export default Spreadsheet;
