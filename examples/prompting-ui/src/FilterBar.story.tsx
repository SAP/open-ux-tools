import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/FilterBar' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.FilterBar} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.FilterBar}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'filter-bar',
                    id: 'FilterBar',
                    filterChanged: 'onFilterChanged',
                    search: 'onSearch',
                    metaPath: {
                        entitySet: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                        qualifier: '@com.sap.vocabularies.UI.v1.SelectionFields'
                    }
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.FilterBar} liveValidation={false} />;
};
