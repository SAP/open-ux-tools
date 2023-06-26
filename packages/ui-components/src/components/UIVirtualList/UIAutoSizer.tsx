import React from 'react';
import type { AutoSizerProps } from 'react-virtualized';
import { AutoSizer } from 'react-virtualized';

/**
 * UIAutoSizer component.
 * based on https://github.com/bvaughn/react-virtualized/tree/master/source/AutoSizer
 *
 * @exports
 * @class UIAutoSizer
 * @extends {React.Component<AutoSizerProps, {}>}
 */
export class UIAutoSizer extends React.Component<AutoSizerProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {AutoSizerProps} props
     */
    public constructor(props: AutoSizerProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <AutoSizer {...this.props}>{this.props.children}</AutoSizer>;
    }
}
