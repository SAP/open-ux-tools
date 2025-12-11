import type {
    ApplicationModel,
    TreeAggregations,
    TreeAggregation,
    TreeModel
} from '@sap/ux-specification/dist/types/src/parser';
import {
    getListReportPage,
    getObjectPages,
    getAggregations,
    getSelectionFieldItems,
    getFilterFields,
    getTableColumns
} from '../../src/project/model';

describe('Test getListReportPage()', () => {
    test('should return null when no pages exist', () => {
        const applicationModel = {
            pages: {},
            model: {}
        } as unknown as ApplicationModel;
        const result = getListReportPage(applicationModel);
        expect(result).toBeNull();
    });

    test('should return null when no ListReport page exists', () => {
        const applicationModel = {
            pages: {
                page1: { pageType: 'ObjectPage' }
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getListReportPage(applicationModel);
        expect(result).toBeNull();
    });

    test('should return the first ListReport page when it exists', () => {
        const listReportPage = { pageType: 'ListReport', data: 'test' };
        const applicationModel = {
            pages: {
                listReport: listReportPage,
                objectPage: { pageType: 'ObjectPage' }
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getListReportPage(applicationModel);
        expect(result).toEqual(listReportPage);
    });

    test('should return ListReport page with custom type parameter', () => {
        interface CustomListReport {
            pageType: 'ListReport';
            customField: string;
        }
        const listReportPage = { pageType: 'ListReport', customField: 'custom' };
        const applicationModel = {
            pages: {
                listReport: listReportPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getListReportPage<CustomListReport>(applicationModel);
        expect(result?.customField).toBe('custom');
    });

    test('should return the first ListReport when multiple exist', () => {
        const firstListReport = { pageType: 'ListReport', name: 'first' };
        const secondListReport = { pageType: 'ListReport', name: 'second' };
        const applicationModel = {
            pages: {
                firstLR: firstListReport,
                secondLR: secondListReport
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getListReportPage(applicationModel);
        expect(result).toEqual(firstListReport);
    });
});

describe('Test getObjectPages()', () => {
    test('should return empty array when no pages exist', () => {
        const applicationModel = {
            pages: {},
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages(applicationModel);
        expect(result).toEqual([]);
    });

    test('should return empty array when no ObjectPage pages exist', () => {
        const applicationModel = {
            pages: {
                listReport: { pageType: 'ListReport' }
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages(applicationModel);
        expect(result).toEqual([]);
    });

    test('should return single ObjectPage when it exists', () => {
        const objectPage = { pageType: 'ObjectPage', name: 'test' };
        const applicationModel = {
            pages: {
                objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages(applicationModel);
        expect(result).toEqual([objectPage]);
    });

    test('should return all ObjectPages when multiple exist', () => {
        const objectPage1 = { pageType: 'ObjectPage', name: 'first' };
        const objectPage2 = { pageType: 'ObjectPage', name: 'second' };
        const applicationModel = {
            pages: {
                objectPage1,
                objectPage2,
                listReport: { pageType: 'ListReport' }
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages(applicationModel);
        expect(result).toHaveLength(2);
        expect(result).toContain(objectPage1);
        expect(result).toContain(objectPage2);
    });

    test('should return ObjectPages with custom type parameter', () => {
        interface CustomObjectPage {
            pageType: 'ObjectPage';
            customField: string;
        }
        const objectPage = { pageType: 'ObjectPage', customField: 'custom' };
        const applicationModel = {
            pages: {
                objectPage
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages<CustomObjectPage>(applicationModel);
        expect(result[0].customField).toBe('custom');
    });

    test('should maintain order of ObjectPages', () => {
        const objectPage1 = { pageType: 'ObjectPage', order: 1 };
        const objectPage2 = { pageType: 'ObjectPage', order: 2 };
        const objectPage3 = { pageType: 'ObjectPage', order: 3 };
        const applicationModel = {
            pages: {
                Page3: objectPage3,
                Page1: objectPage1,
                Page2: objectPage2
            },
            model: {}
        } as unknown as ApplicationModel;
        const result = getObjectPages(applicationModel);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(objectPage3);
        expect(result[1]).toEqual(objectPage1);
        expect(result[2]).toEqual(objectPage2);
    });
});

describe('Test getAggregations()', () => {
    test('should return empty object when node is undefined', () => {
        const result = getAggregations(undefined as unknown as TreeAggregation);
        expect(result).toEqual({});
    });

    test('should return empty object when node is null', () => {
        const result = getAggregations(null as unknown as TreeAggregation);
        expect(result).toEqual({});
    });

    test('should return empty object when node has no aggregations property', () => {
        const node = { data: 'test' } as unknown as TreeAggregation;
        const result = getAggregations(node);
        expect(result).toEqual({});
    });

    test('should return aggregations object when node has aggregations property', () => {
        const aggregations = { field1: {}, field2: {} };
        const node = { aggregations } as unknown as TreeAggregation;
        const result = getAggregations(node);
        expect(result).toEqual(aggregations);
    });

    test('should return empty aggregations object when aggregations is empty', () => {
        const node = { aggregations: {} } as unknown as TreeAggregation;
        const result = getAggregations(node);
        expect(result).toEqual({});
    });

    test('should handle node as non-object', () => {
        const result = getAggregations('string' as unknown as TreeAggregation);
        expect(result).toEqual({});
    });
});

describe('Test getSelectionFieldItems()', () => {
    test('should return empty array when selectionFieldsAgg is undefined', () => {
        const result = getSelectionFieldItems(undefined as unknown as TreeAggregations);
        expect(result).toEqual([]);
    });

    test('should return empty array when selectionFieldsAgg is null', () => {
        const result = getSelectionFieldItems(null as unknown as TreeAggregations);
        expect(result).toEqual([]);
    });

    test('should return empty array when selectionFieldsAgg is not an object', () => {
        const result = getSelectionFieldItems('string' as unknown as TreeAggregations);
        expect(result).toEqual([]);
    });

    test('should return empty array when selectionFieldsAgg is empty', () => {
        const selectionFieldsAgg: TreeAggregations = {};
        const result = getSelectionFieldItems(selectionFieldsAgg);
        expect(result).toEqual([]);
    });

    test('should return array of description strings from aggregation items', () => {
        const selectionFieldsAgg: TreeAggregations = {
            field1: { description: 'First Field' } as unknown as TreeAggregation,
            field2: { description: 'Second Field' } as unknown as TreeAggregation,
            field3: { description: 'Third Field' } as unknown as TreeAggregation
        };
        const result = getSelectionFieldItems(selectionFieldsAgg);
        expect(result).toHaveLength(3);
        expect(result).toContain('First Field');
        expect(result).toContain('Second Field');
        expect(result).toContain('Third Field');
    });

    test('should handle items with undefined description', () => {
        const selectionFieldsAgg: TreeAggregations = {
            field1: { description: 'First Field' } as unknown as TreeAggregation,
            field2: {} as unknown as TreeAggregation
        };
        const result = getSelectionFieldItems(selectionFieldsAgg);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe('First Field');
        expect(result[1]).toBeUndefined();
    });

    test('should preserve order of items', () => {
        const field1Desc = 'Field One';
        const field2Desc = 'Field Two';
        const field3Desc = 'Field Three';
        const selectionFieldsAgg: TreeAggregations = {
            field3: { description: field3Desc } as unknown as TreeAggregation,
            field1: { description: field1Desc } as unknown as TreeAggregation,
            field2: { description: field2Desc } as unknown as TreeAggregation
        };
        const result = getSelectionFieldItems(selectionFieldsAgg);
        expect(result).toHaveLength(3);
        expect(result[0]).toEqual(field3Desc);
        expect(result[1]).toEqual(field1Desc);
        expect(result[2]).toEqual(field2Desc);
    });
});

describe('Test getFilterFields()', () => {
    test('should return filter field descriptions from page model', () => {
        const mockPageModel = {
            root: {
                aggregations: {
                    filterBar: {
                        aggregations: {
                            selectionFields: {
                                aggregations: {
                                    field1: { description: 'Filter Field 1' } as unknown as TreeAggregation,
                                    field2: { description: 'Filter Field 2' } as unknown as TreeAggregation
                                }
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getFilterFields(mockPageModel);
        expect(result).toEqual(['Filter Field 1', 'Filter Field 2']);
    });

    test('should return empty array when filterBar is missing', () => {
        const mockPageModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getFilterFields(mockPageModel);
        expect(result).toEqual([]);
    });

    test('should return empty array when selectionFields is missing', () => {
        const mockPageModel = {
            root: {
                aggregations: {
                    filterBar: {
                        aggregations: {}
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getFilterFields(mockPageModel);
        expect(result).toEqual([]);
    });

    test('should return empty array when root has no aggregations', () => {
        const mockPageModel = {
            root: {} as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getFilterFields(mockPageModel);
        expect(result).toEqual([]);
    });
});

describe('Test getTableColumns()', () => {
    test('should return table columns aggregation from page model', () => {
        const expectedColumns = {
            column1: { name: 'Column 1' } as unknown as TreeAggregation,
            column2: { name: 'Column 2' } as unknown as TreeAggregation
        };
        const mockPageModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            columns: {
                                aggregations: expectedColumns
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual(expectedColumns);
    });

    test('should return empty object when table is missing', () => {
        const mockPageModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual({});
    });

    test('should return empty object when columns is missing', () => {
        const mockPageModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {}
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual({});
    });

    test('should return empty object when root has no aggregations', () => {
        const mockPageModel = {
            root: {} as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual({});
    });

    test('should return empty object when column aggregations is empty', () => {
        const mockPageModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            columns: {
                                aggregations: {}
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual({});
    });

    test('should handle multiple columns correctly', () => {
        const expectedColumns = {
            id: { name: 'ID' } as unknown as TreeAggregation,
            name: { name: 'Name' } as unknown as TreeAggregation,
            email: { name: 'Email' } as unknown as TreeAggregation,
            status: { name: 'Status' } as unknown as TreeAggregation
        };
        const mockPageModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            columns: {
                                aggregations: expectedColumns
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
        const result = getTableColumns(mockPageModel);
        expect(result).toEqual(expectedColumns);
        expect(Object.keys(result)).toHaveLength(4);
    });
});
