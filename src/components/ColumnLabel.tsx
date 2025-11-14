import React from 'react';
import { Box } from '@chakra-ui/react';

interface ColumnLabelProps {
  label: string;
  isSelected: boolean;
}

const COLUMN_LABEL_BG = '#f8f9fa';
const SELECTED_OVERLAY = 'rgba(26, 115, 232, 0.1)';
const LABEL_TEXT = '#5f6368';

/**
 * A presentational component that renders a single column header label (e.g., "A", "B").
 * It highlights itself with a semi-transparent overlay if its column contains the selected cell.
 */
export const ColumnLabel: React.FC<ColumnLabelProps> = ({ label, isSelected }) => (
  <Box
    minW="100px"
    minH="32px"
    bg={COLUMN_LABEL_BG}
    color={LABEL_TEXT}
    fontWeight="semibold"
    fontSize="13px"
    textAlign="center"
    display="flex"
    alignItems="center"
    justifyContent="center"
    position="relative"
    border="1px solid #dadce0"
    userSelect="none"
  >
    {label}
    {isSelected && (
      <Box
        position="absolute"
        top={0}
        left={0}
        w="100%"
        h="100%"
        bg={SELECTED_OVERLAY}
        pointerEvents="none"
        borderRadius="inherit"
      />
    )}
  </Box>
);
