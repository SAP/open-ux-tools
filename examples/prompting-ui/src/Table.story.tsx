import React from 'react';
import { SupportedBuildingBlocks } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Table' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={SupportedBuildingBlocks.Table}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'table',
                    id: 'Table',
                    filterBar: 'FilterBar',
                    bindingContextType: 'absolute',
                    entity: 'C_CUSTOMER_OP_SRV.C_CustomerOPType',
                    qualifier: '@com.sap.vocabularies.UI.v1.LineItem#test',
                    type: 'GridTable',
                    selectionMode: 'Multiple',
                    header: 'Table header',
                    personalization: ['Item', 'Sort'],
                    variantManagement: ['Control'],
                    readOnly: true,
                    enableAutoColumnWidth: false,
                    enableExport: false,
                    enableFullScreen: false,
                    enablePaste: true,
                    isSearchable: false
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={SupportedBuildingBlocks.Table} liveValidation={false} />;
};
