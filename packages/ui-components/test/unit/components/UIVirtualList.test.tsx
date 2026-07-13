import * as React from 'react';
import { render } from '@testing-library/react';
import { UIVirtualList } from '../../../src/components/UIVirtualList';
import type { ListRowProps } from 'react-virtualized';
import { List } from 'react-virtualized';

describe('<UIVirtualList />', () => {
    const renderRow = (params: ListRowProps) => {
        const { index } = params;
        return <div data-index={index} className="dummyRow"></div>;
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a UIVirtualList component', () => {
        const { container } = render(
            <UIVirtualList width={100} height={100} rowHeight={25} rowCount={10} rowRenderer={renderRow} />
        );
        expect(container.querySelectorAll('div.ReactVirtualized__List').length).toEqual(1);
    });

    it('Public method "recomputeRowHeights"', () => {
        const row = 3;
        const ref = React.createRef<UIVirtualList>();
        const recomputeRowHeightsSpy = jest.spyOn(List.prototype, 'recomputeRowHeights');
        render(
            <UIVirtualList ref={ref} width={100} height={100} rowHeight={25} rowCount={10} rowRenderer={renderRow} />
        );
        ref.current!.recomputeRowHeights(row);
        expect(recomputeRowHeightsSpy).toHaveBeenCalledTimes(1);
        expect(recomputeRowHeightsSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "scrollToRow"', () => {
        const row = 3;
        const ref = React.createRef<UIVirtualList>();
        const scrollToRowSpy = jest.spyOn(List.prototype, 'scrollToRow');
        render(
            <UIVirtualList ref={ref} width={100} height={100} rowHeight={25} rowCount={10} rowRenderer={renderRow} />
        );
        ref.current!.scrollToRow(row);
        expect(scrollToRowSpy).toHaveBeenCalledTimes(1);
        expect(scrollToRowSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "forceListUpdate"', () => {
        const ref = React.createRef<UIVirtualList>();
        const forceUpdateSpy = jest.spyOn(List.prototype, 'forceUpdate');
        render(
            <UIVirtualList ref={ref} width={100} height={100} rowHeight={25} rowCount={10} rowRenderer={renderRow} />
        );
        ref.current!.forceListUpdate();
        expect(forceUpdateSpy).toHaveBeenCalledTimes(1);
    });
});
