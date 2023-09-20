import type { ReactElement, PropsWithChildren } from 'react';
import React from 'react';

import { UIToolbar, UIToolbarColumn } from '@sap-ux/ui-components';

import './ToolBar.scss';

export interface ToolbarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
}
/**
 * React element with children.
 *
 * @param propsWithChildren PropsWithChildren<ToolbarProps>
 * @returns ReactElement
 */
export function Toolbar(propsWithChildren: PropsWithChildren<ToolbarProps>): ReactElement {
    const { left, right, children } = propsWithChildren;
    return (
        <UIToolbar>
            <UIToolbarColumn className="column-left">{left ?? children}</UIToolbarColumn>
            <UIToolbarColumn className="column-right">{right}</UIToolbarColumn>
        </UIToolbar>
    );
}
