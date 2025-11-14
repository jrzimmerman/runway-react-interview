import React, { useRef, useEffect } from 'react';
import { Box, Input, Text } from '@chakra-ui/react';
import { isNumeric } from '../utils/spreadsheet';

interface CellProps {
  value: string;
  displayValue: string;
  editValue: string;
  isSelected: boolean;
  isEditing: boolean;
  isBurning: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onEdit: (newValue: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onPaste: (pastedValue: string) => void;
}

const CELL_BG = '#fff';
const BURNING_BG = 'linear-gradient(135deg, #ffe082, #ff7043)';
const SELECTED_BORDER = '2px solid #1a73e8';
const DEFAULT_BORDER = '1px solid #dadce0';
const CELL_TEXT = '#202124';

/**
 * The Cell component is a controlled, presentational component that handles rendering
 * a single cell in the spreadsheet. It can be in one of two modes:
 * 1. Display Mode: Shows the formatted value (e.g., as currency).
 * 2. Edit Mode: Shows a raw input field for the user to type in.
 *
 * All state is managed by the parent `Spreadsheet` component.
 */
export const Cell: React.FC<CellProps> = ({
  displayValue,
  editValue,
  isSelected,
  isEditing,
  isBurning,
  onSelect,
  onStartEdit,
  onEdit,
  onCommit,
  onCancel,
  onPaste,
}) => {
  // `useRef` is used to get a direct reference to the input DOM element.
  // This is necessary for programmatically focusing the input when a cell enters edit mode.
  const inputRef = useRef<HTMLInputElement>(null);

  // `useEffect` synchronizes the component with an external system (the DOM).
  // Here, it's used to focus the input field whenever the cell transitions
  // into `isEditing` mode. We intentionally avoid selecting all text so that
  // mouse clicks can place the caret at a specific position inside formulas.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    onPaste(pasted);
  };

  // This keydown handler is specific to the input field when editing.
  // It only handles the 'Escape' key to cancel the edit. All other
  // navigation keys are handled by the parent `Spreadsheet` component.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const effectiveDisplay = isEditing ? editValue : displayValue;

  return (
    <Box
      w="100px"
      h="32px"
      bg={isBurning ? BURNING_BG : CELL_BG}
      color={CELL_TEXT}
      fontSize="14px"
      display="flex"
      alignItems="stretch"
      border={isSelected ? SELECTED_BORDER : DEFAULT_BORDER}
      boxSizing="border-box"
      p={0}
      position="relative"
      onClick={onSelect}
      onDoubleClick={onStartEdit}
    >
      {isEditing ? (
        <Box flex="1" h="100%" display="flex" alignItems="center" px="8px">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => onEdit(e.target.value)}
            onBlur={onCommit}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            borderRadius={0}
            w="100%"
            h="24px"
            fontSize="14px"
            color={CELL_TEXT}
            bg="transparent"
            p={0}
            border="none"
            boxShadow="none"
            _focus={{ boxShadow: 'none' }}
          />
        </Box>
      ) : (
        <Text
          px="8px"
          py="5px"
          w="100%"
          h="100%"
          textAlign={isNumeric(effectiveDisplay) ? 'right' : 'left'}
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {effectiveDisplay}
        </Text>
      )}
    </Box>
  );
};
