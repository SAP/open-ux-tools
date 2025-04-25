import type { ChangeDefinition } from 'sap/ui/fl/Change';

export const ADD_NEW_ANNOTATION_FILE_CHANGE = 'appdescr_app_addAnnotationsToOData';
export const RENAME_CHANGE = 'rename';
export const MOVE_CHANGE = 'moveControls';
export type GenericChange = NewAnnotationFileChange | RenameChange | MoveControlsChange;
interface BaseChange extends ChangeDefinition {
    creation: string;
}
export interface RenameChange  extends BaseChange {
    changeType: typeof RENAME_CHANGE;
    texts: {
        newText: {
            value: string;
            type: string;
        };
    };
}

export interface NewAnnotationFileChange extends BaseChange {
    changeType: typeof ADD_NEW_ANNOTATION_FILE_CHANGE;
    content: {
        dataSourceId: string;
        dataSource: {
            [key: string]: {
                uri: string;
            };
        };
    };
}

export interface MoveControlsChange extends BaseChange {
    changeType: typeof MOVE_CHANGE;
    content: {
        movedElements: {
            selector: {
                id: string;
            };
            sourceIndex: string;
            targetIndex: string;
        }[];
        target: {
            selector: {
                id: string;
            };
        };
    };
}

//: GenericChangeMap
export const GENERIC_CHANGE_HANDLER: {
    [key: string]: (change: GenericChange) => {
        changeTitle: string;
        controlId?: string;
        genericProps: Record<string, { i18nDisplayKey: string; value: string }>;
    };
} = {
    [ADD_NEW_ANNOTATION_FILE_CHANGE]: (change) => {
        const annotationFileChange = change as NewAnnotationFileChange;
        const dataSourceId = annotationFileChange.content.dataSourceId;
        const sourceKey = Object.keys(annotationFileChange.content.dataSource)[0];
        return {
            changeTitle: 'ADD_NEW_ANNOTATION_FILE',
            genericProps: {
                dataSourceId: {
                    i18nDisplayKey: 'SERVICE_NAME',
                    value: dataSourceId
                },
                dataSourceUri: {
                    i18nDisplayKey: 'ANNOTATION_FILE_URI',
                    value: annotationFileChange.content.dataSource[sourceKey].uri
                }
            }
        };
    },
    [RENAME_CHANGE]: (change) => {
        const renameChange = change as RenameChange;
        const selectorId = renameChange.selector.id;
        return {
            changeTitle: 'RENAME_CHANGE',
            controlId: selectorId,
            genericProps: {
                selectorId: {
                    i18nDisplayKey: 'SELECTOR_ID',
                    value: selectorId
                },
                newText: {
                    i18nDisplayKey: 'NEW_VALUE',
                    value: renameChange.texts.newText.value
                },
                textClassificationType: {
                    i18nDisplayKey: 'TEXT_TYPE',
                    value: renameChange.texts.newText.type
                }
            }
        };
    },
    [MOVE_CHANGE]: (change) => {
        const moveChange = change as MoveControlsChange;
        const movedControlId = moveChange.content.movedElements[0].selector.id;
        return {
            changeTitle: 'MOVE_CONTROLS_CHANGE',
            controlId: movedControlId,
            genericProps: {
                selectorId: {
                    i18nDisplayKey: 'TARGET_CONTROL_ID',
                    value: moveChange.content.target.selector.id
                },
                moveFromIdx: {
                    i18nDisplayKey: 'MOVE_FROM_INDEX',
                    value: String(moveChange.content.movedElements[0].sourceIndex)
                },
                moveToIdx: {
                    i18nDisplayKey: 'MOVE_TO_INDEX',
                    value: String(moveChange.content.movedElements[0].targetIndex)
                },
                targetControlId: {
                    i18nDisplayKey: 'MOVED_CONTROL_ID',
                    value: movedControlId
                }
            }
        };
    }
};
