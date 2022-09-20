import * as React from 'react';
import './UIToolbar.scss';

export interface UIToolbarProps {
    className?: string;
    children: React.ReactNode;
    breakPointLarge?: number;
    breakPointMedium?: number;
    breakPointSmall?: number;
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
    private toolbarRef: React.RefObject<HTMLDivElement>;
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

        let breakPointLarge = 800;
        let breakPointMedium = 660;
        let breakPointSmall = 420;

        if (this.props.breakPointLarge) {
            breakPointLarge = this.props.breakPointLarge;
        }
        if (this.props.breakPointMedium) {
            breakPointMedium = this.props.breakPointMedium;
        }
        if (this.props.breakPointSmall) {
            breakPointSmall = this.props.breakPointSmall;
        }

        let toolbarWidthClassName = this.state.toolbarWidthClassName;
        let widthName = '';

        if (toolbarWidth) {
            if (toolbarWidth > breakPointLarge) {
                toolbarWidthClassName = 'column-wide';
                widthName = 'wide';
            }
            if (toolbarWidth > breakPointMedium && toolbarWidth <= breakPointLarge) {
                toolbarWidthClassName = 'column-large';
                widthName = 'large';
            }
            if (toolbarWidth >= breakPointSmall && toolbarWidth <= breakPointMedium) {
                toolbarWidthClassName = 'column-medium';
                widthName = 'medium';
            }
            if (toolbarWidth < breakPointSmall) {
                toolbarWidthClassName = 'column-small';
                widthName = 'small';
            }
            this.setState({
                toolbarWidthClassName: toolbarWidthClassName
            });

            if (this.props.onResize) {
                this.props.onResize(toolbarWidth, widthName);
            }
        }
    };

    /**
     * @returns {React.ReactNode}
     */
    render(): React.ReactNode {
        return (
            <div
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
