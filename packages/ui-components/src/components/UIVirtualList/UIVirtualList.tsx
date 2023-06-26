import React from 'react';
import type { ListProps } from 'react-virtualized';
import { List } from 'react-virtualized';
export {
    CellMeasurerCache,
    ListRowProps,
    SectionRenderedParams,
    GridState,
    defaultCellRangeRenderer,
    GridCellRangeProps,
    VisibleCellRange
} from 'react-virtualized';

/**
 * UIVirtualList component.
 * based on https://github.com/bvaughn/react-virtualized/tree/master/source/List.
 *
 * @exports
 * @class UIVirtualList
 * @extends {React.Component<ListProps, {}>}
 */
export class UIVirtualList extends React.Component<ListProps, {}> {
    private listRef = React.createRef<List>();
    /**
     * Initializes component properties.
     *
     * @param {CellMeasurerProps} props
     */
    public constructor(props: ListProps) {
        super(props);
    }

    public forceListUpdate() {
        if (this.listRef.current) {
            this.listRef.current.forceUpdate();
        }
    }

    /**
     * Scrolls to the row based on index.
     *
     * @param index
     */
    public scrollToRow(index?: number) {
        if (this.listRef.current) {
            this.listRef.current.scrollToRow(index);
        }
    }

    /**
     * Method to compute row height.
     *
     * @param {number} index
     */
    public recomputeRowHeights(index?: number): void {
        if (this.listRef.current) {
            this.listRef.current.recomputeRowHeights(index);
        }
    }

    /**
     * Method returns state of component isScrolling.
     *
     * @returns {boolean}
     */
    public isScrolling(): boolean {
        return !!this.listRef.current?.Grid?.state.isScrolling;
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <List ref={this.listRef} {...this.props}>
                {this.props.children}
            </List>
        );
    }
}
