import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Stack } from '@fluentui/react';
import { IGuidedAnswerLink, UIGuidedAnswersBox } from '../src';

export default { title: 'Utilities/GuidedAnswerBox' };
const stackTokens: IStackTokens = { childrenGap: 40 };
const aDummyGuidedAnswerLink: IGuidedAnswerLink = {
    linkText: 'Need help with this error?',
    subText: 'Guided Answers might be able to help.',
    url: 'http://some.url/some/page' 
}

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens}>
            <div id="aDivId" style={{ width: 'fit-content' }}>
                Some text that needs help as link
            </div>
            <UIGuidedAnswersBox
                showInline={false}
                targetElementId={'aDivId'}
                guidedAnswerLink={aDummyGuidedAnswerLink}>
            </UIGuidedAnswersBox>
        </Stack>
    );
};
