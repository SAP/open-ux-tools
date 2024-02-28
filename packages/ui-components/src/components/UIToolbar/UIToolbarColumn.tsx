import * as React from 'react';
import { divProperties, getNativeProps } from '@fluentui/react';

import './UIToolbar.scss';

export interface UIColumnProps {
    children: React.ReactNode;
    className?: string;
}

export const UIToolbarColumn: React.FC<UIColumnProps> = (props: UIColumnProps) => {
    const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(props, divProperties, [
        'className',
        'children'
    ]);
    return (
        <div {...divProps} className={'ui-toolbar__column ' + props.className}>
            <div className="ui-toolbar__column__content">{props.children}</div>
        </div>
    );
};
