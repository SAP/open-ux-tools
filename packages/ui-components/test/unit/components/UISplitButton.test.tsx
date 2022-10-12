import * as React from 'react';
import * as Enzym from 'enzyme';

import { UISplitButton } from '../../../src/components/UIButton/index';
import type { UISplitButtonProps } from '../../../src/components/UIButton/index';

import type { UIContextualMenuProps, UIContextualMenuItem } from '../../../src/components/UIContextualMenu';

describe('<UISplitButton />', () => {
    let app: any;
    let splitButtonProps: UISplitButtonProps;
    let splitButtonInstance: UISplitButton;
    let wrapper: Enzym.ReactWrapper<UISplitButtonProps, {}, UISplitButton>;

    const getContextItems = (id: string): UIContextualMenuItem[] => {
        return wrapper.find(`UIDefaultButton#${id}`).prop<{ items: UIContextualMenuItem[] }>('menuProps').items;
    };

    const getContextMenuProps = (id: string): UIContextualMenuProps => {
        return wrapper.find(`UIDefaultButton#${id}`).prop<UIContextualMenuProps>('menuProps');
    };
    const mockEvent = (targetValue: string): React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement> => {
        const target: EventTarget = {
            value: targetValue
        } as HTMLInputElement;
        return {
            target
        } as React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;
    };

    beforeEach(() => {
        splitButtonProps = Object.freeze({
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
        });

        app = document.createElement('div');
        app.className = 'app';
        app.setAttribute('id', 'app');
        document.body.appendChild(app);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UISplitButton component', () => {
        const testProps = Object.assign({}, splitButtonProps);
        const Proxy = (defaultProps: UISplitButtonProps): JSX.Element => <UISplitButton {...defaultProps} />;
        wrapper = Enzym.mount<UISplitButton>(<Proxy {...testProps} />, { attachTo: app });

        expect(wrapper.find('button.ui-split-button').length).toEqual(1);
    });

    it('Should render a UISplitButton component - click options', () => {
        const testProps = Object.assign({}, splitButtonProps);
        const Proxy = (defaultProps: UISplitButtonProps): JSX.Element => <UISplitButton {...defaultProps} />;
        wrapper = Enzym.mount<UISplitButton>(<Proxy {...testProps} />, { attachTo: app });

        splitButtonInstance = wrapper.find('UISplitButton').instance() as UISplitButton;
        const spyOnChange = jest.spyOn(splitButtonInstance.props, 'callback');
        expect(wrapper.find('button').length).toEqual(2);

        const btn1 = wrapper.find('button').first();
        btn1.simulate('click');
        expect(spyOnChange).toHaveBeenCalledWith('option1');
    });

    it('Should render a UISplitButton component - click options on menu', () => {
        const testProps = Object.assign({}, splitButtonProps);
        const Proxy = (defaultProps: UISplitButtonProps): JSX.Element => <UISplitButton {...defaultProps} />;
        wrapper = Enzym.mount<UISplitButton>(<Proxy {...testProps} />, { attachTo: app });

        splitButtonInstance = wrapper.find('UISplitButton').instance() as UISplitButton;
        const spyOnChange = jest.spyOn(splitButtonInstance.props, 'callback');
        expect(wrapper.find('button').length).toEqual(2);

        const btn1 = wrapper.find('button').last();
        btn1.simulate('click');

        const entries = getContextItems('test');
        const menu = getContextMenuProps('test');
        if (menu.onItemClick) {
            menu.onItemClick(mockEvent('test'), entries[0]);
        }

        expect(spyOnChange).toHaveBeenCalledWith('option2');
    });
});
