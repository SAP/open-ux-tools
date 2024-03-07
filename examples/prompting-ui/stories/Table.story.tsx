import React, { useState } from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';
import { UISmallButton } from '@sap-ux/ui-components';

export default { title: 'Building Blocks/Table' };

export const singleColumn = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} layout={PromptsLayoutType.SingleColumn} />;
};

export const multiColumn = (): JSX.Element => {
    const [showDescriptions, setShowDescriptions] = useState(true);
    const toggle = (): void => {
        setShowDescriptions(!showDescriptions);
    };
    return (
        <>
            <UISmallButton onClick={toggle}>
                {showDescriptions ? 'Hide descriptions' : 'Show descriptions'}
            </UISmallButton>
            <BuildingBlockQuestions
                type={SupportedBuildingBlocks.Table}
                layout={PromptsLayoutType.MultiColumn}
                showDescriptions={showDescriptions}
            />
        </>
    );
};
