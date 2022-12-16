import { fireEvent, render } from '@testing-library/react';
import * as React from 'react';
import { UIIcon, UiIcons } from '../../../src/components';
import type { IActionCalloutDetail } from '../../../src/components/UIActionCallout';
import { UIActionCallout } from '../../../src/components/UIActionCallout';

describe('<UICallout />', () => {
    const helpLinkURL: IActionCalloutDetail = {
        linkText: 'Some link text',
        subText: 'some sub-text',
        url: 'http:/some/url/link'
    };

    const helpLinkCommand: IActionCalloutDetail = {
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
                <UIActionCallout targetElementId={'aDivId'} actionDetail={helpLinkURL}></UIActionCallout>
            </div>
        );

        const link = container.getElementsByClassName('UIActionCallout-link')[0];
        expect(link.outerHTML).toMatchInlineSnapshot(
            `"<a href=\\"http:/some/url/link\\" class=\\"UIActionCallout-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );

        const subText = container.getElementsByClassName('UIActionCallout-subText')[0];
        expect(subText.outerHTML).toMatchInlineSnapshot(
            `"<div class=\\"UIActionCallout-subText\\">some sub-text</div>"`
        );

        // Test default icon
        const iconName = container.getElementsByTagName('i')[0].getAttribute('data-icon-name');
        expect(iconName).toEqual(UiIcons.HelpAction);

        // Test that the anchor element is clicked when the outer callout is clicked
        (link as HTMLAnchorElement).onclick = jest.fn();
        const anchorClickSpy = jest.spyOn(link as HTMLAnchorElement, 'onclick');

        const callout = container.getElementsByClassName('UIActionCallout-callout')[0];

        fireEvent.click(callout);

        expect(anchorClickSpy).toHaveBeenCalled();
    });

    it('Callback on click with provided command', () => {
        const onGABoxClick = jest.fn();

        const { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIActionCallout
                    commandAction={onGABoxClick}
                    targetElementId={'aDivId'}
                    actionDetail={helpLinkCommand}></UIActionCallout>
            </div>
        );

        const link = container.getElementsByClassName('UIActionCallout-link')[0];
        expect(link.outerHTML).toMatchInlineSnapshot(
            `"<a class=\\"UIActionCallout-link\\" target=\\"_blank\\" rel=\\"noreferrer\\">Some link text</a>"`
        );
        const subText = container.getElementsByClassName('UIActionCallout-subText')[0];
        expect(subText.outerHTML).toMatchInlineSnapshot(
            `"<div class=\\"UIActionCallout-subText\\">some sub-text</div>"`
        );
        const callout = container.getElementsByClassName('UIActionCallout-callout')[0];

        fireEvent.click(callout);

        expect(onGABoxClick).toHaveBeenCalledWith(helpLinkCommand.command);
    });

    it('Renders with correct root position via "showInline" property', () => {
        let { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIActionCallout
                    showInline={false}
                    targetElementId={'aDivId'}
                    actionDetail={helpLinkURL}></UIActionCallout>
            </div>
        );

        // Cannot access computed properties using '@testing-library/react' directly
        expect(
            window.getComputedStyle(container.getElementsByClassName('UIActionCallout-callout')[0]).position
        ).toEqual('absolute');

        container = render(
            <div>
                <div id="aDivId"></div>
                <UIActionCallout
                    showInline={true}
                    targetElementId={'aDivId'}
                    actionDetail={helpLinkURL}></UIActionCallout>
            </div>
        ).container;

        expect(
            window.getComputedStyle(container.getElementsByClassName('UIActionCallout-callout')[0]).position
        ).toEqual('sticky');
    });

    it('Renders the provided icon', () => {
        const altIcon: UIIcon = new UIIcon({ iconName: UiIcons.Bulb });
        const { container } = render(
            <div>
                <div id="aDivId"></div>
                <UIActionCallout icon={altIcon} targetElementId={'aDivId'} actionDetail={helpLinkURL}></UIActionCallout>
            </div>
        );
        // Test specified icon
        const iconName = container.getElementsByTagName('i')[0].getAttribute('data-icon-name');
        expect(iconName).toEqual(UiIcons.Bulb);
    });
});
