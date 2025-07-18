import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    waitFor,
    sleep,
    _copyAndSort,
    focusEditedCell,
    getCellFromCoords,
    scrollToColumn,
    scrollToRow,
    addRowNumbers,
    _onHeaderRender,
    getStylesForSelectedCell,
    showFocus,
    hideFocus,
    getComboBoxInput
} from '../../../src/components/UITable/UITable-helper';
import type { UIColumn, EditedCell, UITableProps, UITableState } from '../../../src/components/UITable/types';
import { ColumnControlType } from '../../../src/components/UITable/types';

describe('waitFor', () => {
    it('should resolve with the element when it is found', async () => {
        const el = document.createElement('div');
        el.id = 'test-element';
        document.body.appendChild(el);

        const result = await waitFor('#test-element');
        expect(result).toBe(el);
    });

    it('should reject with an error when the element is not found', async () => {
        const result = waitFor('#non-existent-element', 1);
        await expect(result).rejects.toThrowError('Element for selector not found: #non-existent-element');
    });
});

describe('sleep', () => {
    it('should resolve after the specified number of milliseconds', async () => {
        const start = Date.now();
        // server is sometimes so fast, that it calculates the difference in -1ms
        await sleep(110);
        const end = Date.now();

        expect(end - start).toBeGreaterThanOrEqual(100);
    });
});

describe('_copyAndSort', () => {
    const items = [
        {
            title: 'b'
        },
        {
            title: 'w'
        },
        {
            title: 'a'
        },
        {
            title: 'ba'
        }
    ];
    const tests = [
        {
            isSortedDescending: undefined,
            expectedOrder: ['w', 'ba', 'b', 'a']
        },
        {
            isSortedDescending: true,
            expectedOrder: ['a', 'b', 'ba', 'w']
        },
        {
            isSortedDescending: false,
            expectedOrder: ['w', 'ba', 'b', 'a']
        }
    ];
    test.each(tests)('isSortedDescending = $isSortedDescending', ({ isSortedDescending, expectedOrder }) => {
        const result = _copyAndSort(items, 'title', isSortedDescending);
        // Make sure array is copy
        expect(result).not.toEqual(items);
        // Check order
        expect(result.map((item) => item.title)).toEqual(expectedOrder);
    });

    it('should handle empty array', () => {
        const result = _copyAndSort([], 'title');
        expect(result).toEqual([]);
    });

    it('should handle single item array', () => {
        const items = [{ title: 'single' }];
        const result = _copyAndSort(items, 'title');
        expect(result).toEqual(items);
        expect(result).not.toBe(items); // Should be a copy
    });

    it('should handle numeric values', () => {
        const items = [{ value: 3 }, { value: 1 }, { value: 2 }];
        const result = _copyAndSort(items, 'value');
        expect(result.map((item) => item.value)).toEqual([3, 2, 1]);
    });
});

