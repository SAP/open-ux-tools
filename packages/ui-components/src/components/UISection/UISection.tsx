import React from 'react';
import './UISection.scss';

export enum UISectionLayout {
    Standard = 'standard',
    Extended = 'extended'
}

export interface UISectionProps {
    title?: string;
    height?: string;
    className?: string;
    hidden?: boolean;
    // Default Standard
    layout?: UISectionLayout;
    collapsible?: boolean;
    // Default true
    scrollable?: boolean;
    // No padding or margin
    cleanPadding?: boolean;
    // DOM ref reference
    rootRef?: React.RefObject<HTMLDivElement>;
    // Scroll event
    onScroll?: () => void;
}

/**
 * Section Component.
 *
 * @exports
 * @class {UISection}
 * @extends {React.Component<UISectionProps>}
 */
export class UISection extends React.Component<UISectionProps & Readonly<{ children?: React.ReactNode }>> {
    private onScroll(): void {
        if (this.props.onScroll) {
            this.props.onScroll();
        }
    }

    /**
     * @returns {React.ReactElement}
     */
    render(): React.ReactElement {
        const scrollable = this.props.scrollable === undefined || this.props.scrollable;
        const style: React.CSSProperties = {};
        const layout = this.props.layout || UISectionLayout.Standard;
        if ('height' in this.props) {
            style.height = this.props.height;
        }
        return (
            <div
                className={`section${this.props.className ? ' ' + this.props.className : ''} section--${layout}${
                    scrollable ? ' section--scrollable' : ''
                }${this.props.cleanPadding ? ' section--clean' : ''}${this.props.hidden ? ' section--hidden' : ''}`}
                style={style}
                ref={this.props.rootRef}>
                {this.props.title && (
                    <div className="section__header">
                        <div>
                            <span className="section__header__title ui-medium-header">{this.props.title}</span>
                        </div>
                    </div>
                )}
                <div className="section__body" onScroll={this.onScroll.bind(this)}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}
