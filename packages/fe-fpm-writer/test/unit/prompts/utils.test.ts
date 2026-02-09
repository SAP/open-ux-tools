import { getAnswer } from '../../../src/prompts/utils';
import { getExistingButtonGroups } from '../../../src/building-block/prompts/utils/xml';
import type { MemFsEditor as Editor } from 'mem-fs-editor';

describe('Prompts', () => {
    describe('getAnswer', () => {
        const originalObject = {
            test: {
                dummy1: {
                    dummy1_2: 1
                },
                dummy2: 2
            },
            test2: 3
        };
        const testObject = JSON.parse(JSON.stringify(originalObject));
        const testCases = [
            {
                name: 'Read value on deep level - value exists',
                path: 'test.dummy1.dummy1_2',
                expectedValue: 1
            },
            {
                name: 'Read value on first level - value exists',
                path: 'test2',
                expectedValue: 3
            },
            {
                name: 'Read value on deep level - path does not exist',
                path: 'test404.dummy1.dummy1_2',
                expectedValue: undefined
            },
            {
                name: 'Read value on first level - path does not exist',
                path: 'test404',
                expectedValue: undefined
            }
        ];
        test.each(testCases)('$name', async ({ path, expectedValue }) => {
            expect(getAnswer(testObject, path)).toEqual(expectedValue);
            // Avoid mutation
            expect(testObject).toStrictEqual(originalObject);
        });
    });

    describe('getExistingButtonGroups', () => {
        let mockFs: jest.Mocked<Editor>;

        beforeEach(() => {
            mockFs = {
                read: jest.fn()
            } as any;
        });

        it('should return empty set when XML file does not contain RTE element', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros">
                    <Page title="Test">
                        <content>
                            <Text text="No RTE here" />
                        </content>
                    </Page>
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            const result = await getExistingButtonGroups('/path/to/view.xml', '/path', mockFs);

            expect(result).toEqual(new Set());
            expect(mockFs.read).toHaveBeenCalledWith('/path/to/view.xml');
        });

        it('should return empty set when RTE element exists but has no buttonGroups', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                    <macros:RichTextEditor id="rte1" />
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            const result = await getExistingButtonGroups('/path/to/view.xml', '/path/macros:RichTextEditor', mockFs);

            expect(result).toEqual(new Set());
        });

        it('should return empty set when buttonGroups element exists but has no ButtonGroup children', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                    <macros:RichTextEditor id="rte1">
                        <macros:buttonGroups />
                    </macros:RichTextEditor>
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            const result = await getExistingButtonGroups('/path/to/view.xml', '/path/macros:RichTextEditor', mockFs);

            expect(result).toEqual(new Set());
        });

        it('should return set with single button group name', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                    <macros:RichTextEditor id="rte1">
                        <macros:buttonGroups>
                            <macros:ButtonGroup name="font-style" />
                        </macros:buttonGroups>
                    </macros:RichTextEditor>
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            const result = await getExistingButtonGroups(
                '/path/to/view.xml',
                '/*[local-name()="FragmentDefinition"]/*[local-name()="RichTextEditor"]',
                mockFs
            );

            expect(result).toEqual(new Set(['font-style']));
        });

        it('should return set with multiple button group names', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                    <macros:RichTextEditor id="rte1">
                        <macros:buttonGroups>
                            <macros:ButtonGroup name="formatting" />
                            <macros:ButtonGroup name="alignment" />
                            <macros:ButtonGroup name="lists" />
                        </macros:buttonGroups>
                    </macros:RichTextEditor>
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            const result = await getExistingButtonGroups(
                '/path/to/view.xml',
                '/*[local-name()="FragmentDefinition"]/*[local-name()="RichTextEditor"]',
                mockFs
            );

            expect(result).toEqual(new Set(['formatting', 'alignment', 'lists']));
        });

        it('should throw error ButtonGroup elements without name attribute is present', async () => {
            const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
                <core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                    <macros:RichTextEditor id="rte1">
                        <macros:buttonGroups>
                            <macros:ButtonGroup name="formatting" />
                            <macros:ButtonGroup />
                            <macros:ButtonGroup name="alignment" />
                        </macros:buttonGroups>
                    </uxap:RichTextEditor>
                </core:FragmentDefinition>`;
            (mockFs.read as jest.Mock).mockReturnValue(xmlContent);

            await expect(
                getExistingButtonGroups(
                    '/path/to/view.xml',
                    '/*[local-name()="FragmentDefinition"]/*[local-name()="RichTextEditor"]',
                    mockFs
                )
            ).rejects.toThrow('An error occurred while reading button groups');
        });
    });
});
