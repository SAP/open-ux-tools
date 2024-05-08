import type { ReactElement } from 'react';
import React from 'react';

import { Text } from '@fluentui/react';

import { sectionHeaderFontSize } from '../properties/constants';

export interface ChangeStackHeaderProps {
    backgroundColor: string;
    color: string;
    text: string;
    tooltip?: string;
    fontSize?: string;
    isMessageHeader?: boolean;
}

/**
 * React element of header of change stack.
 *
 * @param changeStackHeaderProps ChangeStackHeaderProps
 * @returns ReactElement
 */
export function ChangeStackHeader(changeStackHeaderProps: ChangeStackHeaderProps): ReactElement {
    const { backgroundColor, color, text, tooltip, fontSize, isMessageHeader } = changeStackHeaderProps;
    return (
        <div
            style={{
                backgroundColor: backgroundColor,
                padding: isMessageHeader ? '0px 15px' : '6px 15px'
            }}>
            <Text
                style={{
                    color: color,
                    fontSize: fontSize ?? sectionHeaderFontSize,
                    fontWeight: 'bold',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflowX: 'hidden',
                    lineHeight: '18px',
                    display: 'block'
                }}
                title={tooltip}>
                {text}
            </Text>
        </div>
    );
}
