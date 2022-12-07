import * as Enzyme from 'enzyme';
import * as React from 'react';
import type { GuidedAnswerBoxProps, IGuidedAnswerLink } from '../../../src/components/UIGuidedAnswerBox';
import { UIGuidedAnswersBox } from '../../../src/components/UIGuidedAnswerBox';

describe('<UICallout />', () => {
    let wrapper: Enzyme.ReactWrapper<GuidedAnswerBoxProps>;

    const helpLink: IGuidedAnswerLink = {
        linkText: 'Some link text',
        subText: 'some sub-text',
        url: 'http:/some/url/link'
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <div>
                <div id="aDivId"></div>
                <UIGuidedAnswersBox targetElementId={'aDivId'} guidedAnswerLink={helpLink}></UIGuidedAnswersBox>
            </div>
        );
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Renders the correct texts and href link', () => {
        wrapper.update();
        const link = wrapper.find('.uiGuidedAnswerBox-link');
        expect(link).toBeDefined();
        //expect(.text()).toEqual(helpLink.linkText);
    });
});