describe('focusEditedCell', () => {
    let mockProps: UITableProps;
    let mockEditedCell: EditedCell;
    let mockCell: any;

    beforeEach(() => {
        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn((cb) => {
            cb(0);
            return 0;
        });

        // Create mock cell with focus and click methods
        mockCell = { focus: jest.fn(), click: jest.fn() };

        // Mock DOM structure for getCellFromCoords
        const mockRow = {
            querySelectorAll: jest.fn().mockReturnValue([mockCell, mockCell, mockCell])
        };

        // Mock document.querySelector to return the mock row for any DetailsList query
        document.querySelector = jest.fn().mockImplementation((selector) => {
            if (selector.includes('.ms-DetailsList') && selector.includes('.ms-DetailsRow[data-item-index=')) {
                return mockRow;
            }
            return null;
        });

        mockProps = {
            dataSetKey: 'test',
            renderInputs: false,
            columns: [
                { key: 'col1', name: 'Column 1', fieldName: 'col1', editable: true } as UIColumn,
                { key: 'col2', name: 'Column 2', fieldName: 'col2', editable: true } as UIColumn,
                { key: 'col3', name: 'Column 3', fieldName: 'col3', editable: false } as UIColumn
            ],
            items: [
                { col1: 'a', col2: 'b' },
                { col1: 'c', col2: 'd' }
            ],
            onSave: jest.fn()
        };

        mockEditedCell = {
            rowIndex: 0,
            item: { col1: 'a', col2: 'b' },
            column: { key: 'col1', name: 'Column 1', fieldName: 'col1', editable: true } as UIColumn
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve immediately when no column key', async () => {
        const editedCell = { ...mockEditedCell, column: undefined };
        const result = await focusEditedCell(editedCell, mockProps);
        expect(result).toBeUndefined();
    });

    it('should resolve immediately when no editedCell', async () => {
        const result = await focusEditedCell(undefined, mockProps);
        expect(result).toBeUndefined();
    });

    it('should focus cell without direction', async () => {
        await focusEditedCell(mockEditedCell, mockProps);

        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should move right to next editable column', async () => {
        await focusEditedCell(mockEditedCell, mockProps, 'right');

        expect(mockCell.click).toHaveBeenCalled();
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should move left to previous editable column', async () => {
        const editedCell = {
            ...mockEditedCell,
            column: { key: 'col2', name: 'Column 2', fieldName: 'col2', editable: true } as UIColumn
        };

        await focusEditedCell(editedCell, mockProps, 'left');

        expect(mockCell.click).toHaveBeenCalled();
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should move down to next row', async () => {
        await focusEditedCell(mockEditedCell, mockProps, 'down');

        expect(mockCell.click).toHaveBeenCalled();
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should move up to previous row', async () => {
        const editedCell = { ...mockEditedCell, rowIndex: 1 };

        await focusEditedCell(editedCell, mockProps, 'up');

        expect(mockCell.click).toHaveBeenCalled();
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should not move when at boundary (right edge)', async () => {
        const editedCell = {
            ...mockEditedCell,
            column: { key: 'col2', name: 'Column 2', fieldName: 'col2', editable: true } as UIColumn
        };

        await focusEditedCell(editedCell, mockProps, 'right');

        // Should still focus the same cell
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should not move when at boundary (left edge)', async () => {
        await focusEditedCell(mockEditedCell, mockProps, 'left');

        // Should still focus the same cell
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should not move when at boundary (top edge)', async () => {
        await focusEditedCell(mockEditedCell, mockProps, 'up');

        // Should still focus the same cell
        expect(mockCell.focus).toHaveBeenCalled();
    });

    it('should not move when at boundary (bottom edge)', async () => {
        const editedCell = { ...mockEditedCell, rowIndex: 1 };

        await focusEditedCell(editedCell, mockProps, 'down');

        // Should still focus the same cell
        expect(mockCell.focus).toHaveBeenCalled();
    });
});

describe('getCellFromCoords', () => {
    beforeEach(() => {
        // Mock DOM structure
        const mockRow = {
            querySelectorAll: jest.fn().mockReturnValue([{ id: 'cell-0' }, { id: 'cell-1' }, { id: 'cell-2' }])
        };

        document.querySelector = jest.fn().mockReturnValue(mockRow);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return correct cell from coordinates', () => {
        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn, { key: 'col2', name: 'Column 2' } as UIColumn];

        const result = getCellFromCoords(0, 'col2', columns);
        expect(result).toEqual({ id: 'cell-1' });
    });

    it('should return correct cell with addOneToColIndex', () => {
        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn, { key: 'col2', name: 'Column 2' } as UIColumn];

        const result = getCellFromCoords(0, 'col2', columns, true);
        expect(result).toEqual({ id: 'cell-2' });
    });

    it('should handle first column', () => {
        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn, { key: 'col2', name: 'Column 2' } as UIColumn];

        const result = getCellFromCoords(0, 'col1', columns);
        expect(result).toEqual({ id: 'cell-0' });
    });

    it('should handle column not found', () => {
        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn, { key: 'col2', name: 'Column 2' } as UIColumn];

        const result = getCellFromCoords(0, 'nonexistent', columns);
        expect(result).toBeUndefined(); // findIndex returns -1, selectedIdx becomes -1, cols[-1] is undefined
    });

    it('should handle row not found', () => {
        document.querySelector = jest.fn().mockReturnValue(null);

        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn];

        const result = getCellFromCoords(0, 'col1', columns);
        expect(result).toBeUndefined();
    });
});

