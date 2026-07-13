import * as React from 'react';
import { render } from '@testing-library/react';
import type { ICheckboxStyles, IRawStyle } from '@fluentui/react';
import { UICheckbox } from '../../../src/components/UICheckbox';

describe('<UIToggle />', () => {
    const globalClassNames = {
        root: 'ms-Checkbox',
        checkmark: 'ms-Checkbox-checkmark',
        checkbox: 'ms-Checkbox-checkbox',
        text: 'ms-Checkbox-text',
        error: 'ts-message-wrapper--error'
    };

    it('Should render a UIToggle component', () => {
        const { container } = render(<UICheckbox />);
        expect(container.querySelectorAll(`.${globalClassNames.root}`).length).toEqual(1);
    });

    describe('Styles - validation message', () => {
        it('No message', () => {
            const ref = React.createRef<UICheckbox>();
            const { container } = render(<UICheckbox ref={ref} />);
            const instance = ref.current as any;
            const styles = instance.setStyle({ message: undefined }, {}) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles[2]).toEqual(undefined);
            expect(container.querySelectorAll(`.${globalClassNames.error}`).length).toEqual(0);
        });

        it('Error', () => {
            const ref = React.createRef<UICheckbox>();
            const { container, rerender } = render(<UICheckbox ref={ref} />);
            rerender(<UICheckbox ref={ref} errorMessage="dummy" />);
            const instance = ref.current as any;
            const styles = instance.setStyle({ message: 'dummy' }, {}) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles[2].marginBottom).toEqual(2);
            expect(container.querySelectorAll(`.${globalClassNames.error}`).length).toEqual(1);
        });
    });

    describe('Styles', () => {
        let ref: React.RefObject<UICheckbox>;

        beforeEach(() => {
            ref = React.createRef<UICheckbox>();
            render(<UICheckbox ref={ref} />);
        });

        const getStyles = (checkboxProps: Record<string, unknown> = {}): ICheckboxStyles => {
            const instance = ref.current as any;
            return instance.setStyle({ message: undefined }, checkboxProps) as ICheckboxStyles;
        };

        it('Unchecked', () => {
            const styles = getStyles({});
            const rootStyles = styles.root as IRawStyle;
            // Check hover opacity
            expect(rootStyles[0][0][`:hover .${globalClassNames.checkmark}`].opacity).toEqual(0);
        });

        it('Checked', () => {
            const styles = getStyles({ checked: true });
            const rootStyles = styles.root as IRawStyle;
            // Check hover opacity
            expect(rootStyles[0][0][`:hover .${globalClassNames.checkmark}`]).toEqual(undefined);
        });

        it('Disabled', () => {
            const styles = getStyles({ disabled: true });
            const textStyles = styles.text as IRawStyle;
            // Check text opacity
            expect(textStyles.opacity).toEqual(0.4);
            const checkBoxStyles = styles.checkbox as IRawStyle;
            // Check checkbox opacity
            expect(checkBoxStyles.opacity).toEqual(0.4);
        });

        it('Disabled and Checked', () => {
            const styles = getStyles({ disabled: true, checked: true });
            const rootStyles = styles.root as IRawStyle;
            // Check checkbox background
            expect(rootStyles[1][`:hover .${globalClassNames.checkbox}`].background).toEqual('');
            // Check checkbox borderColor
            expect(rootStyles[1][`:hover .${globalClassNames.checkbox}`].borderColor).toEqual('');
        });
    });
});
