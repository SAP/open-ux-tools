import * as React from 'react';
import './UIToolbar.scss';

export interface UIToolbarDividerProps {
    hiddenSmallScreen?: boolean;
    showSmallScreen?: boolean;
    hiddenMediumScreen?: boolean;
    showMediumScreen?: boolean;
}

/**
 * UIToolbarDivider component.
 *
 * @exports
 * @class UIToolbarDivider
 + @extends {React.Component<UIToolbarDividerProps, {}>}
 */
export class UIToolbarDivider extends React.Component<UIToolbarDividerProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param props
     */
    constructor(props: UIToolbarDividerProps) {
        super(props);
    }

    /**
     * @returns {React.ReactNode}
     */
    render(): React.ReactNode {
        return (
            <div
                className={`ui-divider 
                    ${this.props.hiddenSmallScreen ? 'hidden-xs' : ''} 
                    ${this.props.showSmallScreen ? 'show-xs' : ''}
                    ${this.props.hiddenMediumScreen ? 'hidden-md' : ''} 
                    ${this.props.showMediumScreen ? 'show-md' : ''}`}
            />
        );
    }
}
