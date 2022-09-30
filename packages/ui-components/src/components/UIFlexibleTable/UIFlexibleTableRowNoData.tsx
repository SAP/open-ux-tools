import React from 'react';
import { UIFlexibleTableNoDataAlignment } from './types';
import { composeClassNames } from './utils';

export interface UIFlexibleTableRowNoDataProps {
    children?: string | React.ReactElement;
    align?: UIFlexibleTableNoDataAlignment;
    noRowBackground?: boolean;
    reverseBackground?: boolean;
}

/**
 * Visualize a table row without data.
 *
 * @param props {UIFlexibleTableRowNoDataProps}
 * @returns {React.Component}
 */
export function UIFlexibleTableRowNoData(props: UIFlexibleTableRowNoDataProps) {
    const { align = UIFlexibleTableNoDataAlignment.Center, noRowBackground, reverseBackground } = props;
    const rowClassName = composeClassNames('flexible-table-content-table-row-no-data', [
        noRowBackground ? 'no-background' : '',
        reverseBackground && !noRowBackground ? 'reverse-background' : '',
        'odd'
    ]);
    return (
        <li
            className={rowClassName}
            style={{
                textAlign: align
            }}>
            {props.children}
        </li>
    );
}
