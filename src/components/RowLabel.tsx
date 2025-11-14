import React from 'react';
import { Box } from '@chakra-ui/react';

interface RowLabelProps {
  label: number;
  isSelected: boolean;
}

const ROW_LABEL_BG = '#f8f9fa';
const SELECTED_OVERLAY = 'rgba(26, 115, 232, 0.1)';
const LABEL_TEXT = '#5f6368';

/**
 * A presentational component that renders a single row header label (e.g., "1", "2").
 * It highlights itself with a semi-transparent overlay if its row contains the selected cell.
 */
export const RowLabel: React.FC<RowLabelProps> = ({ label, isSelected }) => (
  <Box
    w="50px"
    minH="32px"
    bg={ROW_LABEL_BG}
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
