import React from 'react';
import './UISplitter.scss';
import { UiIcons } from '../Icons';
import { UIIcon } from '../UIIcon';

export interface UISplitterProps {
    type: UISplitterType;
    vertical?: boolean;
    // Hidden valid only for splitter with `Resize` type
    hidden?: boolean;
    onResizeStart?: () => void;
    onResize: (position: number) => boolean;
    onResizeEnd?: () => void;
    onToggle?: () => void;
    title?: string;
    splitterLayoutType?: UISplitterLayoutType;
}

export enum UISplitterType {
    Resize = 'resize',
    Toggle = 'toggle'
}

export enum UISplitterLayoutType {
    Standard = 'standard',
    Compact = 'compact'
}

interface PointPosition {
    x: number;
    y: number;
}

/**
 *
 */
export class UISplitter extends React.Component<UISplitterProps> {
    private readonly splitterOverlay: HTMLDivElement;
    private readonly mousedownPosition: PointPosition = {
        x: 0,
        y: 0
    };
    private readonly rootRef: React.RefObject<HTMLDivElement>;
    private readonly size = 14;
    private readonly compactSize = 8;
    private animationFrame?: number;
    /**
     *
     * @param props
     */
    constructor(props: UISplitterProps) {
        super(props);
        this.rootRef = React.createRef();
        this.stopMousemoveResize = this.stopMousemoveResize.bind(this);
        this.doMousemoveResize = this.doMousemoveResize.bind(this);
        // Splitter overlay DOM for block dom during resize
        this.splitterOverlay = document.createElement('div');
        this.splitterOverlay.setAttribute(
            'class',
            `splitter__overlay ${props.vertical ? 'splitter__overlay--vertical' : 'splitter__overlay--horizontal'}`
        );
    }

    /**
     * Method called on mousedown over splitter.
     * Method would start resize session.
     *
     * @param {React.MouseEvent} event Mouse.
     */
    private startSplitterMove(event: React.MouseEvent): void {
        this.mousedownPosition.x = event.clientX;
        this.mousedownPosition.y = event.clientY;
        // Update DOM
        this.updateSplitterEvents(true);
        // Stop event bubbling
        event.stopPropagation();
    }

    /**
     * Method called when resize session is in progress and user moves mouse.
     *
     * @param {React.MouseEvent} event Mouse event.
     */
    private doMousemoveResize(event: MouseEvent): void {
        const propertyName = this.props.vertical ? 'clientY' : 'clientX';
        const coordinateNameName = this.props.vertical ? 'y' : 'x';

        const newPosition = event[propertyName] - this.mousedownPosition[coordinateNameName];
        this.doResize(newPosition);
    }

