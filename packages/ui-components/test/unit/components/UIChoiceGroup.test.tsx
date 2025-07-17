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
        const { container } = render(<UIChoiceGroup disabled={true} label="Test Label" />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with disabled styles on label
        const label = container.querySelector('.ms-Label') as HTMLElement;
        expect(label).toHaveStyle('opacity: 0.4');
    });

    it('Styles - required', () => {
        const { container } = render(<UIChoiceGroup required={true} />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Test that the component renders with required styles
        expect(choiceGroup.parentElement).toHaveStyle('color: var(--vscode-input-foreground)');
    });

    it('Styles - inline', () => {
        const { container } = render(<UIChoiceGroup inline={true} options={[{key: 'a', text: 'Option A'}, {key: 'b', text: 'Option B'}]} />);
        const choiceGroup = container.querySelector('.ms-ChoiceFieldGroup') as HTMLElement;
        expect(choiceGroup).toBeInTheDocument();

        // Find any child with display: flex
        const flexElement = Array.from(choiceGroup.querySelectorAll('*')).find(
            el => getComputedStyle(el as HTMLElement).display === 'flex'
        ) as HTMLElement | undefined;
        expect(flexElement).toBeDefined();
        expect(getComputedStyle(flexElement as HTMLElement).display).toBe('flex');
    });
});