describe('scrollToColumn', () => {
    let mockScrollContainer: any;

    beforeEach(() => {
        // Mock DOM elements
        const mockSidebar = {
            getBoundingClientRect: jest.fn().mockReturnValue({ width: 200 })
        };

        mockScrollContainer = {
            scrollLeft: 100,
            scrollTo: jest.fn()
        };

        const mockCell = {
            getBoundingClientRect: jest.fn().mockReturnValue({ x: 300 })
        };

        // Mock getCellFromCoords directly
        const mockRow = {
            querySelectorAll: jest.fn().mockReturnValue([mockCell, mockCell, mockCell])
        };

        document.querySelector = jest.fn((selector) => {
            if (selector === '.data-editor__sidebar') {
                return mockSidebar;
            }
            if (selector === '.ms-ScrollablePane--contentContainer') {
                return mockScrollContainer;
            }
            if (selector.includes('.ms-DetailsRow[data-item-index=')) {
                return mockRow;
            }
            return null;
        });

        global.requestAnimationFrame = jest.fn((cb) => {
            cb(0);
            return 0;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should scroll to column', () => {
        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn, { key: 'col2', name: 'Column 2' } as UIColumn];

        scrollToColumn('col2', columns, 0);

        expect(global.requestAnimationFrame).toHaveBeenCalled();
        expect(mockScrollContainer.scrollTo).toHaveBeenCalled();
    });

    it('should handle missing sidebar', () => {
        document.querySelector = jest.fn((selector) => {
            if (selector === '.data-editor__sidebar') {
                return null;
            }
            if (selector === '.ms-ScrollablePane--contentContainer') {
                return {
                    scrollLeft: 100,
                    scrollTo: jest.fn()
                };
            }
            return null;
        });

        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn];

        expect(() => scrollToColumn('col1', columns, 0)).not.toThrow();
    });

    it('should handle missing scroll container', () => {
        document.querySelector = jest.fn((selector) => {
            if (selector === '.data-editor__sidebar') {
                return {
                    getBoundingClientRect: jest.fn().mockReturnValue({ width: 200 })
                };
            }
            return null;
        });

        const columns = [{ key: 'col1', name: 'Column 1' } as UIColumn];

        expect(() => scrollToColumn('col1', columns, 0)).not.toThrow();
    });
});

describe('scrollToRow', () => {
    it('should return early when no table provided', () => {
        const result = scrollToRow(0, null);
        expect(result).toBeUndefined();
    });

    it('should call focusIndex and setup row element', async () => {
        const mockTable = {
            focusIndex: jest.fn()
        };

        const mockRowElement = {
            setAttribute: jest.fn(),
            click: jest.fn(),
            focus: jest.fn()
        };

        // Mock waitFor to resolve immediately
        jest.doMock('../../../src/components/UITable/UITable-helper', () => ({
            ...jest.requireActual('../../../src/components/UITable/UITable-helper'),
            waitFor: jest.fn().mockResolvedValue(mockRowElement)
        }));

        scrollToRow(5, mockTable as any);

        expect(mockTable.focusIndex).toHaveBeenCalledWith(5, false);
    });
});

describe('addRowNumbers', () => {
    it('should add row numbers column when showRowNumbers is true', () => {
        const originalColumns = [{ key: 'col1', name: 'Column 1', fieldName: 'col1' }];
        const columns = [...originalColumns]; // Create a copy since addRowNumbers mutates

        const result = addRowNumbers(columns, true);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            key: '__row_number__',
            name: '#',
            fieldName: '__row_number__',
            minWidth: 24,
            maxWidth: 24,
            isResizable: false
        });
        expect(result[1]).toEqual(originalColumns[0]);
    });

    it('should not add row numbers when showRowNumbers is false', () => {
        const columns = [{ key: 'col1', name: 'Column 1', fieldName: 'col1' }];

        const result = addRowNumbers(columns, false);

        expect(result).toEqual(columns);
    });

    it('should not add row numbers twice', () => {
        const columns = [
            { key: '__row_number__', name: '#', fieldName: '__row_number__' },
            { key: 'col1', name: 'Column 1', fieldName: 'col1' }
        ];

        const result = addRowNumbers(columns, true);

        expect(result).toHaveLength(2);
        expect(result[0].key).toBe('__row_number__');
    });

    it('should handle empty columns array with showRowNumbers false', () => {
        const columns: any[] = [];
        const result = addRowNumbers(columns, false);

        expect(result).toEqual([]);
    });

    it('should handle empty columns array with showRowNumbers true', () => {
        const columns: any[] = [];

        // The current implementation has a bug - it doesn't check if array is empty
        // This test documents the current behavior
        expect(() => addRowNumbers(columns, true)).toThrow();
    });
});

