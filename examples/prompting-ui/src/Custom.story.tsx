import React from 'react';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Custom' };

export const customChart = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={SupportedBuildingBlocks.Chart}
            visibleQuestions={[
                'id',
                'entity',
                'qualifier',
                'filterBar',
                'selectionMode',
                'selectionChange',
                'bindingContextType'
            ]}
        />
    );
};

