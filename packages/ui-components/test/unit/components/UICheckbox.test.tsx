import { render } from '@testing-library/react';
import { UICheckbox } from '../../../src/components/UICheckbox';
import { compareStylesBySelector, findStyleFromStyleSheets } from '../../utils/styles';

describe('<UICheckbox />', () => {
    const globalClassNames = {
        root: 'ms-Checkbox',
        checkmark: 'ms-Checkbox-checkmark',
        checkbox: 'ms-Checkbox-checkbox',
        text: 'ms-Checkbox-text',
        error: 'ts-message-wrapper--error'
    };

    it('Should render a UICheckbox component', () => {
        render(<UICheckbox />);
        expect(document.querySelector(`.${globalClassNames.root}`)).toBeTruthy();
    });

    describe('Styles - validation message', () => {
        it('No message', () => {
            const { container } = render(<UICheckbox />);
            expect(container.querySelector(`.${globalClassNames.error}`)).toBeFalsy();
        });

        it('Error', () => {
            const { container } = render(<UICheckbox errorMessage="dummy" />);
            compareStylesBySelector(`.${globalClassNames.root}`, {
                marginBottom: '2px'
            });
            expect(container.querySelector(`.${globalClassNames.error}`)).toBeTruthy();
        });
    });

    describe('Styles', () => {
        it('Unchecked checkbox shows checkmark on hover', () => {
            const { container } = render(<UICheckbox />);
            const checkbox = container.querySelector(`.${globalClassNames.root}`);
            expect(findStyleFromStyleSheets('opacity', checkbox, `:hover .${globalClassNames.checkmark}`)).toEqual('0');
        });

        it('Checked checkbox removes hover style', () => {
            const { container } = render(<UICheckbox checked />);
            const checkbox = container.querySelector(`.${globalClassNames.root}`);
            expect(findStyleFromStyleSheets('opacity', checkbox, `:hover .${globalClassNames.checkmark}`)).toEqual(
                undefined
            );
        });

        it('Disabled', () => {
            render(<UICheckbox disabled label="Test disabled label" />);
            compareStylesBySelector(`.${globalClassNames.text}`, {
                opacity: '0.4'
            });
            compareStylesBySelector(`.${globalClassNames.checkbox}`, {
                opacity: '0.4'
            });
        });

        it('Disabled and checked checkbox clears hover styles', () => {
            const { container } = render(<UICheckbox disabled checked />);
            const checkbox = container.querySelector(`.${globalClassNames.root}`);
            expect(checkbox).toBeInTheDocument();
            // Empty values ar concatinated during resolution
            const resolvedStyle = findStyleFromStyleSheets(
                'background',
                checkbox,
                `:hover .${globalClassNames.checkbox}`
            );
            expect(resolvedStyle).toEqual(';border-color:');
        });
    });
});
