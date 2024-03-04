import * as React from 'react';
import { render } from '@testing-library/react';
import { UiIcons, initIcons, UIIconButton } from '../../../src/components';

describe('<UIIconButton />', () => {
    initIcons();

    it('Render button - default', () => {
        const { container } = render(
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.CopyToClipboard
                }}
                text="Copy"></UIIconButton>
        );

        expect(container.firstElementChild?.classList.contains('is-checked')).toBeFalsy();
    });

    it('Render button - checked', () => {
        const { container } = render(
            <UIIconButton
                iconProps={{
                    iconName: UiIcons.CopyToClipboard
                }}
                text="Copy"
                checked={true}></UIIconButton>
        );

        expect(container.firstElementChild?.classList.contains('is-checked')).toBeTruthy();
    });
});