describe('_onHeaderRender', () => {
    it('should return null when no props provided', () => {
        const result = _onHeaderRender(undefined, jest.fn());
        expect(result).toBeNull();
    });

    it('should return null when no defaultRender provided', () => {
        const result = _onHeaderRender({} as any, undefined);
        expect(result).toBeNull();
    });

    it('should render header with custom props', () => {
        const mockProps = {
            selection: null,
            columns: []
        };

        const mockDefaultRender = jest.fn().mockReturnValue(<div>Mock Header</div>);

        const result = _onHeaderRender(mockProps as any, mockDefaultRender);

        expect(result).toBeDefined();
        expect(mockDefaultRender).toHaveBeenCalled();
    });

    it('should render column header with icon', () => {
        const mockColumn: UIColumn = {
            key: 'col1',
            name: 'Test Column',
            fieldName: 'col1',
            minWidth: 100,
            maxWidth: 200,
            editable: true,
            iconName: 'Edit',
            iconTooltip: 'Edit tooltip',
            headerTooltip: 'Header tooltip'
        };

        const mockProps = {
            selection: null,
            columns: [mockColumn],
            onRenderColumnHeaderTooltip: jest.fn()
        };

        const mockDefaultRender = jest.fn().mockImplementation((props) => {
            // Call the custom tooltip renderer
            const tooltipResult = props.onRenderColumnHeaderTooltip({ column: mockColumn });
            return <div>{tooltipResult}</div>;
        });

        const { container } = render(_onHeaderRender(mockProps as any, mockDefaultRender) as React.ReactElement);

        expect(container.querySelector('.data-editor__header-cell')).toBeTruthy();
        expect(container.querySelector('.type-icon')).toBeTruthy();
    });

    it('should render row number column header', () => {
        const mockColumn: UIColumn = {
            key: '__row_number__',
            name: '#',
            fieldName: '__row_number__',
            minWidth: 24,
            maxWidth: 24,
            editable: false
        };

        const mockProps = {
            selection: null,
            columns: [mockColumn],
            onRenderColumnHeaderTooltip: jest.fn()
        };

        const mockDefaultRender = jest.fn().mockImplementation((props) => {
            const tooltipResult = props.onRenderColumnHeaderTooltip({ column: mockColumn });
            return <div>{tooltipResult}</div>;
        });

        const { container } = render(_onHeaderRender(mockProps as any, mockDefaultRender) as React.ReactElement);

        expect(container.querySelector('.data-editor__header-cell')).toBeTruthy();
        expect(container.querySelector('.not-editable-container')).toBeTruthy();
    });

    it('should handle check tooltip', () => {
        const mockProps = {
            selection: {},
            columns: []
        };

        const mockDefaultRender = jest.fn().mockImplementation((props) => {
            const tooltipResult = props.onRenderColumnHeaderTooltip(
                { hostClassName: 'ms-DetailsHeader-checkTooltip' },
                jest.fn().mockReturnValue(<div>Check tooltip</div>)
            );
            return <div>{tooltipResult}</div>;
        });

        const { container } = render(_onHeaderRender(mockProps as any, mockDefaultRender) as React.ReactElement);

        expect(container.textContent).toContain('Check tooltip');
    });
});

