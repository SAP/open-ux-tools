import * as React from 'react';
import './UIToolbar.scss';

export interface UIColumnProps {
    children: React.ReactNode;
    className?: string;
}

export const UIToolbarColumn: React.FC<UIColumnProps> = (props: UIColumnProps) => {
    return (
        <div className={'ui-toolbar__column ' + props.className}>
            <div className="ui-toolbar__column__content">{props.children}</div>
        </div>
    );
};
