import { fireEvent, render } from '@testing-library/react';
import * as React from 'react';
import type { IGuidedAnswerLink } from '../../../src/components/UIGuidedAnswerBox';
import { UIGuidedAnswersBox } from '../../../src/components/UIGuidedAnswerBox';

describe('<UICallout />', () => {
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

    it('Renders correctly if command not provided, responds to click', () => {
        const { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox targetElementId={'aDivId'} guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        );

        const link = container.getElementsByClassName('uiGuidedAnswerBox-link')[0];
        expect(link.outerHTML).toMatchInlineSnapshot(
            `"<a href=\\"http:/some/url/link\\" class=\\"uiGuidedAnswerBox-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );

        const subText = container.getElementsByClassName('uiGuidedAnswerBox-subText')[0];
        expect(subText.outerHTML).toMatchInlineSnapshot(
            `"<div class=\\"uiGuidedAnswerBox-subText\\">some sub-text</div>"`
        );

        // Test default icon
        const iconName = container.getElementsByTagName('i')[0].getAttribute('data-icon-name');
        expect(iconName).toEqual('GuidedAnswerLink');

        // Test that the anchor element is clicked when the outer callout is clicked
        (link as HTMLAnchorElement).onclick = jest.fn();
        const anchorClickSpy = jest.spyOn(link as HTMLAnchorElement, 'onclick');

        const callout = container.getElementsByClassName('uiGuidedAnswerBox-callout')[0];

        fireEvent.click(callout);

        expect(anchorClickSpy).toHaveBeenCalled();
    });

    it('Callback on click with provided command', () => {
        const onGABoxClick = jest.fn();

        const { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    commandAction={onGABoxClick}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkCommand}></UIGuidedAnswersBox>
            </div>
        );

        const link = container.getElementsByClassName('uiGuidedAnswerBox-link')[0];
        expect(link.outerHTML).toMatchInlineSnapshot(
            `"<a class=\\"uiGuidedAnswerBox-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );
        const subText = container.getElementsByClassName('uiGuidedAnswerBox-subText')[0];
        expect(subText.outerHTML).toMatchInlineSnapshot(
            `"<div class=\\"uiGuidedAnswerBox-subText\\">some sub-text</div>"`
        );
        const callout = container.getElementsByClassName('uiGuidedAnswerBox-callout')[0];

        fireEvent.click(callout);

        expect(onGABoxClick).toHaveBeenCalledWith(helpLinkCommand.command);
    });

    it('Renders with correct root position via "showInline" property', () => {
        let { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    showInline={false}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        );

        // Cannot access computed properties using '@testing-library/react' directly
        expect(
            window.getComputedStyle(container.getElementsByClassName('uiGuidedAnswerBox-callout')[0]).position
        ).toEqual('absolute');

        container = render(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox
                    showInline={true}
                    targetElementId={'aDivId'}
                    guidedAnswerLink={helpLinkURL}></UIGuidedAnswersBox>
            </div>
        ).container;

        expect(
            window.getComputedStyle(container.getElementsByClassName('uiGuidedAnswerBox-callout')[0]).position
        ).toEqual('sticky');
    });
});
