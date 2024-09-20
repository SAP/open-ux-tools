import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

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
