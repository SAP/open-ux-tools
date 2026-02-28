import React from 'react';
import { Text, Stack, getNextElement, getPreviousElement } from '@fluentui/react';

import type { ChoiceGroupOption } from '../src/components/UIChoiceGroup';
import { UIChoiceGroup } from '../src/components/UIChoiceGroup';
import { UIFocusZone } from '../src/components/UIFocusZone';
import { UITextInput } from '../src/components/UIInput';

export default { title: 'Basic Inputs/ChoiceGroup' };

const props: any = {
    options: [
        { key: 'key1', text: 'Option 1' },
        { key: 'key2', text: 'Option 2' },
        { key: 'key3', text: 'Option 3', disabled: true }
    ],
    defaultSelectedKey: 'key2',
    label: 'Title',
    onChange: (ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: ChoiceGroupOption) => {
        console.log(option.text);
    }
};

function refreshIndices() {
    console.log('refreshIndices');
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach((radio) => {
        radio.setAttribute('tabindex', (radio as HTMLInputElement).checked ? '0' : '-1');
    });
}

export const ChoiceGroup = () => {
    return (
        <Stack>
            <Stack>
                <Text variant={'large'} block>
                    ChoiceGroup
                </Text>
                <UITextInput label="Enter your name"></UITextInput>
                <Stack>
                    {/* <UIFocusZone
                        // tabIndex={0}
                        // allowFocusRoot={true}
                        shouldEnterInnerZone={() => {
                            console.log('shouldEnterInnerZone');
                            return false;
                        }}
                        onActiveElementChanged={() => {
                            console.log('onActiveElementChanged');
                        }}
                        shouldFocusInnerElementWhenReceivedFocus={true}
                        shouldResetActiveElementWhenTabFromZone={true}
                        // shouldReceiveFocus={(childElement?: HTMLElement) => {
                        //     console.log('shouldReceiveFocus');
                        //     console.log(childElement);
                        //     return true;
                        // }}
                        // shouldReceiveFocus={(childElement?: HTMLElement) => {
                        //     console.log('focus!');
                        //     const selected = childElement?.querySelector('input[checked]') as HTMLElement;
                        //     if (selected) {
                        //         selected.setAttribute('tabindex', 'o');
                        //         selected.focus();
                        //         return false;
                        //     }
                        //     return true;
                        // }}

                        // onFocus={(event) => {
                        //     console.log('focus!');
                        //     console.log(event.target);
                        //     console.log(document.activeElement);
                        //     const selected = event.target.querySelector('input[checked]') as HTMLElement;
                        //     if (selected) {
                        //         selected.setAttribute('tabindex', 'o');
                        //         selected.focus();
                        //     }
                        // }}
                    > */}
                    <UIChoiceGroup
                        {...props}
                        onKeyDown={(event) => {
                            //                             export { getFirstFocusable as getUIFirstFocusable };
                            // export { getLastFocusable as getUILastFocusable };
                            const target = event.target as HTMLElement;
                            if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
                                console.log('right');
                                const next = getNextElement(document.body, target, false, false, false);
                                if (next) {
                                    next.focus();
                                }
                                event.preventDefault();
                            } else if (['ArrowLeft', 'ArrowUp'].includes(event.key)) {
                                console.log('left');
                                const prev = getPreviousElement(document.body, target, false, false, false);
                                if (prev) {
                                    prev.focus();
                                }

                                event.preventDefault();
                            }
                        }}
                    />
                    {/* </UIFocusZone> */}
                </Stack>
                <Stack>
                    <UIFocusZone>
                        <UIChoiceGroup {...props} title="Required" required={true} data-is-focusable="true" />
                    </UIFocusZone>
                </Stack>
                <Stack>
                    <UIChoiceGroup {...props} title="Inline" inline={true} />
                </Stack>
                <UITextInput label="Enter your name"></UITextInput>
            </Stack>
        </Stack>
    );
};
