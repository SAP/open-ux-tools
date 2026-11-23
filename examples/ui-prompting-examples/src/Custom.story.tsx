import React from 'react';
import { PromptsType } from './utils/index.js';
import { BuildingBlockQuestions } from './BuildingBlock.js';

export default { title: 'Building Blocks/Custom' };

export const CustomChart = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Chart}
            visibleQuestions={[
                'buildingBlockData.id',
                'buildingBlockData.metaPath.entitySet',
                'buildingBlockData.metaPath.qualifier',
                'buildingBlockData.filterBar',
                'buildingBlockData.selectionMode',
                'buildingBlockData.selectionChange',
                'buildingBlockData.metaPath.bindingContextType'
            ]}
        />
    );
};
