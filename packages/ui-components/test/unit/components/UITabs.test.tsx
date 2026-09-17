import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UITabs } from '../../../src/components/UITabs/UITabs';

describe('<UITabs />', () => {
    it('renders one tab button per item', () => {
        const { container } = render(<UITabs items={['Tab A', 'Tab B', 'Tab C']} />);
        expect(container.querySelectorAll('button[role="tab"]')).toHaveLength(3);
    });

    it('renders tab labels from items array', () => {
        const { container } = render(<UITabs items={['First', 'Second']} />);
        const tabs = container.querySelectorAll('button[role="tab"]');
        expect(tabs[0].textContent?.trim()).toBe('First');
        expect(tabs[1].textContent?.trim()).toBe('Second');
    });

    it('renders no tabs for an empty items array', () => {
        const { container } = render(<UITabs items={[]} />);
        expect(container.querySelectorAll('button[role="tab"]')).toHaveLength(0);
    });

    it('forwards onLinkClick to the underlying Pivot', () => {
        const onLinkClick = jest.fn();
        const { container } = render(<UITabs items={['Alpha', 'Beta']} onLinkClick={onLinkClick} />);
        fireEvent.click(container.querySelectorAll('button[role="tab"]')[1]);
        expect(onLinkClick).toHaveBeenCalledTimes(1);
    });
});
