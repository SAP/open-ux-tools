jest.mock('crypto', () => ({
    randomBytes: jest.fn()
}));

import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import * as crypto from 'crypto';

import {
    addXmlFragment,
    isAddXMLChange,
    moduleNameContentMap,
    tryFixChange
} from '../../../src/preview/change-handler';
import type { AddXMLChange, CommonChangeProperties } from '../../../src';

describe('change-handler', () => {
    describe('moduleNameContentMap', () => {
        it('should extract the codeRef without .js extension', () => {
            const change = {
                content: {
                    codeRef: 'coding/share.js'
                }
            };

            const result = moduleNameContentMap.codeExt(change as unknown as CommonChangeProperties);
            expect(result).toBe('coding/share');
        });

        it('should return an empty string if codeRef is undefined', () => {
            const change = {
                content: {}
            };

            const result = moduleNameContentMap.codeExt(change as unknown as CommonChangeProperties);
            expect(result).toBe('');
        });

        it('should return the fragmentPath', () => {
            const change = {
                content: {
                    fragmentPath: 'fragments/share.fragment.xml'
                }
            };

            const result = moduleNameContentMap.addXML(change as unknown as CommonChangeProperties);
            expect(result).toBe(change.content.fragmentPath);
        });

        it('should return an empty string if fragmentPath is undefined', () => {
            const change = {
                content: {}
            };

            const result = moduleNameContentMap.addXML(change as unknown as CommonChangeProperties);
            expect(result).toBe('');
        });
    });

    describe('tryFixChange', () => {
        const mockLogger = {
            warn: jest.fn()
        };

        beforeEach(() => {
            mockLogger.warn.mockClear();
        });

        it('should correctly update moduleName for a valid change', () => {
            const change = {
                reference: 'some.reference.path',
                changeType: 'codeExt',
                content: {
                    codeRef: 'coding/share.js'
                }
            } as unknown as CommonChangeProperties;

            tryFixChange(change, mockLogger as unknown as Logger);

            expect(change.moduleName).toBe('some/reference/path/changes/coding/share');
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should log a warning if changeType is not recognized', () => {
            const change = {
                reference: 'some.reference.path',
                changeType: 'unknownType'
            } as unknown as CommonChangeProperties;

            tryFixChange(change, mockLogger as unknown as Logger);

            expect(mockLogger.warn).toHaveBeenCalledWith('Could not fix missing module name.');
        });
    });

    describe('isAddXMLChange', () => {
        it('should return true for change objects with changeType "addXML"', () => {
            const addXMLChange = {
                changeType: 'addXML',
                content: {
                    fragmentPath: 'fragments/share.fragment.xml'
                }
            } as unknown as CommonChangeProperties;

            expect(isAddXMLChange(addXMLChange)).toBe(true);
        });

        it('should return false for change objects with a different changeType', () => {
            const codeExtChange = {
                changeType: 'codeExt',
                content: {
                    codeRef: 'coding/share.js'
                }
            } as unknown as CommonChangeProperties;

            expect(isAddXMLChange(codeExtChange)).toBe(false);
        });

        it('should return false for change objects without a changeType', () => {
            const unknownChange = {
                content: {}
            } as unknown as CommonChangeProperties;

            expect(isAddXMLChange(unknownChange as any)).toBe(false);
        });
    });

    describe('addXmlFragment', () => {
        const mockFs = {
            exists: jest.fn(),
            copy: jest.fn(),
            read: jest.fn(),
            write: jest.fn()
        };

        const mockLogger = {
            info: jest.fn(),
            error: jest.fn()
        };

        const path = 'project/path';
        const fragmentName = 'Share';
        const change = {
            content: {
                fragmentPath: `${fragmentName}.fragment.xml`
            }
        } as unknown as AddXMLChange;

        beforeEach(() => {
            mockFs.exists.mockClear();
            mockFs.copy.mockClear();
            mockFs.read.mockClear();
            mockFs.write.mockClear();
            mockLogger.info.mockClear();
            mockLogger.error.mockClear();
        });

        it('should create the XML fragment and log information if it does not exist', () => {
            mockFs.exists.mockReturnValue(false);

            addXmlFragment(path, change, mockFs as unknown as Editor, mockLogger as unknown as Logger);

            expect(mockFs.copy).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
        });

        it('should log an error if the XML fragment creation fails', () => {
            mockFs.exists.mockReturnValue(false);
            mockFs.copy.mockImplementation(() => {
                throw new Error('Copy failed');
            });

            addXmlFragment(path, change, mockFs as unknown as Editor, mockLogger as unknown as Logger);

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(`Failed to create XML Fragment "${fragmentName}.fragment.xml"`)
            );
        });

        describe('custom fragments', () => {
            beforeEach(() => {
                jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => Buffer.from('0'.repeat(size)));
            });
            it('should create Object Page custom section fragment', () => {
                mockFs.exists.mockReturnValue(false);
                const updatedChange = {
                    ...change,
                    content: {
                        ...change.content,
                        templateName: `OBJECT_PAGE_CUSTOM_SECTION`
                    }
                } as unknown as AddXMLChange;
                mockFs.read.mockReturnValue(`
id="<%- ids.objectPageSection %>"
id="<%- ids.objectPageSubSection %>"
id="<%- ids.hBox %>"`);
                addXmlFragment(path, updatedChange, mockFs as unknown as Editor, mockLogger as unknown as Logger);

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/common/op-custom-section.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                        "
                        id=\\"op-section-30303030\\"
                        id=\\"op-subsection-30303030\\"
                        id=\\"hbox-30303030\\""
                    `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom action fragment', () => {
                mockFs.exists.mockReturnValue(false);
                const updatedChange = {
                    ...change,
                    content: {
                        ...change.content,
                        templateName: `CUSTOM_ACTION`
                    }
                } as unknown as AddXMLChange;
                mockFs.read.mockReturnValue(`
id="<%- ids.toolbarActionButton %>`);
                addXmlFragment(path, updatedChange, mockFs as unknown as Editor, mockLogger as unknown as Logger);

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/common/custom-action.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(`"project/path/changes/Share.fragment.xml"`);
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
"
id=\\"btn-30303030"
`);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });
        });
    });
});
