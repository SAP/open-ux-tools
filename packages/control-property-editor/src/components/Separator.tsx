import type { CSSProperties, DetailedHTMLProps, HTMLAttributes, ReactElement } from 'react';
import React from 'react';

interface SeparatorProps {
    direction?: 'horizontal' | 'vertical';
}

/**
 * React element for seperator.
 *
 * @param separatorProps SeparatorProps & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
 * @returns ReactElement
 */
export function Separator(
    separatorProps: SeparatorProps & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>
): ReactElement {
    const { direction, style, ...rest } = separatorProps;
    const isVertical = direction === 'vertical';
    const borderProp = isVertical ? 'borderLeft' : 'borderBottom';
    const inlineStyles: CSSProperties = {
        ...{
            [borderProp]: '1px solid var(--vscode-menu-separatorBackground)'
        },
        ...style
    };

    if (isVertical) {
        inlineStyles.height = '100%';
    }

    return <div style={inlineStyles} {...rest} />;
}
