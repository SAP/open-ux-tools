jest.mock('crypto', () => ({
    randomBytes: jest.fn()
}));

import type { Logger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import {
    addAnnotationFile,
    addXmlFragment,
    addControllerExtension,
    isAddAnnotationChange,
    isAddXMLChange,
    moduleNameContentMap,
    tryFixChange
} from '../../../src/preview/change-handler';
import type { AddXMLChange, CommonChangeProperties, AnnotationFileChange, DescriptorVariant } from '../../../src';
import * as manifestService from '../../../src/base/abap/manifest-service';
import * as helper from '../../../src/base/helper';
import * as editors from '../../../src/writer/editors';
import * as serviceWriter from '@sap-ux/odata-service-writer/dist/data/annotations';
import { addCustomSectionFragment } from '../../../src/preview/descriptor-change-handler';

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

        const projectPath = 'project/path';
        const fragmentName = 'Share';
        const change = {
            content: {
                fragmentPath: `${fragmentName}.fragment.xml`
            }
        } as unknown as AddXMLChange;
        const fragmentTemplatePath = path.join(__dirname, '../../../templates/rta/fragment.xml');
        const realTemplateContent = fs.readFileSync(fragmentTemplatePath, 'utf-8');

        beforeEach(() => {
            mockFs.exists.mockClear();
            mockFs.read.mockClear();
            mockFs.write.mockClear();
            mockLogger.info.mockClear();
            mockLogger.error.mockClear();
        });

        it('should create the XML fragment and log information if it does not exist', () => {
            mockFs.exists.mockReturnValue(false);
            mockFs.read.mockReturnValue(realTemplateContent);

            addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                targetAggregation: 'content',
                controlType: 'sampleType'
            });

            expect(mockFs.write).toHaveBeenCalled();
            expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
"<!-- Use stable and unique IDs!-->
<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>
    <!-- controlType: sampleType -->
    <!-- targetAggregation: content --> 
    <!--  add your xml here -->

</core:FragmentDefinition>
"
`);
            expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
        });

        it('should log an error if the XML fragment creation fails', () => {
            mockFs.exists.mockReturnValue(false);
            mockFs.write.mockImplementation(() => {
                throw new Error('Write failed');
            });
            mockFs.read.mockReturnValue(realTemplateContent);

            addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                targetAggregation: 'content',
                controlType: 'sampleType'
            });

            expect(mockFs.write).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(`Failed to create XML Fragment "${fragmentName}.fragment.xml"`)
            );
        });

        describe('custom fragments', () => {
            beforeAll(() => {
                mockFs.write.mockReset();
            });
            beforeEach(() => {
                jest.spyOn(crypto, 'randomBytes').mockImplementation((size: number) => Buffer.from('0'.repeat(size)));
            });
            it('should create Object Page custom section fragment', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.objectPageSection %>"
id="<%- ids.objectPageSubSection %>"
id="<%- ids.hBox %>"`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `OBJECT_PAGE_CUSTOM_SECTION`
                });

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

            it('should create Object Page header field fragment', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.vBoxContainer %>"
id="<%- ids.label %>"`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `OBJECT_PAGE_HEADER_FIELD`
                });

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/common/header-field.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"vBox-30303030\\"
                    id=\\"label-30303030\\""
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom action fragment', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.toolbarActionButton %>`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `CUSTOM_ACTION`
                });

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/common/custom-action.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"btn-30303030"
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom table column fragment (V2 smart table)', () => {
                mockFs.exists.mockReturnValue(false);
                const updatedChange = {
                    ...change,
                    content: {
                        ...change.content,
                        index: 1
                    }
                } as unknown as AddXMLChange;
                mockFs.read.mockReturnValue(`
id="<%- ids.column %>
id="<%- ids.columnTitle %>
id="<%- ids.customData %>
id="<%- ids.index %>
`);
                addXmlFragment(
                    projectPath,
                    updatedChange,
                    mockFs as unknown as Editor,
                    mockLogger as unknown as Logger,
                    {
                        templateName: `V2_SMART_TABLE_COLUMN`
                    }
                );

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/v2/m-table-custom-column.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"column-30303030
                    id=\\"column-title-30303030
                    id=\\"custom-data-30303030
                    id=\\"1
                    "
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom table cell fragment (V2 smart table)', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.text %>
`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `V2_SMART_TABLE_CELL`
                });

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/v2/m-table-custom-column-cell.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"cell-text-30303030
                    "
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom table column fragment (V4 smart table)', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.column %>
id="<%- ids.text %>
`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `V4_MDC_TABLE_COLUMN`
                });

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/v4/mdc-custom-column.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"column-30303030
                    id=\\"text-30303030
                    "
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            const testCases: {
                tableType: 'ANALYTICAL_TABLE_COLUMN' | 'GRID_TREE_TABLE_COLUMN';
                fragmentFileName: string;
            }[] = [
                {
                    tableType: 'ANALYTICAL_TABLE_COLUMN',
                    fragmentFileName: 'templates/rta/common/analytical-custom-column.xml'
                },
                {
                    tableType: 'GRID_TREE_TABLE_COLUMN',
                    fragmentFileName: 'templates/rta/common/grid-tree-custom-column.xml'
                }
            ];
            it.each(testCases)('should create custom table column fragment (%s table)', (testCase) => {
                mockFs.exists.mockReturnValue(false);
                const updatedChange = {
                    ...change,
                    content: {
                        ...change.content,
                        index: 1
                    }
                } as unknown as AddXMLChange;
                mockFs.read.mockReturnValue(`
id="<%- ids.column %>
id="<%- ids.label %>
id="<%- ids.text %>
id="<%- ids.customData %>
id="<%- ids.index %>
`);
                addXmlFragment(
                    projectPath,
                    updatedChange,
                    mockFs as unknown as Editor,
                    mockLogger as unknown as Logger,
                    {
                        templateName: testCase.tableType
                    }
                );

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string).replace(/\\/g, '/').endsWith(testCase.fragmentFileName)
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"column-30303030
                    id=\\"label-30303030
                    id=\\"text-30303030
                    id=\\"custom-data-30303030
                    id=\\"1
                    "
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });

            it('should create custom page action', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
id="<%- ids.customToolbarAction %>"
id="<%- ids.customActionButton %>"`);
                addXmlFragment(projectPath, change, mockFs as unknown as Editor, mockLogger as unknown as Logger, {
                    templateName: `TABLE_ACTION`
                });

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/common/v4-table-action.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/Share.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                    "
                    id=\\"toolbarAction-30303030\\"
                    id=\\"btn-30303030\\""
                `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });
        });
    });

    describe('addControllerExtension', () => {
        const mockFs = {
            read: jest.fn(),
            write: jest.fn()
        };

        const mockLogger = {
            error: jest.fn()
        };

        const rootPath = '/project/root';
        const basePath = '/project/root/webapp';
        const change = {
            content: {
                codeRef: 'controllers/MyController.js'
            }
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create a controller extension file for JavaScript', async () => {
            jest.spyOn(helper, 'isTypescriptSupported').mockReturnValue(false);
            jest.spyOn(helper, 'getVariant').mockResolvedValue({ id: 'my.namespace' } as unknown as DescriptorVariant);
            mockFs.read.mockReturnValue('<template content>');

            await addControllerExtension(
                rootPath,
                basePath,
                change as any,
                mockFs as unknown as Editor,
                mockLogger as unknown as Logger
            );

            expect(helper.isTypescriptSupported).toHaveBeenCalledWith(rootPath, mockFs);
            expect(helper.getVariant).toHaveBeenCalledWith(rootPath);
            expect(mockFs.read).toHaveBeenCalledWith(path.join(__dirname, '../../../templates/rta/controller.ejs'));
            expect(mockFs.write).toHaveBeenCalledWith(
                path.join(basePath, 'changes/coding/MyController.js'),
                '<template content>'
            );
        });

        it('should create a controller extension file for TypeScript', async () => {
            jest.spyOn(helper, 'isTypescriptSupported').mockReturnValue(true);
            jest.spyOn(helper, 'getVariant').mockResolvedValue({ id: 'my.namespace' } as unknown as DescriptorVariant);
            mockFs.read.mockReturnValue('<template content>');

            await addControllerExtension(
                rootPath,
                basePath,
                change as any,
                mockFs as unknown as Editor,
                mockLogger as unknown as Logger
            );

            expect(helper.isTypescriptSupported).toHaveBeenCalledWith(rootPath, mockFs);
            expect(helper.getVariant).toHaveBeenCalledWith(rootPath);
            expect(mockFs.read).toHaveBeenCalledWith(path.join(__dirname, '../../../templates/rta/ts-controller.ejs'));
            expect(mockFs.write).toHaveBeenCalledWith(
                path.join(basePath, 'changes/coding/MyController.ts'),
                '<template content>'
            );
        });

        it('should log an error if the controller extension creation fails', async () => {
            jest.spyOn(helper, 'isTypescriptSupported').mockReturnValue(false);
            mockFs.read.mockImplementation(() => {
                throw new Error('Read failed');
            });

            await expect(
                addControllerExtension(
                    rootPath,
                    basePath,
                    change as any,
                    mockFs as unknown as Editor,
                    mockLogger as unknown as Logger
                )
            ).rejects.toThrow('Failed to create controller extension: Read failed');

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to create controller extension "controllers/MyController.js"')
            );
        });
    });

    describe('isAddAnnotationChange', () => {
        it('should return true for change objects with changeType "addXML"', () => {
            const addAnnotationChange = {
                changeType: 'appdescr_app_addAnnotationsToOData',
                content: {
                    serviceUrl: 'test/service/mainService'
                }
            } as unknown as CommonChangeProperties;

            expect(isAddAnnotationChange(addAnnotationChange)).toBe(true);
        });

        it('should return false for change objects with a different changeType', () => {
            const addXMLChange = {
                changeType: 'addXML',
                content: {
                    fragmentPath: 'fragments/share.fragment.xml'
                }
            } as unknown as CommonChangeProperties;

            expect(isAddAnnotationChange(addXMLChange)).toBe(false);
        });

        it('should return false for change objects without a changeType', () => {
            const unknownChange = {
                content: {}
            } as unknown as CommonChangeProperties;

            expect(isAddAnnotationChange(unknownChange as any)).toBe(false);
        });
    });

    describe('addAnnotationFile', () => {
        jest.spyOn(serviceWriter, 'getAnnotationNamespaces').mockReturnValue([
            {
                namespace: 'com.sap.test.serviceorder.v0001',
                alias: 'test'
            }
        ]);
        jest.spyOn(manifestService.ManifestService, 'initMergedManifest').mockResolvedValue({
            getDataSourceMetadata: jest.fn().mockResolvedValue(`
                    <?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" xmlns="http://docs.oasis-open.org/odata/ns/edm">
    <edmx:DataServices>
        <Schema Namespace="com.sap.gateway.srvd.c_salesordermanage_sd.v0001" Alias="SAP__self">
         </Schema>
    </edmx:DataServices>
</edmx:Edmx>`),
            getManifestDataSources: jest.fn().mockReturnValue({
                mainService: {
                    type: 'OData',
                    uri: 'main/service/uri',
                    settings: {
                        annotations: ['annotation0']
                    }
                },
                annotation0: {
                    type: 'ODataAnnotation',
                    uri: `ui5://adp/project/annotation0.xml`
                },
                secondaryService: {
                    type: 'OData',
                    uri: 'secondary/service/uri',
                    settings: {
                        annotations: []
                    }
                }
            })
        } as any);
        jest.spyOn(helper, 'getVariant').mockResolvedValue({
            content: [],
            id: 'adp/project',
            layer: 'VENDOR',
            namespace: 'test',
            reference: 'adp/project'
        });
        jest.spyOn(helper, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            },
            ignoreCertErrors: false
        });
        const generateChangeSpy = jest.spyOn(editors, 'generateChange').mockResolvedValue({
            commit: jest.fn().mockResolvedValue('commited')
        } as any);
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

        const change = {
            changeType: 'appdescr_app_addAnnotationsToOData',
            content: {
                annotationsInsertPosition: `END`,
                annotations: ['annotations.annotation13434343'],
                dataSource: {
                    'annotations.annotation13434343': {
                        type: 'ODataAnnotation',
                        uri: 'test/mainService/$metadata'
                    }
                },
                dataSourceId: 'mainService'
            }
        } as unknown as AnnotationFileChange;

        beforeEach(() => {
            mockFs.exists.mockClear();
            mockFs.copy.mockClear();
            mockFs.read.mockClear();
            mockFs.write.mockClear();
            mockLogger.info.mockClear();
            mockLogger.error.mockClear();
        });

        it('should call the geneate change', async () => {
            mockFs.exists.mockReturnValue(false);

            await addAnnotationFile(
                'projectRoot/webapp',
                'projectRoot',
                change,
                mockFs as unknown as Editor,
                mockLogger as unknown as Logger,
                {} as any
            );

            expect(generateChangeSpy).toHaveBeenCalled();
        });
    });

    describe('addXmlFragmentForV4', () => {
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

        const pathOfProject = 'project/path';
        const fragmentName = ['changes', 'fragments', 'test'].join(path.sep);
        beforeEach(() => {
            mockFs.exists.mockClear();
            mockFs.copy.mockClear();
            mockFs.read.mockClear();
            mockFs.write.mockClear();
            mockLogger.info.mockClear();
            mockLogger.error.mockClear();
        });

        it('should log an error if the XML fragment creation fails', () => {
            mockFs.exists.mockReturnValue(false);
            mockFs.copy.mockImplementation(() => {
                throw new Error('Copy failed');
            });

            addCustomSectionFragment(
                pathOfProject,
                {
                    changeType: 'appdescr_fe_changePageConfiguration',
                    content: {
                        entityPropertyChange: {
                            propertyPath: 'content/body/sections/test',
                            operation: 'UPSERT',
                            propertyValue: {
                                template: 'adp.v1.changes.fragment.test'
                            }
                        }
                    }
                } as any,
                mockFs as unknown as Editor,
                mockLogger as unknown as Logger
            );

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(`Failed to create XML Fragment: Error: Fragment Path could not be determined`)
            );
        });

        describe('custom fragment', () => {
            it('should create Object Page custom section fragment', () => {
                mockFs.exists.mockReturnValue(false);
                mockFs.read.mockReturnValue(`
        id="<%- ids.hBox %>"`);
                addCustomSectionFragment(
                    pathOfProject,
                    {
                        projectId: 'adp.v1',
                        changeType: 'appdescr_fe_changePageConfiguration',
                        content: {
                            entityPropertyChange: {
                                propertyPath: 'content/body/sections/test',
                                operation: 'UPSERT',
                                propertyValue: {
                                    template: 'adp.v1.changes.fragments.test'
                                }
                            }
                        }
                    } as any,
                    mockFs as unknown as Editor,
                    mockLogger as unknown as Logger
                );

                expect(mockFs.read).toHaveBeenCalled();
                expect(
                    (mockFs.read.mock.calls[0][0] as string)
                        .replace(/\\/g, '/')
                        .endsWith('templates/rta/v4/custom-section.xml')
                ).toBe(true);

                expect(mockFs.write).toHaveBeenCalled();
                expect(mockFs.write.mock.calls[0][0].replace(/\\/g, '/')).toMatchInlineSnapshot(
                    `"project/path/changes/fragments/test.fragment.xml"`
                );
                expect(mockFs.write.mock.calls[0][1]).toMatchInlineSnapshot(`
                                "
                                        id=\\"hbox-30303030\\""
                            `);

                expect(mockLogger.info).toHaveBeenCalledWith(`XML Fragment "${fragmentName}.fragment.xml" was created`);
            });
        });
    });
});
