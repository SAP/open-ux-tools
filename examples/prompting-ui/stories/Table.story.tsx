import React from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks' };

export const Table = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} layout={PromptsLayoutType.SingleColumn} />;
};
