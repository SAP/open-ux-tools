import * as React from 'react';
import * as Enzyme from 'enzyme';
import { UIVirtualList } from '../../../src/components/UIVirtualList';
import type { ListProps, ListRowProps } from 'react-virtualized';
import { List } from 'react-virtualized';

describe('<UIVirtualList />', () => {
    let wrapper: Enzyme.ReactWrapper<ListProps>;

    const renderRow = (params: ListRowProps) => {
        const { index } = params;
        return <div data-index={index} className="dummyRow"></div>;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UIVirtualList width={100} height={100} rowHeight={25} rowCount={10} rowRenderer={renderRow} />
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Should render a UIVirtualList component', () => {
        expect(wrapper.find('div.ReactVirtualized__List').length).toEqual(1);
    });

    it('Public method "recomputeRowHeights"', () => {
        const row = 3;
        const recomputeRowHeightsSpy = jest.spyOn(List.prototype, 'recomputeRowHeights');
        (wrapper.instance() as UIVirtualList).recomputeRowHeights(row);
        expect(recomputeRowHeightsSpy).toBeCalledTimes(1);
        expect(recomputeRowHeightsSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "scrollToRow"', () => {
        const row = 3;
        const scrollToRowSpy = jest.spyOn(List.prototype, 'scrollToRow');
        (wrapper.instance() as UIVirtualList).scrollToRow(row);
        expect(scrollToRowSpy).toBeCalledTimes(1);
        expect(scrollToRowSpy).toHaveBeenCalledWith(row);
    });

    it('Public method "forceListUpdate"', () => {
        const forceUpdateSpy = jest.spyOn(List.prototype, 'forceUpdate');
        (wrapper.instance() as UIVirtualList).forceListUpdate();
        expect(forceUpdateSpy).toBeCalledTimes(1);
    });
});
