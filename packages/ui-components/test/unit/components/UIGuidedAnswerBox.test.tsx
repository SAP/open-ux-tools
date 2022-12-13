import { Callout } from '@fluentui/react';
import type { ICalloutContentStyles, IStyle } from '@fluentui/react';
import * as Enzyme from 'enzyme';
import * as React from 'react';
import type { GuidedAnswerBoxProps, IGuidedAnswerLink } from '../../../src/components/UIGuidedAnswerBox';
import { UIGuidedAnswersBox } from '../../../src/components/UIGuidedAnswerBox';

describe('<UICallout />', () => {
    let wrapper: Enzyme.ReactWrapper<GuidedAnswerBoxProps>;

    const helpLinkURL: IGuidedAnswerLink = {
        linkText: 'Some link text',
        subText: 'some sub-text',
        url: 'http:/some/url/link'
    };

    const helpLinkCommand: IGuidedAnswerLink = {
        linkText: 'Some link text',
        subText: 'some sub-text',
        command: {
            id: 'some.command.name',
            params: [{ a: 1, b: 2 }, 'some_string_param']
        }
    };

    afterEach(() => {
        wrapper.unmount();
    });

    it('Renders correctly if command not provided, responds to click', () => {
        wrapper = Enzyme.mount(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox targetElementId={'aDivId'} guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        );

        const link = wrapper.find('.uiGuidedAnswerBox-link');
        expect(link.html()).toMatchInlineSnapshot(
            `"<a href=\\"http:/some/url/link\\" class=\\"uiGuidedAnswerBox-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );
        const subText = wrapper.find('.uiGuidedAnswerBox-subText');
        expect(subText.html()).toMatchInlineSnapshot(
            `"<div class=\\"uiGuidedAnswerBox-subText\\">some sub-text</div>"`
        );

        const iconName = wrapper.find('i').props()['data-icon-name'];
        expect(iconName).toEqual('GuidedAnswerLink');

        // Test that the anchor element is clicked when the outer callout is clicked
        const anchorEl = link.getDOMNode();
        (anchorEl as HTMLAnchorElement).onclick = jest.fn();
        const anchorClickSpy = jest.spyOn(anchorEl as HTMLAnchorElement, 'onclick');

        const callout = wrapper.find('div.uiGuidedAnswerBox-callout');

        callout.simulate('click');

        expect(anchorClickSpy).toHaveBeenCalled();
    });

    it('Callback on click with provided command', () => {
        const onGABoxClick = jest.fn();

        wrapper = Enzyme.mount(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    commandAction={onGABoxClick}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkCommand}></UIGuidedAnswersBox>
            </div>
        );

        const link = wrapper.find('.uiGuidedAnswerBox-link');
        expect(link.html()).toMatchInlineSnapshot(
            `"<a class=\\"uiGuidedAnswerBox-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );
        const subText = wrapper.find('.uiGuidedAnswerBox-subText');
        expect(subText.html()).toMatchInlineSnapshot(
            `"<div class=\\"uiGuidedAnswerBox-subText\\">some sub-text</div>"`
        );
        const callout = wrapper.find('div.uiGuidedAnswerBox-callout');

        callout.simulate('click');

        expect(onGABoxClick).toHaveBeenCalledWith(helpLinkCommand.command);
    });

    it('Renders with correct root position via "showInline" property', () => {
        wrapper = Enzyme.mount(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    showInline={false}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        );

        let calloutBase = wrapper.find(Callout).props().styles as ICalloutContentStyles;
        expect((calloutBase.root as IStyle)['position']).toEqual('absolute');

        wrapper.unmount();
        wrapper = Enzyme.mount(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    showInline={true}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        );

        calloutBase = wrapper.find(Callout).props().styles as ICalloutContentStyles;
        expect((calloutBase.root as IStyle)['position']).toEqual('sticky');
    });
});
