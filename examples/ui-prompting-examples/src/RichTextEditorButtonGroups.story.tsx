import React from 'react';
import { PromptsType } from './utils';
import { BuildingBlockQuestions } from './BuildingBlock';

export default { title: 'Building Blocks/RichTextEditorButtonGroups' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} />;
};

export const ExternalValues = (): JSX.Element => {
    return (
        <BuildingBlockQuestions
            type={PromptsType.RichTextEditorButtonGroups}
            externalAnswers={{
                buildingBlockData: {
                    buildingBlockType: 'rich-text-editor-button-groups',
                    id: 'RichTextEditorButtonGroups',
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} liveValidation={false} />;
};
