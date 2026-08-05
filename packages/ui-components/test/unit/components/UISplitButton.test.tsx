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

    it('Should call callback with button key on click', () => {
        const { getByText } = render(<UISplitButton {...splitButtonProps} />);

        fireEvent.click(getByText('option 1'));
        expect(splitButtonProps.callback).toHaveBeenCalledWith('option1');
    });

    it('Should call callback with menu item key on menu item click', () => {
        const ref = React.createRef<UISplitButton>();
        const { container } = render(<UISplitButton {...splitButtonProps} ref={ref} />);

        const buttons = container.querySelectorAll('button');
        // Open the dropdown so the menu state is active
        fireEvent.click(buttons[1]);

        // Fluent UI contextual menu doesn't render in jsdom, so invoke the handler directly from state
        const instance = ref.current!;
        const { items, onItemClick } = instance.state.menu as {
            items: any[];
            onItemClick: (ev?: React.MouseEvent<HTMLElement>, item?: any) => void;
        };
        onItemClick(undefined, items[0]);

        expect(splitButtonProps.callback).toHaveBeenCalledWith('option2');
    });

    it('Should update menu items when menuItems prop changes', () => {
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
