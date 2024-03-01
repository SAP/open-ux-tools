import React from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Table' };

export const singleColumn = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} layout={PromptsLayoutType.SingleColumn} />;
};

export const multiColumn = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} layout={PromptsLayoutType.MultiColumn} />;
};
