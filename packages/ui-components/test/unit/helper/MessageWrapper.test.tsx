import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { MessageWrapperProps } from '../../../src/helper/ValidationMessage';
import { MessageWrapper, getMessageInfo } from '../../../src/helper/ValidationMessage';

describe('<MessageWrapper />', () => {
    let wrapper: Enzyme.ReactWrapper<MessageWrapperProps>;

    const messageInfo = getMessageInfo({
        warningMessage: 'dummy'
    });

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <MessageWrapper message={messageInfo}>
                <div className="dummyInput"></div>
            </MessageWrapper>
        );
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a MessageWrapper component', () => {
        expect(wrapper.find('.dummyInput').length).toEqual(1);
        expect(wrapper.find('.ts-message-wrapper').length).toEqual(1);
        expect(wrapper.find('.ts-message-wrapper--warning').length).toEqual(1);
    });

    it('Default message - error', () => {
        const messageTemp = JSON.parse(JSON.stringify(messageInfo));
        messageTemp.type = undefined;
        wrapper.setProps({
            message: messageTemp
        });
        expect(wrapper.find('.ts-message-wrapper--error').length).toEqual(1);
    });

    it('Info message', () => {
        const messageTemp = getMessageInfo({
            infoMessage: 'dummy'
        });
        wrapper.setProps({
            message: messageTemp
        });
        expect(wrapper.find('.ts-message-wrapper--info').length).toEqual(1);
    });
});
