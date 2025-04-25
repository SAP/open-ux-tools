import {
    ADD_NEW_ANNOTATION_FILE_CHANGE,
    RENAME_CHANGE,
    MOVE_CHANGE,
    GENERIC_CHANGE_HANDLER,
    GenericChange,
    NewAnnotationFileChange
} from '../../../../src/cpe/changes/generic-change';

describe('GENERIC_CHANGE_HANDLER', () => {
    it('should handle ADD_NEW_ANNOTATION_FILE_CHANGE', () => {
        const change: NewAnnotationFileChange = {
            changeType: ADD_NEW_ANNOTATION_FILE_CHANGE,
            fileName: 'file1',
            creation: '2025-03-17T12:00:00Z',
            content: {
                dataSourceId: 'dataSource1',
                dataSource: {
                    sourceKey1: {
                        uri: 'annotations/annotation1.xml'
                    }
                }
            },
            layer: 'VENDOR',
            packageName: 'package1',
            support: {
                generator: 'generator1'
            },
            selector: {
                id: 'selector1',
                idIsLocal: true
            },
            service: 'service1'
        };

        const result = GENERIC_CHANGE_HANDLER[ADD_NEW_ANNOTATION_FILE_CHANGE](change);

        expect(result).toEqual({
            changeTitle: 'ADD_NEW_ANNOTATION_FILE',
            genericProps: {
                dataSourceId: {
                    i18nDisplayKey: 'SERVICE_NAME',
                    value: 'dataSource1'
                },
                dataSourceUri: {
                    i18nDisplayKey: 'ANNOTATION_FILE_URI',
                    value: 'annotations/annotation1.xml'
                }
            }
        });
    });

    it('should handle RENAME_CHANGE', () => {
        const change = {
            changeType: RENAME_CHANGE,
            fileName: 'file2',
            creation: '2025-03-17T12:00:00Z',
            selector: {
                id: 'control1'
            },
            texts: {
                newText: {
                    value: 'New Text',
                    type: 'Type1'
                }
            }
        };

        const result = GENERIC_CHANGE_HANDLER[RENAME_CHANGE](change as GenericChange);

        expect(result).toEqual({
            changeTitle: 'RENAME_CHANGE',
            controlId: 'control1',
            genericProps: {
                selectorId: {
                    i18nDisplayKey: 'SELECTOR_ID',
                    value: 'control1'
                },
                newText: {
                    i18nDisplayKey: 'NEW_VALUE',
                    value: 'New Text'
                },
                textClassificationType: {
                    i18nDisplayKey: 'TEXT_TYPE',
                    value: 'Type1'
                }
            }
        });
    });

    it('should handle MOVE_CHANGE', () => {
        const change = {
            changeType: MOVE_CHANGE,
            fileName: 'file3',
            creation: '2025-03-17T12:00:00Z',
            content: {
                movedElements: [
                    {
                        selector: {
                            id: 'control2'
                        },
                        sourceIndex: '1',
                        targetIndex: '2'
                    }
                ],
                target: {
                    selector: {
                        id: 'targetControl1'
                    }
                }
            }
        };

        const result = GENERIC_CHANGE_HANDLER[MOVE_CHANGE](change as GenericChange);

        expect(result).toEqual({
            changeTitle: 'MOVE_CONTROLS_CHANGE',
            controlId: 'control2',
            genericProps: {
                selectorId: {
                    i18nDisplayKey: 'TARGET_CONTROL_ID',
                    value: 'targetControl1'
                },
                moveFromIdx: {
                    i18nDisplayKey: 'MOVE_FROM_INDEX',
                    value: '1'
                },
                moveToIdx: {
                    i18nDisplayKey: 'MOVE_TO_INDEX',
                    value: '2'
                },
                targetControlId: {
                    i18nDisplayKey: 'MOVED_CONTROL_ID',
                    value: 'control2'
                }
            }
        });
    });
});
