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
                    id: 'RichTextEditorButtonGroups'
                    // buttonGroups: [
                    //     { name: "font-style", value: "font-style", checked: true },
                    //     { name: "clipboard", value: "clipboard", checked: true },
                    //     { name: "font", value: "font", checked: true },
                    //     { name: "undo", value: "undo", checked: true, hidden: true },
                    //     { name: "insert", value: "insert", checked: true },
                    //     { name: "structure", value: "structure", checked: true }
                    // ]
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditorButtonGroups} liveValidation={false} />;
};
