import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/RichTextEditor' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditor} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.RichTextEditor}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'rich-text-editor',
                    id: 'RichTextEditor',
                    metaPath: {
                        bindingContextType: 'absolute',
                        entitySet: 'C_CustomerBankDetailsOP'
                    }
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditor} liveValidation={false} />;
};