    /**
     * Method which receives new delta position of splitter and updates DOM with calling callback.
     *
     * @param {number} deltaPosition Delta position of splitter.
     */
    private doResize(deltaPosition: number): void {
        const cssPropertyName = this.props.vertical ? 'top' : 'left';
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
        }
        this.animationFrame = window.requestAnimationFrame(() => {
            // Call callback
            if (this.props.onResize(deltaPosition)) {
                // Update resizer DOM
                const dom = this.rootRef.current;
                if (dom) {
                    dom.style[cssPropertyName] = `${deltaPosition - this.size / 2}px`;
                }
            }
        });
    }

    /**
     * Method called on mouseup or mouseleave events.
     * Method would end resize session.
     */
    private stopMousemoveResize(): void {
        this.updateSplitterEvents(false);
    }

    /**
     * Method to update splitter DOM and events depending on if resize started or ended.
     *
     * @param {boolean} start Resize is started or ended.
     */
    private updateSplitterEvents(start: boolean): void {
        if (start) {
            document.body.addEventListener('mouseup', this.stopMousemoveResize);
            document.body.addEventListener('mouseleave', this.stopMousemoveResize);
            document.body.addEventListener('mousemove', this.doMousemoveResize);
            document.body.appendChild(this.splitterOverlay);
        } else {
            document.body.removeEventListener('mouseup', this.stopMousemoveResize);
            document.body.removeEventListener('mouseleave', this.stopMousemoveResize);
            document.body.removeEventListener('mousemove', this.doMousemoveResize);
            document.body.removeChild(this.splitterOverlay);
        }
        if (start && this.props.onResizeStart) {
            this.props.onResizeStart();
        } else if (!start && this.props.onResizeEnd) {
            this.props.onResizeEnd();
        }
    }

    /**
     * Method called when clicked over splitter and splitter type is 'Toggle'.
     */
    private toggleSplitter(): void {
        if (this.props.onToggle) {
            this.props.onToggle();
        }
    }

    /**
     * Gets icon.
     *
     * @param type
     * @param splitterLayoutType
     * @returns {string}
     */
    private getIcon(
        type: UISplitterType,
        splitterLayoutType: UISplitterLayoutType = UISplitterLayoutType.Standard
    ): string {
        if (type === UISplitterType.Toggle) {
            return UiIcons.ArrowLeft;
        } else if (splitterLayoutType === UISplitterLayoutType.Compact) {
            return UiIcons.Grabber;
        } else {
            return UiIcons.VerticalGrip;
        }
    }

    /**
     * Method called when keydown events fired while splitter is focused.
     * Method enables support for resize using keyboard.
     *
     * @param {React.KeyboardEvent<HTMLDivElement>} event KeyDown event.
     */
    private onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        if (this.props.type === UISplitterType.Resize) {
            const stepSize = 10;
            let deltaPosition = 0;
            if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
                deltaPosition = -stepSize;
            } else if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
                deltaPosition = stepSize;
            }
            if (deltaPosition === 0) {
                // There no resize with keyboard
                return;
            }
            // Do full resize cycle - start, move and end
            if (this.props.onResizeStart) {
                this.props.onResizeStart();
            }
            this.doResize(deltaPosition);
            if (this.props.onResizeEnd) {
                this.props.onResizeEnd();
            }
        } else if (this.props.type === UISplitterType.Toggle && event.key === 'Enter') {
            this.toggleSplitter();
        }
    }

    /**
     * Method returns class names string depending on props and component state.
     *
     * @returns {number} Minimal size of section.
     */
    getClassNames(): string {
        const { type, vertical, hidden, splitterLayoutType } = this.props;
        let classNames = `splitter splitter--${type}`;
        // vertical or horizontal
        classNames += ` ${vertical ? 'splitter--vertical' : 'splitter--horizontal'}`;
        if (hidden && type === UISplitterType.Resize) {
            classNames += ' splitter--hidden';
        }
        classNames += ` ${
            splitterLayoutType === UISplitterLayoutType.Standard ? 'splitter--standard' : 'splitter--compact'
        }`;
        return classNames;
    }

    /**
     * @returns {React.ReactElement}
     */
    render(): React.ReactElement {
        const { type, vertical, hidden, title, splitterLayoutType } = this.props;
        const size = splitterLayoutType === UISplitterLayoutType.Standard ? this.size : this.compactSize;
        const splitterOffset = type === UISplitterType.Toggle ? -size : -size / 2;
        const role = type === UISplitterType.Toggle ? 'button' : 'separator';
        const orientation = vertical ? 'horizontal' : 'vertical';
        let ariaPressed: boolean | undefined;
        if (type === UISplitterType.Toggle) {
            ariaPressed = hidden ? false : true;
        }
        return (
            <div
                ref={this.rootRef}
                role={role}
                aria-orientation={orientation}
                aria-pressed={ariaPressed}
                title={title}
                tabIndex={type === UISplitterType.Toggle ? 0 : -1}
                onKeyDown={this.onKeyDown.bind(this)}
                style={{
                    ...(vertical && { height: size, top: splitterOffset }),
                    ...(!vertical && { width: size, left: splitterOffset })
                }}
                onMouseDown={
                    type === UISplitterType.Resize
                        ? (event: React.MouseEvent): void => this.startSplitterMove(event)
                        : undefined
                }
                onClick={type === UISplitterType.Toggle ? (): void => this.toggleSplitter() : undefined}
                className={this.getClassNames()}>
                <div className="splitter__grip">
                    <UIIcon iconName={this.getIcon(type, splitterLayoutType)} />
                </div>
            </div>
        );
    }
}
