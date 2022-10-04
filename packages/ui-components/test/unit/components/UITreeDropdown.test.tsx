import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IContextualMenuItem } from '@fluentui/react';
import type { UITreeDropdownProps, UITreeDropdownState } from '../../../src/components/UITreeDropdown';
import { UITreeDropdown } from '../../../src/components/UITreeDropdown';
import { UITextInput } from '../../../src/components/UIInput';
import { UIContextualMenu } from '../../../src/components/UIContextualMenu';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';

describe('<UITreeDropdown />', () => {
    let wrapper: Enzyme.ReactWrapper<UITreeDropdownProps, UITreeDropdownState>;
    let keys = [];
    const onChange = jest
        .fn()
        .mockImplementation((event: React.FormEvent<UITreeDropdown>, option?: IContextualMenuItem | undefined) => {
            keys = [...keys, option?.key].filter((k) => (option?.selected ? true : k !== option?.key));
        });
    const openDropdown = (): void => {
        wrapper.find('button.ui-treeDropdown-caret').simulate('click', document.createEvent('Events'));
    };
    const originalHandler = document.getElementsByClassName;
    let windowEventMock: DOMEventListenerMock;
    const getFocusEvent = (value: string) => {
        return {
            target: {
                getElementsByClassName: (name: string) => {
                    const docFragment = document.createDocumentFragment();
                    if (name === 'ts-Menu-option') {
                        const option = document.createElement('input');
                        option.value = value;
                        docFragment.append(option);
                    }
                    return docFragment.children;
                },
                value: value
            }
        };
    };
    const getElementsByClassName = (name: string) => {
        if (name === 'ms-Fabric--isFocusVisible') {
            const docFragment = document.createDocumentFragment();
            docFragment.append(document.createElement('div'));
            return docFragment.children;
        }
        return originalHandler.call(document, name);
    };
    const triggerWindowKeydownWithFocus = async (value: string, key = 'ArrowDown'): Promise<void> => {
        const event = {
            key,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn()
        };
        wrapper.find('input').simulate('keyDown', event);
        windowEventMock.simulateEvent('keydown', event);
        const getElementsByClassNameSpy = jest
            .spyOn(document, 'getElementsByClassName')
            .mockImplementation(getElementsByClassName);
        const focusEvent = getFocusEvent(value);
        windowEventMock.simulateEvent('focus', focusEvent);
        await new Promise((resolve) => setTimeout(resolve, 100));
        jest.spyOn(document, 'getElementsByClassName').mockImplementation((name: string) =>
            originalHandler.call(document, name)
        );
        getElementsByClassNameSpy.mockClear();
    };
    const dismissMenuWithEvent = (
        event?: Event | React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<Element>
    ): void => {
        const menuProps = wrapper.find(UIContextualMenu).props();
        menuProps.onDismiss(event);
        menuProps.onMenuDismissed();
    };
    const selectors = {
        highlightItem: '.ts-Menu-option--highlighted',
        treeContextMenu: '.ui-treeDropDown-context-menu'
    };

    beforeEach(() => {
        windowEventMock = mockDomEventListener(window);
        wrapper = Enzyme.mount(
            <UITreeDropdown
                placeholderText="Select value"
                onParameterValueChange={onChange}
                items={[
                    {
                        value: 'Title',
                        label: 'Title',
                        children: [
                            { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                            { value: 'Dratft', label: 'Dratft', children: [] }
                        ]
                    }
                ]}
            />
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Open', () => {
        const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
        // Click on caret
        openDropdown();
        expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
        // Focus should be called for input
        expect(focusSpy).toBeCalledTimes(1);
    });

    it('Focus of input should select text', () => {
        const target = {
            select: jest.fn()
        } as unknown as HTMLInputElement;
        const event = {
            target
        } as React.FocusEvent<HTMLInputElement>;
        wrapper.find(UITextInput).prop('onFocus')(event);
        expect(event.target.select).toBeCalledTimes(1);
    });

    it('Open with keyboard and check value', () => {
        const event = {
            key: 'ArrowDown'
        };
        wrapper.find('input').simulate('keyDown', event);
        const focusEvent = getFocusEvent('Title');
        // Simulate menu open
        wrapper.find(UIContextualMenu).prop('onMenuOpened')();
        // Mockup data for focus handling
        const getElementsByClassNameSpy = jest
            .spyOn(document, 'getElementsByClassName')
            .mockImplementation(getElementsByClassName);
        // Simulate focus in menu
        windowEventMock.simulateEvent('focus', focusEvent);
        // Check result
        expect(wrapper.state().value).toEqual('Title');
        // Cleanup
        getElementsByClassNameSpy.mockClear();
    });

    describe('Value change', () => {
        beforeEach(() => {
            windowEventMock = mockDomEventListener(window);
            wrapper.setProps({
                items: [
                    {
                        value: 'Title',
                        label: 'Title',
                        children: [
                            { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                            { value: 'Dratft', label: 'Dratft', children: [] }
                        ]
                    },
                    { value: 'Title2', label: 'Title2', children: [] },
                    { value: 'Title3', label: 'Title3', children: [] }
                ]
            });
        });

        it('Change value with Enter/click on item', () => {
            openDropdown();
            // In focuszone click callback handled also when ewnter key pressed on focused item
            wrapper.find('button.ms-ContextualMenu-link').first().simulate('click');
            expect(wrapper.state().value).toEqual('Title2');
            // Try another select
            onChange.mockClear();
            openDropdown();
            wrapper.find('button.ms-ContextualMenu-link').last().simulate('click');
            expect(wrapper.state().value).toEqual('Title3');
            expect(onChange).toBeCalledTimes(1);
            expect(onChange).toBeCalledWith('Title3');
        });

        it('Change value and reset with "Escape" key', () => {
            openDropdown();
            // In focuszone click callback handled also when ewnter key pressed on focused item
            wrapper.find('button.ms-ContextualMenu-link').first().simulate('click');
            expect(wrapper.state().value).toEqual('Title2');
            // Try another select
            onChange.mockClear();
            openDropdown();
            const event = {
                key: 'Escape'
            };
            dismissMenuWithEvent(event as React.KeyboardEvent<Element>);
            expect(wrapper.state().value).toEqual('Title2');
            expect(onChange).toBeCalledTimes(0);
        });
    });

    describe('Test highlight', () => {
        it('Test css selectors which are used in scss - with highlight', () => {
            openDropdown();
            const query = 't';
            wrapper.find('input').simulate('change', {
                target: {
                    value: query
                }
            });
            expect(wrapper.find(selectors.highlightItem).length).toBeGreaterThan(0);
        });

        it('Test on "Keydown" - open context menu', async () => {
            expect(wrapper.find(selectors.treeContextMenu).length).toEqual(0);
            await triggerWindowKeydownWithFocus('Title');
            expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
            expect(wrapper.state().value).toEqual('Title');
        });

        it('Test "onInput"', async () => {
            const query = 'Title';
            wrapper.find('input').simulate('change', {
                target: {
                    value: query
                }
            });

            expect(wrapper.find(selectors.highlightItem).length).toEqual(1);
            expect(wrapper.find(selectors.highlightItem).text()).toEqual(query);
        });

        it('Test input change when submenu closed with arrow left', async () => {
            triggerWindowKeydownWithFocus('Title');
            triggerWindowKeydownWithFocus('Title.Draft', 'ArrowRight');
            triggerWindowKeydownWithFocus('Title', 'ArrowLeft');
            expect(wrapper.state('valueChanged')).toEqual(true);
            expect(wrapper.state('value')).toEqual('Title');
        });

        it('Test input change with path and arrow right - value used from submenu', async () => {
            triggerWindowKeydownWithFocus('Title');
            triggerWindowKeydownWithFocus('Title.Draft', 'ArrowRight');
            expect(wrapper.state('value')).toEqual('Title.Draft');
        });

        it('Test input change with path when submenu opened', async () => {
            triggerWindowKeydownWithFocus('Title');
            triggerWindowKeydownWithFocus('Title.SAP__Messages', 'ArrowRight');
            expect(wrapper.state('value')).toEqual('Title.SAP__Messages');
            wrapper.find('.ms-ContextualMenu-list').simulate('keyDown', { key: 'Enter' });
            expect(wrapper.state('valueChanged')).toEqual(true);
            expect(wrapper.state('value')).toEqual('Title.SAP__Messages');
        });

        it('Test menu open on Enter', async () => {
            wrapper.find('input').simulate('keyDown', { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
        });

        it('Test Menu close on Tab press', () => {
            openDropdown();
            wrapper.find('input').simulate('keyDown', { key: 'Tab' });
            expect(wrapper.find(selectors.treeContextMenu).length).toEqual(0);
        });

        it('Test input click to open context menu', async () => {
            wrapper.find('input').simulate('click', document.createEvent('Events'));
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
        });

        it('Test submenu item click', async () => {
            triggerWindowKeydownWithFocus('Title');
            await new Promise((resolve) => setTimeout(resolve, 100));
            wrapper.find('button.ms-ContextualMenu-splitMenu').simulate('click', document.createEvent('Events'));
            expect(wrapper.find(`div${selectors.treeContextMenu}`).length).toEqual(2);
            expect(wrapper.state('valueChanged')).toEqual(true);
            expect(wrapper.state('value')).toEqual('Title');
        });
    });

    describe('Submenu offset', () => {
        const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
        const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
        const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

        beforeEach(() => {
            wrapper.setProps({
                placeholderText: '',
                onParameterValueChange: () => {
                    return '';
                },
                items: [
                    {
                        value: '__OperationControl',
                        label: '__OperationControl',
                        children: [
                            { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                            { value: '_Title', label: '_Title', children: [] }
                        ]
                    }
                ]
            });
        });

        afterAll(() => {
            Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
                value: originalScrollHeight
            });
            Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
                value: originalClientHeight
            });
            //Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
                value: originalClientWidth
            });
        });

        const testCases = [
            {
                name: 'Scrollable - 15 width',
                scrollHeight: 1000,
                clientHeight: 500,
                offsetWidth: 400,
                clientWidth: 385,
                expectOffset: 15
            },
            // Try different size to avoid hardcoded values
            {
                name: 'Scrollable - 50 width',
                scrollHeight: 1000,
                clientHeight: 500,
                offsetWidth: 400,
                clientWidth: 350,
                expectOffset: 50
            },
            // Without scrollbar
            {
                name: 'Scrollable - 50 width',
                scrollHeight: 1000,
                clientHeight: 1000,
                offsetWidth: 400,
                clientWidth: 350,
                expectOffset: 0
            }
        ];

        for (const testCase of testCases) {
            it(`${testCase.name}`, () => {
                // Prepare mock data
                Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
                    configurable: true,
                    value: testCase.scrollHeight
                });
                Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
                    configurable: true,
                    value: testCase.clientHeight
                });
                Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
                    configurable: true,
                    value: testCase.offsetWidth
                });
                Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
                    configurable: true,
                    value: testCase.clientWidth
                });
                // Open dropdown menu to trigger scroll calculation
                openDropdown();
                // Check first result
                expect(wrapper.find('.ms-ContextualMenu-container').length).toEqual(1);
                expect(wrapper.find('div.ms-Callout').length).toEqual(1);
                // Trigger sumbenu expand
                wrapper.find('button.ms-ContextualMenu-splitMenu').simulate('click', document.createEvent('Events'));
                // Check submenu offset
                expect(wrapper.find('div.ms-Callout').length).toEqual(2);
                const contextualMenuSplitButton = wrapper
                    .find('ContextualMenuSplitButton')
                    .props() as unknown as IContextualMenuItem;
                const offset = contextualMenuSplitButton.item.subMenuProps.calloutProps.styles.root.marginLeft;
                expect(offset).toEqual(testCase.expectOffset);
            });
        }
    });

    describe('Circular navigation should be disabled', () => {
        const clossestMock = (at: number) => {
            return (selector: string): HTMLElement | undefined => {
                if (selector === 'ul') {
                    return wrapper.find('ul.ms-ContextualMenu-list').getDOMNode() as HTMLElement;
                } else if (selector === 'li') {
                    return wrapper.find('li.ms-ContextualMenu-item').at(at).getDOMNode() as HTMLElement;
                } else if (selector.indexOf('ui-tree-callout') !== -1) {
                    // Just dummy element is enough
                    return document.createElement('div');
                }
                return undefined;
            };
        };
        it('Ordinary scenario', async () => {
            openDropdown();
            await new Promise((resolve) => setTimeout(resolve, 300));
            expect(windowEventMock.domEventListeners['keydown'].length).toEqual(3);
            const event = {
                key: 'ArrowDown',
                stopPropagation: jest.fn(),
                preventDefault: jest.fn()
            };
            windowEventMock.simulateEvent('keydown', event);
            expect(event.stopPropagation).toBeCalledTimes(0);
            expect(event.preventDefault).toBeCalledTimes(0);
        });

        describe('Last and first item at same time', () => {
            let focusSpy: jest.SpyInstance;
            beforeEach(() => {
                focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            });
            it('ArrowDown', () => {
                openDropdown();
                const node = document.createElement('div');
                jest.spyOn(node, 'closest').mockImplementation(clossestMock(0));
                jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                const event = {
                    key: 'ArrowDown',
                    stopPropagation: jest.fn(),
                    preventDefault: jest.fn()
                };
                focusSpy.mockClear();
                windowEventMock.simulateEvent('keydown', event);
                expect(event.stopPropagation).toBeCalledTimes(1);
                expect(event.preventDefault).toBeCalledTimes(1);
                expect(focusSpy).toBeCalledTimes(0);
            });

            it('ArrowUp', () => {
                openDropdown();
                const node = document.createElement('div');
                jest.spyOn(node, 'closest').mockImplementation(clossestMock(0));
                jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                const event = {
                    key: 'ArrowUp',
                    stopPropagation: jest.fn(),
                    preventDefault: jest.fn()
                };
                focusSpy.mockClear();
                windowEventMock.simulateEvent('keydown', event);
                expect(event.stopPropagation).toBeCalledTimes(1);
                expect(event.preventDefault).toBeCalledTimes(1);
                expect(focusSpy).toBeCalledTimes(1);
            });
        });

        describe('Menu with multiple items', () => {
            let focusSpy: jest.SpyInstance;
            beforeEach(() => {
                windowEventMock = mockDomEventListener(window);
                wrapper = Enzyme.mount(
                    <UITreeDropdown
                        placeholderText="Select value"
                        onParameterValueChange={onChange}
                        items={[
                            {
                                value: 'Title',
                                label: 'Title',
                                children: [
                                    { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                                    { value: 'Dratft', label: 'Dratft', children: [] }
                                ]
                            },
                            { value: 'Title2', label: 'Title2', children: [] },
                            { value: 'Title3', label: 'Title3', children: [] }
                        ]}
                    />
                );
            });
            beforeEach(() => {
                focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            });

            const testCases = [
                {
                    name: 'ArrowDown on bottom',
                    index: 2,
                    key: 'ArrowDown',
                    stopPropagation: 1,
                    focusSpy: 0
                },
                {
                    name: 'ArrowUp on bottom',
                    index: 2,
                    key: 'ArrowUp',
                    stopPropagation: 0,
                    focusSpy: 0
                },
                {
                    name: 'ArrowDown on top',
                    index: 0,
                    key: 'ArrowDown',
                    stopPropagation: 0,
                    focusSpy: 0
                },
                {
                    name: 'ArrowUp on top',
                    index: 0,
                    key: 'ArrowUp',
                    stopPropagation: 1,
                    focusSpy: 1
                },
                {
                    name: 'ArrowDown on middle',
                    index: 1,
                    key: 'ArrowDown',
                    stopPropagation: 0,
                    focusSpy: 0
                },
                {
                    name: 'ArrowUp on middle',
                    index: 1,
                    key: 'ArrowUp',
                    stopPropagation: 0,
                    focusSpy: 0
                }
            ];

            for (const testCase of testCases) {
                it(testCase.name, () => {
                    openDropdown();
                    const node = document.createElement('div');
                    jest.spyOn(node, 'closest').mockImplementation(clossestMock(testCase.index));
                    jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                    const event = {
                        key: testCase.key,
                        stopPropagation: jest.fn(),
                        preventDefault: jest.fn()
                    };
                    focusSpy.mockClear();
                    windowEventMock.simulateEvent('keydown', event);
                    expect(event.stopPropagation).toBeCalledTimes(testCase.stopPropagation);
                    expect(event.preventDefault).toBeCalledTimes(testCase.stopPropagation);
                    expect(focusSpy).toBeCalledTimes(testCase.focusSpy);
                });
            }
        });
    });

    describe('Open with "Enter" and focus current value', () => {
        let focusSpy: jest.SpyInstance;
        const refreshWrapper = (value?: string) => {
            focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            windowEventMock = mockDomEventListener(window);
            wrapper = Enzyme.mount(
                <UITreeDropdown
                    placeholderText="Select value"
                    onParameterValueChange={onChange}
                    value={value}
                    items={[
                        {
                            value: 'Title',
                            label: 'Title',
                            children: [
                                { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                                { value: 'Draft', label: 'Draft', children: [] }
                            ]
                        },
                        {
                            value: 'Title2',
                            label: 'Title2',
                            children: [
                                { value: 'Dummy1', label: 'Dummy1', children: [] },
                                { value: 'Dummy2', label: 'Dummy2', children: [] },
                                { value: 'Dummy3', label: 'Dummy3', children: [] },
                                { value: 'Dummy4', label: 'Dummy4', children: [] },
                                { value: 'Dummy5', label: 'Dummy5', children: [] }
                            ]
                        },
                        { value: 'Title3', label: 'Title3', children: [] }
                    ]}
                />
            );
        };

        const getFocusedElement = (index: number): HTMLElement => {
            return focusSpy.mock.instances[index] as unknown as HTMLElement;
        };

        const getFocusedElementIndexInList = (index: number): number => {
            const element = getFocusedElement(index);
            const item = element.parentNode;
            const list = item.parentNode;
            return Array.prototype.indexOf.call(list.childNodes, item);
        };

        beforeEach(() => {
            refreshWrapper();
        });

        afterEach(() => {
            focusSpy.mockClear();
        });

        it('No value set', async () => {
            focusSpy.mockClear();
            // Open with Enter press
            wrapper.find('input').simulate('keyDown', { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
            expect(focusSpy).toBeCalledTimes(0);
        });

        const firstLevelCases = [
            {
                value: 'Title',
                expectIndex: 0
            },
            {
                value: 'Title2',
                expectIndex: 1
            },
            {
                value: 'Title3',
                expectIndex: 2
            }
        ];
        for (const testCase of firstLevelCases) {
            it(`First level - index ${testCase.expectIndex}`, async () => {
                focusSpy.mockClear();
                refreshWrapper(testCase.value);
                // Open with Enter press
                wrapper.find('input').simulate('keyDown', { key: 'Enter' });
                await new Promise((resolve) => setTimeout(resolve, 100));
                expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
                expect(focusSpy).toBeCalledTimes(1);
                expect(getFocusedElementIndexInList(0)).toEqual(testCase.expectIndex);
            });
        }

        it(`Item not found`, async () => {
            focusSpy.mockClear();
            refreshWrapper('Dummy404');
            // Open with Enter press
            wrapper.find('input').simulate('keyDown', { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
            expect(focusSpy).toBeCalledTimes(0);
        });

        const secondLevelCases = [
            {
                value: 'Title.SAP__Messages',
                parentIndex: 0,
                expectIndex: 0
            },
            {
                value: 'Title.Draft',
                parentIndex: 0,
                expectIndex: 1
            },
            {
                value: 'Title2.Dummy3',
                parentIndex: 1,
                expectIndex: 2
            },
            {
                value: 'Title2.Dummy5',
                parentIndex: 1,
                expectIndex: 4
            }
        ];
        for (const testCase of secondLevelCases) {
            it(`Second level - index ${testCase.expectIndex}`, async () => {
                refreshWrapper(testCase.value);
                focusSpy.mockClear();
                // Open with Enter press
                wrapper.find('input').simulate('keyDown', { key: 'Enter' });
                await new Promise((resolve) => setTimeout(resolve, 100));
                expect(wrapper.find(selectors.treeContextMenu).length).toBeGreaterThan(0);
                expect(focusSpy).toBeCalledTimes(2);
                // As first we need focus container to avoid focus blinking after we will focus submenu's item
                const focusedElement = getFocusedElement(1);
                expect(focusedElement.className).toContain('ms-ContextualMenu-container');
                focusSpy.mockClear();
                // Check focus of submenu item, but we need simulate some calls
                const items = wrapper.state().items;
                items[testCase.parentIndex].subMenuProps.focusZoneProps.onFocus({
                    target: focusedElement
                } as React.FocusEvent<HTMLElement>);
                expect(focusSpy).toBeCalledTimes(1);
                expect(getFocusedElementIndexInList(0)).toEqual(testCase.expectIndex);
                focusSpy.mockClear();
            });
        }
    });
});
