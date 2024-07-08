import React from 'react';
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
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'filter-bar',
                    id: 'FilterBar',
                    filterChanged: 'onFilterChanged',
                    search: 'onSearch',
                    entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                    qualifier: '@com.sap.vocabularies.UI.v1.SelectionFields'
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.FilterBar} liveValidation={false} />;
};
