import * as React from 'react';
import { createEvent, fireEvent, render } from '@testing-library/react';
import {
    UIQuickNavigation,
    UITextInput,
    UIDefaultButton,
    initIcons,
    setQuickNavigationKey,
    QUICK_NAVIGATION_ATTRIBUTE
} from '../../../src/components';
import type { UIQuickNavigationOffset } from '../../../src/components';

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

const QuickNavigationTest = (props: { inline?: boolean; groups: string[]; offset?: UIQuickNavigationOffset }) => {
    const { inline, groups, offset } = props;
    return (
        <div style={{ margin: 10 }}>
            <div>{`Inline = ${inline}`}</div>
            <UIQuickNavigation inline={inline} offset={offset}>
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

    describe('Render with external', () => {
        const getRect = (top: number, left: number, height: number, width: number): DOMRect => {
            const bottom = top + height;
            const right = left + width;
            return {
                top,
                height,
                width,
                left,
                bottom,
                right
            } as DOMRect;
        };
        const mockRectangles = (sizes: DOMRect[]) => {
            const sizesMap = {
                A: sizes[0],
                B: sizes[1],
                C: sizes[2],
                D: sizes[3],
                E: sizes[4]
            };
            function getBoundingClientRect() {
                const group = this.getAttribute(QUICK_NAVIGATION_ATTRIBUTE);
                if (sizesMap[group]) {
                    return sizesMap[group];
                }
                return getRect(0, 0, 0, 0);
            }
            jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(getBoundingClientRect);
        };

        const testCases = [
            {
                name: 'Positive positions',
                sizes: [
                    getRect(100, 100, 50, 300),
                    getRect(200, 100, 50, 300),
                    getRect(300, 100, 50, 300),
                    getRect(400, 100, 50, 300)
                ],
                expectedTop: ['85px', '185px', '285px', '385px'],
                expectedLeft: ['85px', '85px', '85px', '85px']
            },
            {
                name: 'Custom offset',
                offset: {
                    x: 30,
                    y: 50
                },
                sizes: [
                    getRect(100, 100, 50, 300),
                    getRect(200, 100, 50, 300),
                    getRect(300, 100, 50, 300),
                    getRect(400, 80, 50, 300)
                ],
                expectedTop: ['50px', '150px', '250px', '350px'],
                expectedLeft: ['70px', '70px', '70px', '50px']
            },
            {
                name: 'Negative entries',
                offset: {
                    x: 50,
                    y: 50
                },
                sizes: [
                    getRect(10, 0, 50, 300),
                    getRect(200, 0, 50, 300),
                    getRect(300, 0, 50, 300),
                    getRect(400, 0, 50, 300)
                ],
                expectedTop: ['0px', '150px', '250px', '350px'],
                expectedLeft: ['0px', '0px', '0px', '0px']
            }
        ];
        for (const testCase of testCases) {
            const { name, sizes, expectedTop, expectedLeft, offset } = testCase;
            it(name, () => {
                mockRectangles(sizes);
                render(<QuickNavigationTest groups={['A', 'b', 'C', 'd']} inline={false} offset={offset} />);
                expect(findInlineContainers().length).toEqual(0);
                expect(findExternalContainers().length).toEqual(0);
                activateQuickNavigation();
                expect(findInlineContainers().length).toEqual(0);
                const externalContainers = findExternalContainers();
                expect(externalContainers.length).toEqual(1);
                const helpers = externalContainers[0]?.childNodes as NodeListOf<HTMLElement>;
                expect(helpers.length).toEqual(4);
                for (let i = 0; i < expectedTop.length; i++) {
                    expect(helpers[i]?.style.top).toEqual(expectedTop[i]);
                    expect(helpers[i]?.style.left).toEqual(expectedLeft[i]);
                }
            });
        }

        it('Custom offset for groups', () => {
            mockRectangles([
                getRect(100, 100, 50, 300),
                getRect(200, 100, 50, 300),
                getRect(300, 100, 50, 300),
                getRect(400, 100, 50, 300),
                getRect(500, 100, 50, 300)
            ]);
            render(
                <div style={{ margin: 10 }}>
                    <UIQuickNavigation inline={false}>
                        <div
                            key="A"
                            {...setQuickNavigationKey('A', {
                                y: 30,
                                x: 40
                            })}>
                            <Content id="group-a" title="Group A" />
                        </div>
                        <div
                            key="B"
                            {...setQuickNavigationKey('B', {
                                y: 60,
                                x: 50
                            })}>
                            <Content id="group-b" title="Group B" />
                        </div>
                        <div key="C" {...setQuickNavigationKey('C')} data-quick-navigation-offset-y="5">
                            <Content id="group-c" title="Group C" />
                        </div>
                        <div key="D" {...setQuickNavigationKey('D')} data-quick-navigation-offset-x="5">
                            <Content id="group-d" title="Group D" />
                        </div>
                        <div
                            key="E"
                            {...setQuickNavigationKey('E')}
                            data-quick-navigation-offset-x="a"
                            data-quick-navigation-offset-y="b">
                            <Content id="group-e" title="Group E" />
                        </div>
                    </UIQuickNavigation>
                </div>
            );
            activateQuickNavigation();
            const externalContainers = findExternalContainers();
            expect(externalContainers.length).toEqual(1);
            const helpers = externalContainers[0]?.childNodes as NodeListOf<HTMLElement>;
            expect(helpers.length).toEqual(5);
            expect(helpers[0]?.style.top).toEqual('70px');
            expect(helpers[0]?.style.left).toEqual('60px');
            expect(helpers[1]?.style.top).toEqual('140px');
            expect(helpers[1]?.style.left).toEqual('50px');
            expect(helpers[2]?.style.top).toEqual('285px');
            expect(helpers[2]?.style.left).toEqual('85px');
            expect(helpers[3]?.style.top).toEqual('385px');
            expect(helpers[3]?.style.left).toEqual('85px');
            expect(helpers[4]?.style.top).toEqual('485px');
            expect(helpers[4]?.style.left).toEqual('85px');
        });
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
            const keyDownEvent = createEvent.keyDown(document.body, {
                ctrlKey: false,
                metaKey: false,
                altKey: false,
                code
            });
            const stopPropagationSpy = jest.spyOn(KeyboardEvent.prototype, 'stopPropagation');
            fireEvent.keyUp(document.body, keyDownEvent);
            expect(stopPropagationSpy).toBeCalledTimes(1);
            stopPropagationSpy.mockRestore();
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
