import * as React from 'react';
import { render } from '@testing-library/react';
import type { IButtonProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { UISmallButton } from '../../../src/components/UIButton/UISmallButton';

describe('<UISmallButton />', () => {
    it('Should render a UISmallButton component', () => {
        const { container } = render(<UISmallButton>Dummy</UISmallButton>);
        expect(container.querySelector('.ms-Button')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const { container } = render(<UISmallButton primary={true}>Dummy</UISmallButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('ms-Button--primary');
    });

    it('Styles - secondary', () => {
        const { container } = render(<UISmallButton primary={false}>Dummy</UISmallButton>);
        const button = container.querySelector('.ms-Button');
        expect(button).toBeInTheDocument();
        expect(button).not.toHaveClass('ms-Button--primary');
    });
});
