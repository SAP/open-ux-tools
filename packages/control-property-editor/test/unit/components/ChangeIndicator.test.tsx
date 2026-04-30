import React from 'react';

import { render } from '../utils';

import { ChangeIndicator } from '../../../src/components/ChangeIndicator';

describe('ChangeIndicator', () => {
    test('saved changes - shows tooltip on hover', () => {
        const { container } = render(<ChangeIndicator id={'change-indicator'} saved={1} pending={0} type="property" />);
        const icon = container.querySelector('i');
        expect(icon).toHaveAttribute('title', 'All changes on this property are saved');
    });

    test('pending changes - shows tooltip on hover', () => {
        const { container } = render(<ChangeIndicator saved={0} pending={2} type="property" />);
        const icon = container.querySelector('i');
        expect(icon).toHaveAttribute('title', 'All changes on this property are not saved');
    });

    test('pending and saved changes - shows tooltip on hover', () => {
        const { container } = render(<ChangeIndicator saved={3} pending={2} type="property" />);
        const icon = container.querySelector('i');
        expect(icon).toHaveAttribute(
            'title',
            'This property has previously saved changes and currently unsaved changes'
        );
    });

    test('id prop is applied to icon element', () => {
        const { container } = render(<ChangeIndicator id={'change-indicator'} saved={1} pending={0} type="property" />);
        const icon = container.querySelector('i');
        expect(icon).toHaveAttribute('id', 'change-indicator');
    });
});
