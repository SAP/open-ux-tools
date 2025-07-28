import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIVirtualList } from '../../../src/components/UIVirtualList';
import type { ListProps, ListRowProps } from 'react-virtualized';
import { List } from 'react-virtualized';

describe('<UIVirtualList />', () => {
    let renderResult: ReturnType<typeof render>;
    let componentRef: React.RefObject<UIVirtualList>;

    const renderRow = (params: ListRowProps) => {
        const { index } = params;
        return <div data-index={index} className="dummyRow"></div>;
    };

    beforeEach(() => {
        componentRef = React.createRef<UIVirtualList>();
        renderResult = render(
            <UIVirtualList
                ref={componentRef}
                width={100}
                height={100}
                rowHeight={25}
                rowCount={10}
                rowRenderer={renderRow}
            />
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        renderResult.unmount();
    });

    it('Should render a UIVirtualList component', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll('div.ReactVirtualized__List').length).toEqual(1);
    });

    it('Public method "recomputeRowHeights"', () => {
        const row = 3;
        const recomputeRowHeightsSpy = jest.spyOn(List.prototype, 'recomputeRowHeights');
        componentRef.current!.recomputeRowHeights(row);
        expect(recomputeRowHeightsSpy).toHaveBeenCalledTimes(1);
        expect(recomputeRowHeightsSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "scrollToRow"', () => {
        const row = 3;
        const scrollToRowSpy = jest.spyOn(List.prototype, 'scrollToRow');
        componentRef.current!.scrollToRow(row);
        expect(scrollToRowSpy).toHaveBeenCalledTimes(1);
        expect(scrollToRowSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "forceListUpdate"', () => {
        const forceUpdateSpy = jest.spyOn(List.prototype, 'forceUpdate');
        componentRef.current!.forceListUpdate();
        expect(forceUpdateSpy).toHaveBeenCalledTimes(1);
    });
});
