import * as React from 'react';
import { render } from '@testing-library/react';
import type { IStyleFunction, ILinkStyles } from '@fluentui/react';
import { Link } from '@fluentui/react';
import type { UILinkProps } from '../../../src/components/UILink';
import { UILink } from '../../../src/components/UILink';

describe('<UILink />', () => {

    it('Should render a UILink component', () => {
        const { container } = render(<UILink>Dummy</UILink>);
        expect(container.querySelector('.ms-Link')).toBeInTheDocument();
    });

    it('Styles - primary', () => {
        const { container } = render(<UILink>Dummy</UILink>);
        const link = container.querySelector('.ms-Link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('Dummy');
    });

    it('Styles - secondary', () => {
        const { container } = render(<UILink secondary={true}>Dummy</UILink>);
        const link = container.querySelector('.ms-Link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('Dummy');
    });

    it('Styles - primary with no underline', () => {
        const { container } = render(<UILink underline={false}>Dummy</UILink>);
        const link = container.querySelector('.ms-Link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('Dummy');
    });

    it('Styles - disabled', () => {
        const { container } = render(<UILink disabled={true}>Dummy</UILink>);
        const link = container.querySelector('.ms-Link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('Dummy');
    });
});