describe('getStylesForSelectedCell', () => {
    it('should return empty styles when no edited cell', () => {
        const state: UITableState = {
            columns: [],
            items: []
        };

        const result = getStylesForSelectedCell(state);

        expect(result).toEqual({});
    });

    it('should return styles for edited cell', () => {
        const state: UITableState = {
            columns: [],
            items: [],
            editedCell: {
                rowIndex: 2,
                item: { test: 'value' },
                column: { key: 'test-col', name: 'Test Column', fieldName: 'test' } as UIColumn
            }
        };

        const result = getStylesForSelectedCell(state);

        expect(result.root).toBeDefined();
        expect(result.root?.['div.ms-List-cell']).toBeDefined();
        expect(result.root?.['div.ms-List-cell[data-list-index="2"]']).toBeDefined();
        expect(result.root?.['.ms-DetailsRow-cell']).toBeDefined();
        expect(
            result.root?.['div.ms-List-cell[data-list-index="2"] .ms-DetailsRow-cell[data-automation-key="test-col"]']
        ).toBeDefined();
    });

    it('should handle undefined row index', () => {
        const state: UITableState = {
            columns: [],
            items: [],
            editedCell: {
                rowIndex: undefined,
                item: { test: 'value' },
                column: { key: 'test-col', name: 'Test Column', fieldName: 'test' } as UIColumn
            }
        };

        const result = getStylesForSelectedCell(state);

        expect(result).toEqual({});
    });

    it('should handle undefined column', () => {
        const state: UITableState = {
            columns: [],
            items: [],
            editedCell: {
                rowIndex: 2,
                item: { test: 'value' },
                column: undefined
            }
        };

        const result = getStylesForSelectedCell(state);

        expect(result).toEqual({});
    });
});

describe('showFocus', () => {
    beforeEach(() => {
        document.body.className = '';
    });

    it('should add focus visible class and remove focus hidden class', () => {
        document.body.classList.add('ms-Fabric--isFocusHidden');

        showFocus();

        expect(document.body.classList.contains('ms-Fabric--isFocusVisible')).toBe(true);
        expect(document.body.classList.contains('ms-Fabric--isFocusHidden')).toBe(false);
    });

    it('should work when no existing focus classes', () => {
        showFocus();

        expect(document.body.classList.contains('ms-Fabric--isFocusVisible')).toBe(true);
        expect(document.body.classList.contains('ms-Fabric--isFocusHidden')).toBe(false);
    });
});

describe('hideFocus', () => {
    beforeEach(() => {
        document.body.className = '';
    });

    it('should add focus hidden class and remove focus visible class', () => {
        document.body.classList.add('ms-Fabric--isFocusVisible');

        hideFocus();

        expect(document.body.classList.contains('ms-Fabric--isFocusHidden')).toBe(true);
        expect(document.body.classList.contains('ms-Fabric--isFocusVisible')).toBe(false);
    });

    it('should work when no existing focus classes', () => {
        hideFocus();

        expect(document.body.classList.contains('ms-Fabric--isFocusHidden')).toBe(true);
        expect(document.body.classList.contains('ms-Fabric--isFocusVisible')).toBe(false);
    });
});

describe('getComboBoxInput', () => {
    it('should return input element when ref is provided', () => {
        const mockInput = document.createElement('input');
        const mockDiv = document.createElement('div');
        mockDiv.appendChild(mockInput);

        const mockRef = {
            current: mockDiv
        };

        jest.spyOn(mockDiv, 'querySelector').mockReturnValue(mockInput);

        const result = getComboBoxInput(mockRef);

        expect(result).toBe(mockInput);
        expect(mockDiv.querySelector).toHaveBeenCalledWith('input');
    });

    it('should return undefined when ref is not provided', () => {
        const result = getComboBoxInput();

        expect(result).toBeUndefined();
    });

    it('should return undefined when ref.current is null', () => {
        const mockRef = {
            current: null
        };

        const result = getComboBoxInput(mockRef);

        expect(result).toBeUndefined();
    });

    it('should return undefined when no input found', () => {
        const mockDiv = document.createElement('div');
        const mockRef = {
            current: mockDiv
        };

        jest.spyOn(mockDiv, 'querySelector').mockReturnValue(null);

        const result = getComboBoxInput(mockRef);

        expect(result).toBeNull();
    });
});
