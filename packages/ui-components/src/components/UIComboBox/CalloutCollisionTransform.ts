import type { ICalloutPositionedInfo } from '@fluentui/react';

const defaultProps: CalloutCollisionTransformProps = {
    target: '.ms-Dialog-actions',
    container: '.ms-Dialog-main'
};

export interface CalloutCollisionTransformProps {
    // Parent selectors
    container: string;
    target: string;
}

/**
 * This class is responsible for Dialog/Container element transformation to avoid collision/overlap between Callout/Dropdown Menu and target element.
 * In example when multi select dropdown is used inside dialog with actions,
 *  then class will apply transformation dialog to make sure that dialog actions and dropdown menu is visible.
 */
export class CalloutCollisionTransform {
    private resetOptions: Partial<CSSStyleDeclaration> = {};
    private props: CalloutCollisionTransformProps;
    // ToDo
    private source: React.RefObject<HTMLElement>;
    // Placeholder element for additional space
    private placeholder?: HTMLElement;

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

    /**
     *
     * @param position
     */
    public applyTransformation(position?: ICalloutPositionedInfo): void {
        console.log('applyTransformation(CalloutCollisionTransform)');
        console.log(position);
        // Just demo code...
        const targetElement = document.querySelector(this.props.target) as HTMLElement;
        if (targetElement && position) {
            const targetPosition = targetElement.getBoundingClientRect();
            // ToDo - get height
            const height = 200 + 20;
            const top = position.elementPosition.top || 0;
            const diff = top + height - targetPosition.top;
            console.log(`isOverlapped -> ${diff}`);
            if (diff < 0) {
                return;
            }

            const dialog = document.querySelector(this.props.container) as HTMLElement;
            const dialogPos = dialog.getBoundingClientRect();
            if (dialog && dialogPos) {
                this.resetOptions = {
                    transform: dialog.style.transform,
                    position: dialog.style.position,
                    top: dialog.style.top,
                    left: dialog.style.left
                };
                dialog.style.transform = '';
                dialog.style.position = 'absolute';
                dialog.style.top = `${dialogPos.top}px`;
                dialog.style.left = `${dialogPos.left}px`;
            }
            // Apply placeholder element - gap to make target visible
            this.placeholder = this.createPlaceholder(diff);
            targetElement.prepend(this.placeholder);
        }
    }

    public resetTransformation(): void {
        console.log('resetTransformation(CalloutCollisionTransform)');
        const dialog = document.querySelector(this.props.container) as HTMLElement;
        const dialogPos = dialog.getBoundingClientRect();
        if (dialog && dialogPos) {
            for (const styleName in this.resetOptions) {
                if (this.resetOptions[styleName]) {
                    dialog.style[styleName] = this.resetOptions[styleName] || '';
                }
            }
        }
        // Remove placeholder element
        const targetElement = document.querySelector(this.props.target) as HTMLElement;
        if (targetElement && this.placeholder) {
            targetElement.removeChild(this.placeholder);
            this.placeholder = undefined;
        }
    }

    public preventDismissOnEvent = (
        event: Event | React.FocusEvent<Element> | React.KeyboardEvent<Element> | React.MouseEvent<Element, MouseEvent>
    ) => {
        console.log('preventDismissOnEvent(CalloutCollisionTransform)');
        const targetElement = document.querySelector(this.props.target) as HTMLElement;
        if (event.type === 'focus' && targetElement.contains(event.target as HTMLElement)) {
            return true;
        }
        return false;
    };
}
