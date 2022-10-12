import React from 'react';
import type { CellMeasurerProps } from 'react-virtualized';
import { CellMeasurer } from 'react-virtualized';
export { Index, OnScrollParams } from 'react-virtualized';
/**
 * UIVirtualList component
 * based on https://github.com/bvaughn/react-virtualized/tree/master/source/List
 *
 * @exports
 * @class UIVirtualList
 * @extends {React.Component<CellMeasurerProps, {}>}
 */
export class UICellMeasurer extends React.Component<CellMeasurerProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {CellMeasurerProps} props
     */
    public constructor(props: CellMeasurerProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <CellMeasurer {...this.props}>{this.props.children}</CellMeasurer>;
    }
}
