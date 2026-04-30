import * as React from 'react';
import { divProperties, getNativeProps } from '@fluentui/react';

import './UIToolbar.scss';

export interface UIToolbarProps {
    className?: string;
    children: React.ReactNode;
    breakPointLarge?: number;
    breakPointMedium?: number;
    breakPointSmall?: number;
    /**
     * An optional callback function triggered when the toolbar is resized.
     *
     * @param {number} width - The new width of the toolbar.
     * @param {string} widthName - The name of the width.
     */
    onResize?(width: number, widthName: string): void;
}

export interface UIToolbarState {
    toolbarWidthClassName: string;
}

/**
 * Resize observer.
 *
 * @class {ResizeObserver}
 */
declare class ResizeObserver {
    /**
     * Initialize class props.
     *
     * @param {any} callback
     */
    constructor(callback: any);
}

/**
 * UIToolbar component.
 *
 * @exports
 * @class {UIToolbar}
 * @extends {React.Component<UIToolbarProps, UIToolbarState>}
 */
export class UIToolbar extends React.Component<UIToolbarProps, UIToolbarState> {
    private readonly toolbarRef: React.RefObject<HTMLDivElement>;
    resizeObserver: any;

    /**
     * Initializes component properties.
     *
     * @param props
     */
    constructor(props: UIToolbarProps) {
        super(props);

        this.state = {
            toolbarWidthClassName: 'column-large'
        };

        this.toolbarRef = React.createRef();
        this.resizeObserver = new ResizeObserver(this.onResize);
    }

    public componentDidMount(): void {
        this.resizeObserver.observe(this.toolbarRef.current);
        this.onResize();
    }

    public onResize = (): void => {
        const toolbarWidth = this.toolbarRef.current?.clientWidth;

        const breakPointLarge = this.props.breakPointLarge ?? 800;
        const breakPointMedium = this.props.breakPointMedium ?? 660;
        const breakPointSmall = this.props.breakPointSmall ?? 420;

        if (!toolbarWidth) {
            return;
        }

        const breakpoints: Array<{ min: number; max: number; className: string; name: string }> = [
            { min: breakPointLarge + 1, max: Infinity, className: 'column-wide', name: 'wide' },
            { min: breakPointMedium + 1, max: breakPointLarge, className: 'column-large', name: 'large' },
            { min: breakPointSmall, max: breakPointMedium, className: 'column-medium', name: 'medium' },
            { min: 0, max: breakPointSmall - 1, className: 'column-small', name: 'small' }
        ];

        const match = breakpoints.find((bp) => toolbarWidth >= bp.min && toolbarWidth <= bp.max);
        if (match) {
            this.setState({ toolbarWidthClassName: match.className });
            this.props.onResize?.(toolbarWidth, match.name);
        }
    };

    /**
     * @returns {React.ReactNode}
     */
    render(): React.ReactNode {
        const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(this.props, divProperties, [
            'className',
            'children'
        ]);
        return (
            <div
                {...divProps}
                tabIndex={-1}
                ref={this.toolbarRef}
                className={`ui-toolbar ${this.state.toolbarWidthClassName} ${
                    this.props.className ? this.props.className : ''
                }`}
                role="toolbar">
                <div className="ui-toolbar__container">
                    <div className="ui-toolbar__content">{this.props.children}</div>
                </div>
            </div>
        );
    }
}
