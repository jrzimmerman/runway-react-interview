import { ChakraProvider, Flex } from '@chakra-ui/react';
import React from 'react';

import Spreadsheet from 'components/Spreadsheet';

const App: React.FC = () => {
  return (
    <ChakraProvider resetCSS>
      <Flex direction="column" padding="1rem">
        <Spreadsheet />
      </Flex>
    </ChakraProvider>
  );
};

export default App;
