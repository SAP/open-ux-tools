import React from 'react';
import { PromptsLayoutType } from '../src/components';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Chart' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Chart} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={SupportedBuildingBlocks.Chart}
            answers={{
                id: 'Chart',
                filterBar: 'FilterBar',
                personalization: ['Item', 'Sort'],
                entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                qualifier: '@com.sap.vocabularies.UI.v1.Chart',
                selectionChange: 'onSelectionChange',
                bindingContextType: 'absolute',
                selectionMode: 'Multiple'
            }}
        />
    );
};
