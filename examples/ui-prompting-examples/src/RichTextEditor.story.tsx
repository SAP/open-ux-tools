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
                    },
                    buttonGroup: {
                        name: 'edit-actions',
                        buttons: 'copy,paste,undo,redo',
                        visible: false,
                        priority: 20,
                        customToolbarPriority: 5,
                        row: 2
                    }
                }
            }}
        />
    );
};

export const WithoutLiveValidation = (): JSX.Element => {
    return <BuildingBlockQuestions type={PromptsType.RichTextEditor} liveValidation={false} />;
};
