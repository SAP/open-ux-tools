import type { ApplicationModel, TreeAggregation } from '@sap/ux-specification/dist/types/src/parser';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type { Logger } from '@sap-ux/logger';
import { getObjectPageFeatures } from '../../../src/utils/objectPageUtils';
import type { ObjectPageFeatures, HeaderSectionFeatureData } from '../../../src/types';

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
});
