import { getTextBundle } from '../../../../src/i18n';
import {
    ADD_NEW_ANNOTATION_FILE_CHANGE,
    RENAME_CHANGE,
    MOVE_CHANGE,
    GENERIC_CHANGE_HANDLER,
    NewAnnotationFileChange,
    MoveControlsChange,
    RenameChange
} from '../../../../src/cpe/changes/generic-change';

describe('GENERIC_CHANGE_HANDLER', () => {
    let bundle: any;
    beforeAll(async () => {
        bundle = await getTextBundle();
    });
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

        const result = GENERIC_CHANGE_HANDLER[ADD_NEW_ANNOTATION_FILE_CHANGE](change, { textBundle: bundle } as any);

        expect(result).toEqual({
            changeTitle: 'Add New Annotation File',
            changeType: 'configuration',
            properties: [
                {
                    label: 'SERVICE NAME',
                    value: 'dataSource1'
                },
                {
                    label: 'ANNOTATION FILE',
                    value: 'annotations/annotation1.xml'
                }
            ]
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
                    value: 'NEW TEXT',
                    type: 'Type1'
                }
            }
        };

        const result = GENERIC_CHANGE_HANDLER[RENAME_CHANGE](change as RenameChange, { textBundle: bundle } as any);

        expect(result).toEqual({
            changeTitle: 'Rename Control',
            controlId: 'control1',
            properties: [
                {
                    label: 'SELECTOR ID',
                    value: 'control1'
                },
                {
                    label: 'NEW VALUE',
                    value: 'NEW TEXT'
                },
                {
                    label: 'TEXT TYPE',
                    value: 'Type1'
                }
            ]
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

        const result = GENERIC_CHANGE_HANDLER[MOVE_CHANGE](change as MoveControlsChange, { textBundle: bundle } as any);

        expect(result).toEqual({
            changeTitle: 'Move Controls',
            controlId: 'control2',
            properties: [
                {
                    label: 'TARGET ID',
                    value: 'targetControl1'
                },
                {
                    label: 'MOVE FROM',
                    value: '1'
                },
                {
                    label: 'MOVE TO',
                    value: '2'
                },
                {
                    label: 'CONTROL ID',
                    value: 'control2'
                }
            ]
        });
    });
});
