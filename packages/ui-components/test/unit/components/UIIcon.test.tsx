import * as React from 'react';
import { render } from '@testing-library/react';
import type { IIconProps } from '@fluentui/react';
import { UIIcon } from '../../../src/components/UIIcon';

describe('<UIIcon />', () => {
    const globalClassNames = {
        root: 'ts-icon'
    };

    it('Should render a UIIcon component', () => {
        const { container } = render(<UIIcon />);
        const iconElement = container.querySelector(`.${globalClassNames.root}`);
        expect(iconElement).toBeTruthy();
        expect(iconElement?.className).toContain(globalClassNames.root);
    });
});
