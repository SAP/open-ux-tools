import React from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/FilterBar' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.FilterBar} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={SupportedBuildingBlocks.FilterBar}
            answers={{
                id: 'FilterBar',
                filterChanged: 'onFilterChanged',
                search: 'onSearch',
                entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                qualifier: '@com.sap.vocabularies.UI.v1.SelectionFields'
            }}
        />
    );
};
