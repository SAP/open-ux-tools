// Default properties which applies for dialog scenario with footer buttons
const defaultProps = {
    target: '.ms-Dialog-actions',
    container: '.ms-Dialog-main',
    absolute: true,
    minPagePadding: 10
};

export interface CalloutCollisionTransformProps {
    container: string;
    target: string;
    absolute?: boolean;
}

interface TransformationElement {
    dom: HTMLElement;
    rect: DOMRect;
}

interface TransformationElements {
    container: TransformationElement;
    target: TransformationElement;
    source: TransformationElement;
    callout?: TransformationElement;
}

const TRANSFORMATION_OFFSET = 20;

/**
 * This class is responsible for Dialog/Container element transformation to avoid collision/overlap between Callout/Dropdown Menu and target element.
 * In example when multi select dropdown is used inside dialog with actions,
 *  then class will apply transformation dialog to make sure that dialog actions and dropdown menu is visible.
 */
export class CalloutCollisionTransform {
    // Option properties
    private readonly props: CalloutCollisionTransformProps;
    // Source reference of anchor element
    private readonly source: React.RefObject<HTMLElement>;
    private readonly callout: React.RefObject<HTMLElement>;
    // Placeholder element for additional space
    private placeholder?: HTMLElement;
    // Original style properties of container
    private originalStyle: Partial<CSSStyleDeclaration> = {};

    /**
     * Initializes class with options.
     *
     * @param source Source element.
     * @param callout Dropdown menu/callout element.
     * @param props Transformation properties.
     */
    constructor(
        source: React.RefObject<HTMLElement>,
        callout: React.RefObject<HTMLElement>,
        props: CalloutCollisionTransformProps = defaultProps
    ) {
        this.source = source;
        this.callout = callout;
        this.props = props;
        this.applyTransformation = this.applyTransformation.bind(this);
        this.resetTransformation = this.resetTransformation.bind(this);
        this.preventDismissOnEvent = this.preventDismissOnEvent.bind(this);
    }

    /**
     * Method creates placeholder element with given size.
     *
     * @param size Size of placeholder.
     * @returns HTML element for placeholder.
     */
    private createPlaceholder(size: number): HTMLElement {
        const element = document.createElement('div');
        element.classList.add('ts-Callout-transformation');
        element.style.height = `${size}px`;
        return element;
    }

    /**
     * Method returns DOM elements and rectangles of associated elements(container, target, callout).
     *
     * @returns DOM elements and rectangles of associated elements.
     */
    private getElements(): TransformationElements | undefined {
        const source = this.source.current;
        const container = source?.closest<HTMLElement>(this.props.container);
        if (container && source) {
            const target = container?.querySelector<HTMLElement>(this.props.target);
            if (target) {
                const elements: TransformationElements = {
                    container: {
                        dom: container,
                        rect: container.getBoundingClientRect()
                    },
                    target: {
                        dom: target,
                        rect: target.getBoundingClientRect()
                    },
                    source: {
                        dom: source,
                        rect: source.getBoundingClientRect()
                    }
                };
                const callout = this.callout.current;
                if (callout) {
                    elements.callout = { dom: callout, rect: callout.getBoundingClientRect() };
                }
                return elements;
            }
        }
        return undefined;
    }

    /**
     * Method calculates callout overlap with target and applies transformation to make target visible.
     */
    public applyTransformation(): void {
        const elements = this.getElements();
        if (!elements) {
            return;
        }
        const { container, target, callout, source } = elements;
        if (callout) {
            const maxHeight = window.innerHeight - defaultProps.minPagePadding;
            const height = callout.rect.height;
            const top = source.rect.bottom;
            // Calculate if action is overlaps
            let diff = top + height - target.rect.top;
            let bottomPosition = top + callout.rect.height;
            if (diff <= 0 || bottomPosition >= maxHeight) {
                return;
            }
            // Apply additional offset to make target more visible
            bottomPosition += target.rect.height;
            if (bottomPosition <= maxHeight) {
                diff += TRANSFORMATION_OFFSET;
            }
            // Apply absolute position to fix position and avoid recentering
            if (this.props.absolute) {
                const containerStyle = container.dom.style;
                this.originalStyle = {
                    transform: containerStyle.transform,
                    position: containerStyle.position,
                    top: containerStyle.top,
                    left: containerStyle.left
                };
                containerStyle.transform = '';
                containerStyle.position = 'absolute';
                containerStyle.top = `${container.rect.top}px`;
                containerStyle.left = `${container.rect.left}px`;
            }
            // Apply placeholder element - gap to make target visible
            this.placeholder = this.createPlaceholder(diff);
            target.dom.prepend(this.placeholder);
        }
    }

    /**
     * Method resets current applied transformation.
     */
    public resetTransformation(): void {
        const elements = this.getElements();
        if (!elements) {
            return;
        }
        const { container, target } = elements;
        for (const styleName in this.originalStyle) {
            const styleValue = this.originalStyle[styleName];
            if (typeof styleValue === 'string') {
                container.dom.style[styleName] = styleValue;
            }
        }
        this.originalStyle = {};
        // Remove placeholder element
        if (this.placeholder) {
            this.placeholder.remove();
            this.placeholder = undefined;
        }
    }

    /**
     * Method prevents callout dismiss/close if focus/click on target elements.
     *
     * @param event Triggered event to check.
     * @returns Returns true if callout should not be closed.
     */
    public preventDismissOnEvent(
        event: Event | React.FocusEvent<Element> | React.KeyboardEvent<Element> | React.MouseEvent<Element, MouseEvent>
    ): boolean {
        const elements = this.getElements();
        if (event.type === 'focus' && elements?.target.dom.contains(event.target as HTMLElement)) {
            return true;
        }
        return false;
    }
}
