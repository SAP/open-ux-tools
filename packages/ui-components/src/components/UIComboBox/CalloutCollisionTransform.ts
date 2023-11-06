import type { ICalloutPositionedInfo } from '@fluentui/react';

const defaultProps: CalloutCollisionTransformProps = {
    target: '.ms-Dialog-actions',
    container: '.ms-Dialog-main'
};

export interface CalloutCollisionTransformProps {
    // Parent selectors
    container: string;
    target: string;
    // ToOo
    absolute?: boolean;
}

interface TransformationElement {
    dom: HTMLElement;
    rect: DOMRect;
}

interface TransformationElements {
    container: TransformationElement;
    target: TransformationElement;
}

/**
 * This class is responsible for Dialog/Container element transformation to avoid collision/overlap between Callout/Dropdown Menu and target element.
 * In example when multi select dropdown is used inside dialog with actions,
 *  then class will apply transformation dialog to make sure that dialog actions and dropdown menu is visible.
 */
export class CalloutCollisionTransform {
    // Option properties
    private props: CalloutCollisionTransformProps;
    // Source reference of anchor element
    private source: React.RefObject<HTMLElement>;
    // Placeholder element for additional space
    private placeholder?: HTMLElement;
    // Original style properties of container
    private originalStyle: Partial<CSSStyleDeclaration> = {};

    /**
     * Initializes class with options.
     *
     * @param source Source element.
     * @param props Transformation properties.
     */
    constructor(source: React.RefObject<HTMLElement>, props: CalloutCollisionTransformProps = defaultProps) {
        this.source = source;
        this.props = props;
        this.applyTransformation = this.applyTransformation.bind(this);
        this.resetTransformation = this.resetTransformation.bind(this);
        this.preventDismissOnEvent = this.preventDismissOnEvent.bind(this);
    }

    private createPlaceholder(size: number): HTMLElement {
        const element = document.createElement('div');
        element.style.height = `${size}px`;
        return element;
    }

    private getElements(): TransformationElements | undefined {
        const container = this.source.current?.closest<HTMLElement>(this.props.container);
        if (container) {
            const target = container?.querySelector<HTMLElement>(this.props.target);
            if (target) {
                return {
                    container: {
                        dom: container,
                        rect: container.getBoundingClientRect()
                    },
                    target: {
                        dom: target,
                        rect: target.getBoundingClientRect()
                    }
                };
            }
        }
    }

    /**
     *
     * @param position
     */
    public applyTransformation(position?: ICalloutPositionedInfo): void {
        console.log('applyTransformation(CalloutCollisionTransform)');
        const elements = this.getElements();
        if (!elements) {
            return;
        }
        const { container, target } = elements;
        if (target && position) {
            // ToDo - get height
            const height = 200 + 20;
            const top = position.elementPosition.top || 0;
            const diff = top + height - target.rect.top;
            if (diff < 0) {
                return;
            }

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

            // Apply placeholder element - gap to make target visible
            this.placeholder = this.createPlaceholder(diff);
            target.dom.prepend(this.placeholder);
        }
    }

    public resetTransformation(): void {
        console.log('resetTransformation(CalloutCollisionTransform)');
        const elements = this.getElements();
        if (!elements) {
            return;
        }
        const { container, target } = elements;
        for (const styleName in this.originalStyle) {
            if (this.originalStyle[styleName]) {
                container.dom.style[styleName] = this.originalStyle[styleName] || '';
            }
        }
        // Remove placeholder element
        if (this.placeholder) {
            target.dom.removeChild(this.placeholder);
            this.placeholder = undefined;
        }
    }

    public preventDismissOnEvent = (
        event: Event | React.FocusEvent<Element> | React.KeyboardEvent<Element> | React.MouseEvent<Element, MouseEvent>
    ) => {
        console.log('preventDismissOnEvent(CalloutCollisionTransform)');
        const elements = this.getElements();
        if (event.type === 'focus' && elements?.target.dom.contains(event.target as HTMLElement)) {
            return true;
        }
        return false;
    };
}
