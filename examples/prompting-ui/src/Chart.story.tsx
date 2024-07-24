import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Chart' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Chart} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Chart}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'chart',
                    id: 'Chart',
                    filterBar: 'FilterBar',
                    personalization: ['Item', 'Sort'],
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                        qualifier: 'to_CustomerBankDetails/@com.sap.vocabularies.UI.v1.Chart#C_CustomerBankDetailsOPType'
                    },
                    selectionChange: 'onSelectionChange',
                    bindingContextType: 'absolute',
                    selectionMode: 'Multiple'
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Chart} liveValidation={false} />;
};
