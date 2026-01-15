import * as React from 'react';
import { render } from '@testing-library/react';
import { UIChoiceGroup } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';
import { compareStylesBySelector, findStyleFromStyleSheets } from '../../utils/styles';

describe('<UIChoiceGroup />', () => {
    const selectors = {
        root: '.ms-ChoiceFieldGroup',
        flexContainer: '.ms-ChoiceFieldGroup-flexContainer',
        label: '.ms-Label',
        choiceField: '.ms-ChoiceField-field',
        choiceFieldLabel: '.ms-ChoiceFieldLabel'
    };
    const options = [{ text: 'test', key: 'test' }];
    beforeAll(() => {
        document.documentElement.style.setProperty('--vscode-input-foreground', 'red');
    });
    it('Should render a UIChoiceGroup component', () => {
        const { container } = render(<UIChoiceGroup />);
        expect(container.querySelector(selectors.root)).toBeInTheDocument();
    });

    it('Styles - default', () => {
        const { container } = render(<UIChoiceGroup label="dummy" options={options} />);
        const choiceGroup = container.querySelector(selectors.root) as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with default styles
        compareStylesBySelector(selectors.label, {
            color: 'var(--vscode-input-foreground)'
        });
        compareStylesBySelector(selectors.choiceField, {
            color: 'var(--vscode-foreground)'
        });
    });

    it('Styles - disabled', () => {
        const { container } = render(<UIChoiceGroup disabled={true} label="Test Label" options={options} />);
        const choiceGroup = container.querySelector(selectors.root) as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with disabled styles on label
        compareStylesBySelector(selectors.label, {
            opacity: '0.4'
        });
        compareStylesBySelector(selectors.choiceFieldLabel, {
            opacity: '0.4'
        });
    });

    it('Styles - required', () => {
        const { container } = render(<UIChoiceGroup required={true} label="dummy" />);
        const label = container.querySelector(selectors.label) as HTMLElement;

        expect(findStyleFromStyleSheets('content', label, '::after')).toEqual(`' *' / ''`);
        expect(findStyleFromStyleSheets('color', label, '::after')).toEqual(
            'var(--vscode-inputValidation-errorBorder)'
        );
    });

    it('Styles - inline', () => {
        render(
            <UIChoiceGroup
                inline={true}
                options={[
                    { key: 'a', text: 'Option A' },
                    { key: 'b', text: 'Option B' }
                ]}
            />
        );
        // ms-ChoiceFieldGroup-flexContainer
        compareStylesBySelector(selectors.flexContainer, {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap'
        });
    });
});
