import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIList } from '../../../src/components/UIList';
import type { IGroup } from '@fluentui/react';

const groups: IGroup[] = [
    { key: 'group1', name: 'Group 1', startIndex: 0, count: 2, isCollapsed: false },
    { key: 'group2', name: 'Group 2', startIndex: 2, count: 1, isCollapsed: false }
];

const items: any[] = [
    { id: 1, name: 'Item 1', description: 'First item' },
    { id: 2, name: 'Item 2', description: 'Second item' },
    { id: 3, name: 'Item 3', description: 'Third item' }
];

const onRenderCell = (
    _nestingDepth?: number,
    _item?: { id: number; name: string; description: string },
    index?: number
): React.ReactNode => <div data-testid={`cell-${index}`}>Cell {index}</div>;

describe('UIList', () => {
    it('renders all group headers', () => {
        render(
            <UIList
                groups={groups}
                items={items}
                onSelect={jest.fn()}
                onRenderCell={onRenderCell}
                useVirtualization={false}
            />
        );
        expect(screen.getByText('Group 1')).toBeInTheDocument();
        expect(screen.getByText('Group 2')).toBeInTheDocument();
    });

    it('renders all cells', () => {
        render(
            <UIList
                groups={groups}
                items={items}
                onSelect={jest.fn()}
                onRenderCell={onRenderCell}
                useVirtualization={false}
            />
        );
        expect(screen.getByTestId('cell-0')).toBeInTheDocument();
        expect(screen.getByTestId('cell-1')).toBeInTheDocument();
        expect(screen.getByTestId('cell-2')).toBeInTheDocument();
    });

    it('calls onSelect when group header is clicked', () => {
        const onSelect = jest.fn();
        render(
            <UIList
                groups={groups}
                items={items}
                onSelect={onSelect}
                onRenderCell={onRenderCell}
                useVirtualization={false}
            />
        );
        const groupHeader = screen.getByText('Group 1');
        fireEvent.click(groupHeader);
        expect(onSelect).toHaveBeenCalledWith(groups[0]);
    });

    it('applies custom groupProps', () => {
        const customGroupProps = { isAllGroupsCollapsed: false };
        render(
            <UIList
                groups={groups}
                items={items}
                onSelect={jest.fn()}
                onRenderCell={onRenderCell}
                groupProps={customGroupProps}
                useVirtualization={false}
            />
        );
        expect(screen.getByText('Group 1')).toBeInTheDocument();
    });

    it('matches snapshot', () => {
        const { container } = render(
            <UIList
                groups={groups}
                items={items}
                onSelect={jest.fn()}
                onRenderCell={onRenderCell}
                useVirtualization={false}
            />
        );
        expect(container).toMatchSnapshot();
    });
});
