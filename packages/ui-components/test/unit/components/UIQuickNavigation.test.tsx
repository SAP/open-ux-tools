import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import {
    UIQuickNavigation,
    UITextInput,
    UIDefaultButton,
    initIcons,
    setQuickNavigationKey
} from '../../../src/components';

export interface TextComponentProps {
    id: string;
}

const Content = (props: { id: string; title: string }) => {
    const { title, id } = props;
    return (
        <div>
            <div>{title}</div>
            <UITextInput id={`${id}-input`} label="Dummy 1" />
            <UIDefaultButton id={`${id}-btn`}>Submit</UIDefaultButton>
        </div>
    );
};

const QuickNavigationTest = (props: { inline?: boolean; groups: string[] }) => {
    const { inline, groups } = props;
    return (
        <div style={{ margin: 10 }}>
            <div>{`Inline = ${inline}`}</div>
            <UIQuickNavigation inline={inline}>
                {groups.map((group) => {
                    return (
                        <div key={group} {...setQuickNavigationKey(group)}>
                            <Content id={`group${group.toUpperCase()}`} title="Group 1" />
                        </div>
                    );
                })}
            </UIQuickNavigation>
        </div>
    );
};

describe('UIQuickNavigation', () => {
    initIcons();
    const classNames = {
        internal: 'quick-navigation--inline',
        external: 'quick-navigation--external'
    };

    const findInlineContainers = (): NodeListOf<Element> => {
        return document.querySelectorAll(`.${classNames.internal}`);
    };

    const findExternalContainers = (): NodeListOf<Element> => {
        return document.querySelectorAll(`.${classNames.external}`);
    };

    const activateQuickNavigation = (code?: string, ctrlKey = true, metaKey = true, altKey = true): void => {
        fireEvent.keyDown(document.body, {
            ctrlKey,
            metaKey,
            altKey,
            code
        });
    };

    beforeAll(() => {
        // Use 'isVisible' property to make virtual nodes visible - 'isVisible' is used by fluent for testing purposes
        Object.defineProperty(HTMLElement.prototype, 'isVisible', {
            configurable: true,
            value: true
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Render with external', () => {
        render(<QuickNavigationTest groups={['A', 'b', 'C', '3']} inline={false} />);
        expect(findInlineContainers().length).toEqual(0);
        expect(findExternalContainers().length).toEqual(0);
        activateQuickNavigation();
        expect(findInlineContainers().length).toEqual(0);
        const externalContainers = findExternalContainers();
        expect(externalContainers.length).toEqual(1);
        const helpers = externalContainers[0]?.childNodes as NodeListOf<HTMLElement>;
        expect(helpers.length).toEqual(4);
        expect(helpers[0]?.textContent).toEqual('A');
        expect(helpers[1]?.textContent).toEqual('B');
        expect(helpers[2]?.textContent).toEqual('C');
        expect(helpers[3]?.textContent).toEqual('3');
    });

    it('Render with inline', () => {
        render(<QuickNavigationTest groups={['A', 'B', 'C']} inline={true} />);
        expect(findInlineContainers().length).toEqual(0);
        expect(findExternalContainers().length).toEqual(0);
        activateQuickNavigation();
        expect(findInlineContainers().length).toEqual(1);
        expect(findExternalContainers().length).toEqual(0);
    });

    it('Render with default inline(false)', () => {
        render(<QuickNavigationTest groups={['A', 'B', 'C']} />);
        expect(findInlineContainers().length).toEqual(0);
        expect(findExternalContainers().length).toEqual(0);
        activateQuickNavigation();
        expect(findInlineContainers().length).toEqual(0);
        expect(findExternalContainers().length).toEqual(1);
    });

    const keyActivationTest = [
        {
            name: 'Windows',
            code: '',
            ctrlKey: true,
            metaKey: false,
            altKey: true,
            activated: true
        },
        {
            name: 'MacOS',
            code: '',
            ctrlKey: false,
            metaKey: true,
            altKey: true,
            activated: true
        },
        {
            name: 'Ctrl without alt',
            code: '',
            ctrlKey: true,
            metaKey: false,
            altKey: false,
            activated: false
        },
        {
            name: 'Meta without alt',
            code: '',
            ctrlKey: false,
            metaKey: true,
            altKey: false,
            activated: false
        },
        {
            name: 'Alt only',
            code: '',
            ctrlKey: false,
            metaKey: false,
            altKey: true,
            activated: false
        }
    ];
    it.each(keyActivationTest)('Activation test - $name', (testCase) => {
        render(<QuickNavigationTest groups={['A', 'B']} inline={false} />);
        expect(findExternalContainers().length).toEqual(0);
        activateQuickNavigation(testCase.code, testCase.ctrlKey, testCase.metaKey, testCase.altKey);
        expect(findExternalContainers().length).toEqual(testCase.activated ? 1 : 0);
    });

    const finalKeyTest = [
        {
            name: 'Test valid navigation with code=KeyB',
            code: 'KeyB',
            valid: true,
            focusedElement: 'groupB-input'
        },
        {
            name: 'Test valid navigation with code=B',
            code: 'B',
            valid: true,
            focusedElement: 'groupB-input'
        },
        {
            name: 'Test valid navigation with code=b',
            code: 'b',
            valid: true,
            focusedElement: 'groupB-input'
        },
        {
            name: 'Test valid navigation(inline)',
            code: 'B',
            inline: true,
            valid: true,
            focusedElement: 'groupB-input'
        },
        {
            name: 'Test valid navigation with digit=2',
            code: '2',
            valid: true,
            focusedElement: 'group2-input'
        },
        {
            name: 'Test case sensitive group',
            code: 'KeyC',
            valid: true,
            focusedElement: 'groupC-input'
        },
        {
            name: 'Test unexisting group',
            code: 'W',
            valid: false
        }
    ];
    it.each(finalKeyTest)('$name', (testCase) => {
        const { inline, code, focusedElement, valid } = testCase;
        render(<QuickNavigationTest groups={['A', 'B', 'c', '2']} inline={inline} />);
        const findContainers = inline ? findInlineContainers : findExternalContainers;
        expect(findContainers().length).toEqual(0);
        activateQuickNavigation();
        expect(findContainers().length).toEqual(1);
        activateQuickNavigation(code);
        expect(findContainers().length).toEqual(valid ? 0 : 1);
        if (valid) {
            expect(document.activeElement?.id).toEqual(focusedElement);
        }
    });

    const keyUpTest = [
        {
            name: 'Keep active',
            code: 'KeyA',
            ctrlKey: true,
            metaKey: false,
            altKey: true,
            activated: true
        },
        {
            name: 'Release active navigation by releasing alt',
            code: 'KeyA',
            ctrlKey: true,
            metaKey: false,
            altKey: false,
            activated: false
        },
        {
            name: 'Release active navigation by releasing ctrl',
            code: 'KeyA',
            ctrlKey: false,
            metaKey: false,
            altKey: true,
            activated: false
        }
    ];
    it.each(keyUpTest)('KeyUp test - $name', (testCase) => {
        const { code, ctrlKey, metaKey, altKey, activated } = testCase;
        render(<QuickNavigationTest groups={['A', 'B', 'C']} />);
        activateQuickNavigation();
        expect(findExternalContainers().length).toEqual(1);
        fireEvent.keyUp(document.body, {
            ctrlKey,
            metaKey,
            altKey,
            code
        });
        expect(findExternalContainers().length).toEqual(activated ? 1 : 0);
    });

    it('Unfocus window', () => {
        render(<QuickNavigationTest groups={['A', 'B', 'C']} />);
        activateQuickNavigation();
        expect(findExternalContainers().length).toEqual(1);
        fireEvent.blur(window);
        expect(findExternalContainers().length).toEqual(0);
    });
});
