import React from 'react';
import { PromptsType } from './utils/index.js';
import { BuildingBlockQuestions } from './BuildingBlock.js';

export default { title: 'Building Blocks/Page' };

export const Default = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Page}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'page',
                    id: 'customer-overview-page-id',
                    title: 'Customer Overview',
                    description: 'Shows customer details',
                    templateType: 'basic'
                }
            }}
        />
    );
};

export const FullTemplate = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.Page}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'page',
                    id: 'customer-overview-page-full-id',
                    title: 'Customer Overview',
                    description: 'Shows customer details and statistics',
                    templateType: 'full'
                }
            }}
        />
    );
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
