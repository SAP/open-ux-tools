import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Custom' };

export const CustomChart = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Chart}
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
