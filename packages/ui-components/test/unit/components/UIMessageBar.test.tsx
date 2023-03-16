import type { IMessageBarProps, IMessageBarStyles } from '@fluentui/react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';
import { UiIcons } from '../../../src/components/Icons';
import { UIMessageBar } from '../../../src/components/UIMessageBar';

describe('<UIMessageBar />', () => {
    let wrapper: Enzyme.ReactWrapper<IMessageBarProps>;

    const getStyles = (): IMessageBarStyles => {
        return wrapper.find(MessageBar).props().styles as IMessageBarStyles;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIMessageBar />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UIMessageBar component - default state', () => {
        expect(wrapper.find('.ms-MessageBar').length).toEqual(1);
        const messageBar = wrapper.find(MessageBar);
        expect(messageBar.prop('messageBarIconProps')?.iconName).toEqual(UiIcons.Success);
        // Check styles
        const styles = getStyles();
        expect(styles.root?.['backgroundColor']).toEqual(undefined);
    });

    it('Test property "messageBarType" - error', () => {
        wrapper.setProps({
            messageBarType: MessageBarType.error
        });
        const messageBar = wrapper.find(MessageBar);
        expect(messageBar.prop('messageBarIconProps')?.iconName).toEqual(UiIcons.Error);
        // Check styles
        const styles = getStyles();
        expect(styles.root?.['backgroundColor']).toEqual('transparent');
    });

    it('Test property "messageBarType" - success', () => {
        wrapper.setProps({
            messageBarType: MessageBarType.success
        });
        const messageBar = wrapper.find(MessageBar);
        expect(messageBar.prop('messageBarIconProps')?.iconName).toEqual(UiIcons.Success);
        // Check styles
        const styles = getStyles();
        expect(styles.root?.['backgroundColor']).toEqual('transparent');
    });
});
