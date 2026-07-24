import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { UISplitButton } from '../../../src/components/UIButton/index';
import type { UISplitButtonProps } from '../../../src/components/UIButton/index';

describe('<UISplitButton />', () => {
    let splitButtonProps: UISplitButtonProps;

    beforeEach(() => {
        splitButtonProps = {
            id: 'test',
            menuItems: [
                {
                    key: 'option2',
                    text: 'option 2'
                },
                {
                    key: 'option3',
                    text: 'option 3'
                }
            ],
            button: {
                key: 'option1',
                text: 'option 1'
            },
            callback: jest.fn()
        };
    });

    it('Should render a UISplitButton component', () => {
        const { container } = render(<UISplitButton {...splitButtonProps} />);
        expect(container.querySelectorAll('button.ui-split-button')).toHaveLength(1);
    });

    it('Should render a UISplitButton component - click options', () => {
        const { container } = render(<UISplitButton {...splitButtonProps} />);

        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(2);

        fireEvent.click(buttons[0]);
        expect(splitButtonProps.callback).toHaveBeenCalledWith('option1');
    });

    it('Should render a UISplitButton component - click options on menu', () => {
        const ref = React.createRef<UISplitButton>();
        const { container } = render(<UISplitButton {...splitButtonProps} ref={ref} />);

        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(2);

        // Open the dropdown so the menu state is active
        fireEvent.click(buttons[1]);

        // Access the menu's onItemClick handler and the items directly from component state
        const instance = ref.current!;
        const { items, onItemClick } = instance.state.menu;
        if (onItemClick) {
            onItemClick(undefined, items[0]);
        }

        expect(splitButtonProps.callback).toHaveBeenCalledWith('option2');
    });

    it('Should render a UISplitButton component - updates on props change', () => {
        let instance: UISplitButton | null = null;
        const setRef = (el: UISplitButton | null): void => {
            instance = el;
        };

        const { rerender } = render(<UISplitButton {...splitButtonProps} ref={setRef} />);

        expect(instance!.state.menu.items).toHaveLength(2);

        rerender(
            <UISplitButton
                {...splitButtonProps}
                ref={setRef}
                menuItems={[...splitButtonProps.menuItems, { key: 'option4', text: 'option 4' }]}
            />
        );

        expect(instance!.state.menu.items).toHaveLength(3);
    });
});
