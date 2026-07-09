import type { ApplicationModel, TreeAggregation } from '@sap/ux-specification/dist/types/src/parser';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type { Logger } from '@sap-ux/logger';
import { getObjectPageFeatures } from '../../../src/utils/objectPageUtils.js';
import type { ObjectPageFeatures, HeaderSectionFeatureData } from '../../../src/types.js';

describe('Test getObjectPageFeatures()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should return empty array when no pages exist', async () => {
        const pages: PageWithModelV4[] = [];
        const result = await getObjectPageFeatures(pages, undefined, mockLogger);
        expect(result).toEqual([]);
    });

    test('should return empty array when no ObjectPage pages exist', async () => {
        const pages: PageWithModelV4[] = [];
        const result = await getObjectPageFeatures(pages, undefined, mockLogger);
        expect(result).toEqual([]);
    });

    test('should log warning when no ObjectPage pages exist', async () => {
        await getObjectPageFeatures([], undefined, mockLogger);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.'
        );
    });

    test('should return single ObjectPage feature data when it exists', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('objectPage1');
        expect(result[0].headerSections).toEqual([]);
    });

    test('should return multiple ObjectPages when they exist', async () => {
        const objectPage1 = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage2 = {
            name: 'objectPage2',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures(
            [objectPage1, objectPage2] as PageWithModelV4[],
            undefined,
            mockLogger
        );
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('objectPage1');
        expect(result[1].name).toBe('objectPage2');
    });

    test('should extract navigation parents with ListReport parent', async () => {
        const listReportPage = {
            name: 'listReportPage',
            pageType: 'ListReport',
            model: {
                root: {} as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result).toHaveLength(1);
        expect(result[0].navigationParents).toBeDefined();
        expect(result[0].navigationParents?.parentLRName).toBe('listReportPage');
    });

    test('should extract navigation parents with ObjectPage parent', async () => {
        const listReportPage = {
            name: 'listReportPage',
            pageType: 'ListReport',
            model: {
                root: {} as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage1 = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            navigation: {
                tableSection1: 'objectPage2'
            },
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage2 = {
            name: 'objectPage2',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                listReportPage,
                objectPage1,
                objectPage2
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures(
            [objectPage1, objectPage2] as PageWithModelV4[],
            'listReportPage',
            mockLogger
        );
        expect(result).toHaveLength(2);
        const objectPage2Data = result.find((page) => page.name === 'objectPage2');
        expect(objectPage2Data?.navigationParents).toBeDefined();
        expect(objectPage2Data?.navigationParents?.parentLRName).toBe('listReportPage');
        expect(objectPage2Data?.navigationParents?.parentOPName).toBe('objectPage1');
        expect(objectPage2Data?.navigationParents?.parentOPTableSection).toBe('tableSection1');
    });

    test('should handle navigation with route object', async () => {
        const listReportPage = {
            name: 'listReportPage',
            pageType: 'ListReport',
            model: {
                root: {} as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage1 = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            navigation: {
                tableSection1: {
                    route: 'objectPage2'
                }
            },
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage2 = {
            name: 'objectPage2',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                listReportPage,
                objectPage1,
                objectPage2
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures(
            [objectPage1, objectPage2] as PageWithModelV4[],
            'listReportPage',
            mockLogger
        );
        const objectPage2Data = result.find((page) => page.name === 'objectPage2');
        expect(objectPage2Data?.navigationParents?.parentOPName).toBe('objectPage1');
        expect(objectPage2Data?.navigationParents?.parentOPTableSection).toBe('tableSection1');
    });

    test('should extract header sections with facetId from Key', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Section 1',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'facet1' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result).toHaveLength(1);
        expect(result[0].headerSections).toHaveLength(1);
        expect(result[0].headerSections?.[0].facetId).toBe('facet1');
        expect(result[0].headerSections?.[0].title).toBe('Section 1');
        expect(result[0].headerSections?.[0].custom).toBe(false);
        expect(result[0].headerSections?.[0].stashed).toBe(false);
    });

    test('should extract header sections with facetId containing # replaced with ::', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Section 1',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'namespace#facet1' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].facetId).toBe('namespace::facet1');
    });

    test('should extract header sections with facetId from title when ID not found', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'i18n>sectionTitle.facet1',
                                            custom: false,
                                            schema: {
                                                keys: [],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].facetId).toBe('facet1');
    });

    test('should handle title with # replaced with ::', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'i18n>sectionTitle.namespace#facet1',
                                            custom: false,
                                            schema: {
                                                keys: [],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].facetId).toBe('namespace::facet1');
    });

    test('should skip section without identifier', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            custom: false,
                                            schema: {
                                                keys: [],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections).toEqual([]);
    });

    test('should identify microChart sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Chart Section',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'chartFacet' }],
                                                dataType: 'ChartDefinition'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].microChart).toBe(true);
        expect(result[0].headerSections?.[0].form).toBe(false);
    });

    test('should identify form sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Form Section',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'formFacet' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {
                                                form: {
                                                    schema: {
                                                        keys: [
                                                            {
                                                                name: 'Target',
                                                                value: 'EntityType#FieldGroup1'
                                                            }
                                                        ]
                                                    },
                                                    aggregations: {
                                                        fields: {
                                                            aggregations: {}
                                                        } as unknown as TreeAggregation
                                                    } as unknown as TreeAggregation
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].form).toBe(true);
        expect(result[0].headerSections?.[0].microChart).toBe(false);
        expect(result[0].headerSections?.[0].fields).toEqual([]);
    });

    test('should extract form fields with field group qualifier', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Form Section',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'formFacet' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {
                                                form: {
                                                    schema: {
                                                        keys: [
                                                            {
                                                                name: 'Target',
                                                                value: 'EntityType#FieldGroup1'
                                                            }
                                                        ]
                                                    },
                                                    aggregations: {
                                                        fields: {
                                                            aggregations: {
                                                                field1: {
                                                                    name: 'field1',
                                                                    schema: {
                                                                        keys: [
                                                                            {
                                                                                name: 'Value',
                                                                                value: 'fieldValue1'
                                                                            }
                                                                        ]
                                                                    }
                                                                } as unknown as TreeAggregation,
                                                                field2: {
                                                                    name: 'field2',
                                                                    schema: {
                                                                        keys: [
                                                                            {
                                                                                name: 'Value',
                                                                                value: 'fieldValue2'
                                                                            }
                                                                        ]
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            }
                                                        } as unknown as TreeAggregation
                                                    } as unknown as TreeAggregation
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].fields).toHaveLength(2);
        expect(result[0].headerSections?.[0].fields?.[0]).toEqual({
            fieldGroupQualifier: 'FieldGroup1',
            field: 'fieldValue1'
        });
        expect(result[0].headerSections?.[0].fields?.[1]).toEqual({
            fieldGroupQualifier: 'FieldGroup1',
            field: 'fieldValue2'
        });
    });

    test('should handle stashed as string', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Section 1',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'facet1' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: "{= ${ui>/editMode} === 'Editable' }"
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].stashed).toBe("{= ${ui>/editMode} === 'Editable' }");
    });

    test('should handle custom sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Custom Section',
                                            custom: true,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'customFacet' }],
                                                dataType: 'Custom'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].custom).toBe(true);
    });

    test('should handle multiple header sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Section 1',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'facet1' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: { freeText: false }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation,
                                        section2: {
                                            title: 'Section 2',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'facet2' }],
                                                dataType: 'ChartDefinition'
                                            },
                                            properties: {
                                                stashed: { freeText: true }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation,
                                        section3: {
                                            title: 'Section 3',
                                            custom: true,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'facet3' }],
                                                dataType: 'Custom'
                                            },
                                            properties: {
                                                stashed: { freeText: false }
                                            },
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections).toHaveLength(3);
        expect(result[0].headerSections?.[0].facetId).toBe('facet1');
        expect(result[0].headerSections?.[0].microChart).toBe(false);
        expect(result[0].headerSections?.[0].stashed).toBe(false);
        expect(result[0].headerSections?.[1].facetId).toBe('facet2');
        expect(result[0].headerSections?.[1].microChart).toBe(true);
        expect(result[0].headerSections?.[1].stashed).toBe(true);
        expect(result[0].headerSections?.[2].facetId).toBe('facet3');
        expect(result[0].headerSections?.[2].custom).toBe(true);
    });

    test('should handle ObjectPage without model', async () => {
        const objectPage = {
            pageType: 'ObjectPage'
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result).toHaveLength(1);
        expect(result[0].headerSections).toEqual([]);
    });

    test('should handle navigation without matching route', async () => {
        const listReportPage = {
            name: 'listReportPage',
            pageType: 'ListReport',
            model: {
                root: {} as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage1 = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            navigation: {
                tableSection1: 'nonExistentPage'
            },
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage2 = {
            name: 'objectPage2',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                listReportPage,
                objectPage1,
                objectPage2
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage1] as PageWithModelV4[], 'listReportPage', mockLogger);
        const objectPage2Data = result.find((page) => page.name === 'objectPage2');
        expect(objectPage2Data?.navigationParents?.parentOPName).toBeUndefined();
    });

    test('should handle form fields without name property', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {
                                        section1: {
                                            title: 'Form Section',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'ID', value: 'formFacet' }],
                                                dataType: 'FieldGroup'
                                            },
                                            properties: {
                                                stashed: {
                                                    freeText: false
                                                }
                                            },
                                            aggregations: {
                                                form: {
                                                    schema: {
                                                        keys: [
                                                            {
                                                                name: 'Target',
                                                                value: 'EntityType#FieldGroup1'
                                                            }
                                                        ]
                                                    },
                                                    aggregations: {
                                                        fields: {
                                                            aggregations: {
                                                                field1: {
                                                                    schema: {
                                                                        keys: [
                                                                            {
                                                                                name: 'Value',
                                                                                value: 'fieldValue1'
                                                                            }
                                                                        ]
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            }
                                                        } as unknown as TreeAggregation
                                                    } as unknown as TreeAggregation
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].headerSections?.[0].fields).toEqual([]);
    });

    test('should handle empty navigation object', async () => {
        const listReportPage = {
            name: 'listReportPage',
            pageType: 'ListReport',
            model: {
                root: {} as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            navigation: {},
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                listReportPage,
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], 'listReportPage', mockLogger);
        expect(result[0].navigationParents?.parentLRName).toBe('listReportPage');
        expect(result[0].navigationParents?.parentOPName).toBeUndefined();
    });

    test('should handle application without ListReport page', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const applicationModel = {
            pages: {
                objectPage1: objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].navigationParents?.parentLRName).toBe('');
    });

    test('should return empty array when no pages exist and no logger provided', async () => {
        const result = await getObjectPageFeatures([]);
        expect(result).toEqual([]);
    });

    test('should return body sections data for object page with body sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: {
                                        keys: [{ name: 'ID', value: 'GeneralInformation' }]
                                    },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections).toHaveLength(1);
        expect(result[0].bodySections?.[0].id).toBe('GeneralInformation');
        expect(result[0].bodySections?.[0].isTable).toBe(false);
        expect(result[0].bodySections?.[0].subSections).toEqual([]);
    });

    test('should return body section identifier from Key schema entry', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: {
                                        keys: [{ name: 'Key', value: 'SalesOrder' }]
                                    },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].id).toBe('SalesOrder');
    });

    test('should return body sections with sub-sections having identifiers', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: {
                                        keys: [{ name: 'ID', value: 'GeneralInformation' }]
                                    },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    order: 1,
                                                    schema: {
                                                        keys: [{ name: 'ID', value: 'SubSection1' }]
                                                    },
                                                    aggregations: {}
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].subSections).toHaveLength(1);
        expect(result[0].bodySections?.[0].subSections?.[0].id).toBe('SubSection1');
    });

    test('should use section key as fallback for subsection id when subsection has no identifier', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: {
                                        keys: [{ name: 'ID', value: 'GeneralInformation' }]
                                    },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [] },
                                                    aggregations: {}
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].subSections?.[0].id).toBe('GeneralInformation_subSection1');
    });

    test('should extract form field properties from a body sub-section', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'SubSection1' }] },
                                                    aggregations: {
                                                        form: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                fields: {
                                                                    aggregations: {
                                                                        field1: {
                                                                            name: 'DataField::CompanyCode',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Value',
                                                                                        value: 'CompanyCode'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation,
                                                                        field2: {
                                                                            name: 'DataField::SalesOrder',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Value',
                                                                                        value: 'SalesOrder'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const subSection = result[0].bodySections?.[0].subSections?.[0];
        expect(subSection?.fields).toHaveLength(2);
        expect(subSection?.fields?.[0]).toEqual({ property: 'CompanyCode' });
        expect(subSection?.fields?.[1]).toEqual({ property: 'SalesOrder' });
    });

    test('should return empty fields array for sub-section without form aggregation', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'SubSection1' }] },
                                                    aggregations: {}
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const subSection = result[0].bodySections?.[0].subSections?.[0];
        expect(subSection?.fields).toEqual([]);
    });

    test('should skip fields without Value key in schema', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'SubSection1' }] },
                                                    aggregations: {
                                                        form: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                fields: {
                                                                    aggregations: {
                                                                        field1: {
                                                                            name: 'DataField::CompanyCode',
                                                                            schema: { keys: [] }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].subSections?.[0].fields).toEqual([]);
    });

    test('drills ConnectedFields and FieldGroup wrappers when metadata is supplied', async () => {
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="test.svc">
            <EntityType Name="BookingType">
                <Key><PropertyRef Name="BookingId"/></Key>
                <Property Name="BookingId" Type="Edm.String"/>
                <Property Name="Country" Type="Edm.String"/>
                <Property Name="CityName" Type="Edm.String"/>
                <Property Name="PostingIsBlocked" Type="Edm.Boolean"/>
                <Property Name="BusinessPartnerIsBlocked" Type="Edm.Boolean"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Bookings" EntityType="test.svc.BookingType"/>
            </EntityContainer>
            <Annotations Target="test.svc.BookingType">
                <Annotation Term="com.sap.vocabularies.UI.v1.ConnectedFields" Qualifier="CountryCity">
                    <Record Type="com.sap.vocabularies.UI.v1.ConnectedFieldsType">
                        <PropertyValue Property="Template" String="{Country} - {CityName}"/>
                        <PropertyValue Property="Data">
                            <Record Type="Org.OData.Core.V1.Dictionary">
                                <PropertyValue Property="Country">
                                    <Record Type="com.sap.vocabularies.UI.v1.DataField">
                                        <PropertyValue Property="Value" Path="Country"/>
                                    </Record>
                                </PropertyValue>
                                <PropertyValue Property="CityName">
                                    <Record Type="com.sap.vocabularies.UI.v1.DataField">
                                        <PropertyValue Property="Value" Path="CityName"/>
                                    </Record>
                                </PropertyValue>
                            </Record>
                        </PropertyValue>
                    </Record>
                </Annotation>
                <Annotation Term="com.sap.vocabularies.UI.v1.FieldGroup" Qualifier="CheckBoxGroup">
                    <Record>
                        <PropertyValue Property="Data">
                            <Collection>
                                <Record Type="com.sap.vocabularies.UI.v1.DataField">
                                    <PropertyValue Property="Value" Path="PostingIsBlocked"/>
                                </Record>
                                <Record Type="com.sap.vocabularies.UI.v1.DataField">
                                    <PropertyValue Property="Value" Path="BusinessPartnerIsBlocked"/>
                                </Record>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            entitySet: 'Bookings',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: false,
                                                    schema: { keys: [{ name: 'ID', value: 'BookingData' }] },
                                                    aggregations: {
                                                        form: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                fields: {
                                                                    aggregations: {
                                                                        connected: {
                                                                            name: 'DataFieldForAnnotation::ConnectedFields::CountryCity',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Target',
                                                                                        value: '@UI.ConnectedFields#CountryCity'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation,
                                                                        group: {
                                                                            name: 'DataFieldForAnnotation::FieldGroup::CheckBoxGroup',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Target',
                                                                                        value: '@UI.FieldGroup#CheckBoxGroup'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger, metadata);
        const subSection = result[0].bodySections?.[0].subSections?.[0];
        expect(subSection?.fields).toEqual([
            { property: 'Country', connectedFields: 'CountryCity' },
            { property: 'CityName', connectedFields: 'CountryCity' },
            { property: 'PostingIsBlocked', fieldGroup: 'CheckBoxGroup' },
            { property: 'BusinessPartnerIsBlocked', fieldGroup: 'CheckBoxGroup' }
        ]);
    });

    test('should extract table columns from a table sub-section', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'Items' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: true,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'ItemsTable' }] },
                                                    aggregations: {
                                                        table: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                columns: {
                                                                    aggregations: {
                                                                        col1: {
                                                                            custom: false,
                                                                            description: 'Product',
                                                                            schema: {
                                                                                keys: [
                                                                                    { name: 'Value', value: 'Product' }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation,
                                                                        col2: {
                                                                            custom: false,
                                                                            description: 'Quantity',
                                                                            schema: {
                                                                                keys: [
                                                                                    { name: 'Value', value: 'Quantity' }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const subSection = result[0].bodySections?.[0].subSections?.[0];
        expect(subSection?.tableColumns).toEqual({ Product: { header: 'Product' }, Quantity: { header: 'Quantity' } });
    });

    test('should use Key for custom table columns', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'Items' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: true,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'ItemsTable' }] },
                                                    aggregations: {
                                                        table: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                columns: {
                                                                    aggregations: {
                                                                        col1: {
                                                                            custom: true,
                                                                            description: 'Custom Col',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Key',
                                                                                        value: 'customColumn1'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].subSections?.[0].tableColumns).toEqual({
            customColumn1: { header: 'Custom Col' }
        });
    });

    test('should return empty tableColumns for sub-section without table aggregation', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: true,
                                                    custom: false,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'SubSection1' }] },
                                                    aggregations: {}
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].subSections?.[0].tableColumns).toEqual({});
    });

    test('should return empty fields and tableColumns for custom sub-sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: {
                                            aggregations: {
                                                subSection1: {
                                                    isTable: false,
                                                    custom: true,
                                                    order: 1,
                                                    schema: { keys: [{ name: 'ID', value: 'CustomSubSection' }] },
                                                    aggregations: {
                                                        form: {
                                                            schema: { keys: [] },
                                                            aggregations: {
                                                                fields: {
                                                                    aggregations: {
                                                                        field1: {
                                                                            name: 'DataField::CompanyCode',
                                                                            schema: {
                                                                                keys: [
                                                                                    {
                                                                                        name: 'Value',
                                                                                        value: 'CompanyCode'
                                                                                    }
                                                                                ]
                                                                            }
                                                                        } as unknown as TreeAggregation
                                                                    }
                                                                } as unknown as TreeAggregation
                                                            } as unknown as TreeAggregation
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const subSection = result[0].bodySections?.[0].subSections?.[0];
        expect(subSection?.fields).toEqual([]);
        expect(subSection?.tableColumns).toEqual({});
    });

    test('should extract form field properties directly from a body section without subsections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'GeneralInformation' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        form: {
                                            schema: { keys: [] },
                                            aggregations: {
                                                fields: {
                                                    aggregations: {
                                                        field1: {
                                                            name: 'DataField::CompanyCode',
                                                            schema: { keys: [{ name: 'Value', value: 'CompanyCode' }] }
                                                        } as unknown as TreeAggregation,
                                                        field2: {
                                                            name: 'DataField::SalesOrder',
                                                            schema: { keys: [{ name: 'Value', value: 'SalesOrder' }] }
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            } as unknown as TreeAggregation
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const section = result[0].bodySections?.[0];
        expect(section?.fields).toHaveLength(2);
        expect(section?.fields?.[0]).toEqual({ property: 'CompanyCode' });
        expect(section?.fields?.[1]).toEqual({ property: 'SalesOrder' });
        expect(section?.subSections).toHaveLength(0);
    });

    test('should extract table columns directly from a body section without subsections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: true,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'Key', value: '_Items' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        table: {
                                            schema: { keys: [] },
                                            aggregations: {
                                                columns: {
                                                    aggregations: {
                                                        col1: {
                                                            custom: false,
                                                            description: 'Product',
                                                            schema: { keys: [{ name: 'Value', value: 'Product' }] }
                                                        } as unknown as TreeAggregation,
                                                        col2: {
                                                            custom: false,
                                                            description: 'Quantity',
                                                            schema: { keys: [{ name: 'Value', value: 'Quantity' }] }
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            } as unknown as TreeAggregation
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const section = result[0].bodySections?.[0];
        expect(section?.tableColumns).toEqual({
            Product: { header: 'Product' },
            Quantity: { header: 'Quantity' }
        });
        expect(section?.subSections).toHaveLength(0);
    });

    test('should detect table section by presence of table aggregation when isTable flag is not set (real spec shape)', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                '_Booking::@com.sap.vocabularies.UI.v1.LineItem': {
                                    // isTable intentionally omitted — matches real @sap/ux-specification output
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        table: {
                                            schema: { keys: [] },
                                            aggregations: {
                                                columns: {
                                                    aggregations: {
                                                        col1: {
                                                            custom: false,
                                                            description: 'Booking ID',
                                                            schema: { keys: [{ name: 'Value', value: 'BookingID' }] }
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            } as unknown as TreeAggregation
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const section = result[0].bodySections?.[0];
        expect(section?.isTable).toBe(true);
        expect(section?.navigationProperty).toBe('_Booking');
        expect(section?.fields).toEqual([]);
        expect(section?.tableColumns).toEqual({ BookingID: { header: 'Booking ID' } });
    });

    test('should return empty fields and tableColumns for custom body sections', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: true,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'CustomSection' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        form: {
                                            schema: { keys: [] },
                                            aggregations: {
                                                fields: {
                                                    aggregations: {
                                                        field1: {
                                                            name: 'DataField::CompanyCode',
                                                            schema: { keys: [{ name: 'Value', value: 'CompanyCode' }] }
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            } as unknown as TreeAggregation
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        const section = result[0].bodySections?.[0];
        expect(section?.fields).toEqual([]);
        expect(section?.tableColumns).toEqual({});
    });

    test('should extract navigationProperty from table section key with underscore prefix', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                '_Booking::@com.sap.vocabularies.UI.v1.LineItem': {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'Booking' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].id).toBe('Booking');
        expect(result[0].bodySections?.[0].navigationProperty).toBe('_Booking');
    });

    test('should not set navigationProperty for non-navigation section keys', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                '@com.sap.vocabularies.UI.v1.Identification': {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'Travel' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].bodySections?.[0].navigationProperty).toBeUndefined();
    });

    const ACTION_METADATA = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="OrderType">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
            </EntityType>
            <Action Name="Approve" IsBound="true">
                <Parameter Name="_it" Type="TestService.OrderType" Nullable="false"/>
            </Action>
            <Action Name="MassProcess" IsBound="true">
                <Parameter Name="_it" Type="Collection(TestService.OrderType)" Nullable="false"/>
            </Action>
            <EntityContainer Name="Container">
                <EntitySet Name="Orders" EntityType="TestService.OrderType"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('should extract header actions from metadata', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation,
                                actions: {
                                    aggregations: {
                                        'DataFieldForAction::TestService.Approve::TestService.OrderType': {
                                            description: 'Approve',
                                            path: [],
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures(
            [objectPage] as PageWithModelV4[],
            undefined,
            mockLogger,
            ACTION_METADATA
        );
        expect(result[0].headerActions).toHaveLength(1);
        expect(result[0].headerActions?.[0]).toEqual({
            label: 'Approve',
            action: 'Approve',
            service: 'TestService',
            unbound: false,
            visible: true,
            enabled: false,
            dynamicPath: undefined
        });
    });

    test('should extract section actions from a table section', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                '_Items::@com.sap.vocabularies.UI.v1.LineItem': {
                                    isTable: true,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'Items' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        table: {
                                            aggregations: {
                                                columns: { aggregations: {} } as unknown as TreeAggregation,
                                                toolBar: {
                                                    aggregations: {
                                                        actions: {
                                                            aggregations: {
                                                                'DataFieldForAction::TestService.MassProcess::TestService.OrderType':
                                                                    {
                                                                        description: 'Mass Process',
                                                                        path: [],
                                                                        aggregations: {}
                                                                    } as unknown as TreeAggregation
                                                            }
                                                        } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures(
            [objectPage] as PageWithModelV4[],
            undefined,
            mockLogger,
            ACTION_METADATA
        );
        const section = result[0].bodySections?.[0];
        expect(section?.actions).toHaveLength(1);
        expect(section?.actions?.[0]).toEqual({
            label: 'Mass Process',
            action: 'MassProcess',
            service: 'TestService',
            unbound: true,
            visible: true,
            enabled: true,
            dynamicPath: undefined
        });
    });

    test('should extract section actions from a form section', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation,
                        sections: {
                            aggregations: {
                                section1: {
                                    isTable: false,
                                    custom: false,
                                    order: 1,
                                    schema: { keys: [{ name: 'ID', value: 'General' }] },
                                    aggregations: {
                                        subSections: { aggregations: {} } as unknown as TreeAggregation,
                                        form: {
                                            aggregations: {
                                                fields: { aggregations: {} } as unknown as TreeAggregation,
                                                actions: {
                                                    aggregations: {
                                                        'DataFieldForAction::TestService.Approve::TestService.OrderType':
                                                            {
                                                                description: 'Approve',
                                                                path: [],
                                                                aggregations: {}
                                                            } as unknown as TreeAggregation
                                                    }
                                                } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures(
            [objectPage] as PageWithModelV4[],
            undefined,
            mockLogger,
            ACTION_METADATA
        );
        const section = result[0].bodySections?.[0];
        expect(section?.actions).toHaveLength(1);
        expect(section?.actions?.[0]).toEqual({
            label: 'Approve',
            action: 'Approve',
            service: 'TestService',
            unbound: false,
            visible: true,
            enabled: false,
            dynamicPath: undefined
        });
    });

    test('should return empty actions when no metadata is provided', async () => {
        const objectPage = {
            name: 'objectPage1',
            pageType: 'ObjectPage',
            model: {
                root: {
                    aggregations: {
                        header: {
                            aggregations: {
                                sections: { aggregations: {} } as unknown as TreeAggregation,
                                actions: {
                                    aggregations: {
                                        'DataFieldForAction::TestService.Approve::TestService.OrderType': {
                                            description: 'Approve',
                                            path: [],
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            } as unknown as TreeAggregation
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation,
                name: 'test',
                schema: {}
            }
        };
        const result = await getObjectPageFeatures([objectPage] as PageWithModelV4[], undefined, mockLogger);
        expect(result[0].headerActions).toEqual([]);
    });
});
