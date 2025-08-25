import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/Page' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Page} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Page}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'page',
                    id: 'customer-overview-page-id',
                    title: 'Customer Overview',
                    description: 'Shows customer details and statistics'
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.Page} liveValidation={false} />;
};
