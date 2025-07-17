import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { IStyleFunction, IChoiceGroupStyleProps, IChoiceGroupStyles } from '@fluentui/react';
import { ChoiceGroup } from '@fluentui/react';
import type { ChoiceGroupProps } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';
import { UIChoiceGroup } from '../../../src/components/UIChoiceGroup/UIChoiceGroup';

describe('<UIChoiceGroup />', () => {
    it('Should render a UIChoiceGroup component', () => {
        const { container } = render(<UIChoiceGroup />);
        expect(container.querySelector('.ms-ChoiceFieldGroup')).toBeInTheDocument();
    });

    it('Styles - default', () => {
        const { container } = render(<UIChoiceGroup />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with default styles
        expect(choiceGroup.parentElement).toHaveStyle('color: var(--vscode-input-foreground)');
    });

    it('Styles - disabled', () => {
        const { container } = render(<UIChoiceGroup disabled={true} />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with disabled styles
        expect(choiceGroup.parentElement).toHaveStyle('opacity: 0.4');
    });

    it('Styles - required', () => {
        const { container } = render(<UIChoiceGroup required={true} />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with required styles
        expect(choiceGroup.parentElement).toHaveStyle('color: var(--vscode-input-foreground)');
    });

    it('Styles - inline', () => {
        const { container } = render(<UIChoiceGroup inline={true} />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with inline styles
        expect(choiceGroup.parentElement).toHaveStyle('display: flex');
    });
});
