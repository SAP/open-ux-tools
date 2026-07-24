import * as React from 'react';
import { render } from '@testing-library/react';
import { UIIcon } from '../../../src/components/UIIcon';

describe('<UIIcon />', () => {
    const globalClassNames = {
        root: 'ts-icon'
    };

    it('Should render a UIIcon component', () => {
        const { container } = render(<UIIcon />);
        const iconEl = container.querySelector('i');
        expect(iconEl?.className).toContain(globalClassNames.root);
    });

    it('Property "classname"', () => {
        const { rerender, container } = render(<UIIcon />);
        rerender(<UIIcon className="dummy" />);
        const iconEl = container.querySelector('i');
        expect(iconEl?.className).toContain(globalClassNames.root);
        expect(iconEl?.className).toContain('dummy');
    });
});
