import React from 'react';
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
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'chart',
                    id: 'Chart',
                    filterBar: 'FilterBar',
                    personalization: ['Item', 'Sort'],
                    entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                    qualifier: '@com.sap.vocabularies.UI.v1.Chart',
                    selectionChange: 'onSelectionChange',
                    bindingContextType: 'absolute',
                    selectionMode: 'Multiple'
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Chart} liveValidation={false} />;
};
