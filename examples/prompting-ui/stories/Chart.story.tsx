import React from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks' };

export const Chart = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Chart} layout={PromptsLayoutType.SingleColumn} />;
};
