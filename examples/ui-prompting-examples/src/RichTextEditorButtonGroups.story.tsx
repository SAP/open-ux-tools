import React from 'react';
import { PromptsType } from './utils/index.js';
import { BuildingBlockQuestions } from './BuildingBlock.js';

export default { title: 'Building Blocks/RichTextEditorButtonGroups' };

export const Default = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} />;
};

export const ExternalValues = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} externalAnswers={{}} />;
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} liveValidation={false} />;
};
