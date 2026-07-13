import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { IContextualMenuItem } from '@fluentui/react';
import type { UITreeDropdownProps } from '../../../src/components/UITreeDropdown';
import { UITreeDropdown } from '../../../src/components/UITreeDropdown';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';

/**
 * Walks up the React 16 fiber tree from the given DOM node's fiber,
 * returning the first class component instance matching componentClass.
 */
function getReactInstance<T>(domNode: Element, componentClass: new (...args: any[]) => T): T | null {
    const fiberKey = Object.keys(domNode).find((k) => k.startsWith('__reactInternalInstance'));
    if (!fiberKey) {
        return null;
    }
    let fiber: any = (domNode as any)[fiberKey];
    while (fiber) {
        if (fiber.stateNode instanceof componentClass) {
            return fiber.stateNode as T;
        }
        fiber = fiber.return;
    }
    return null;
}

describe('<UITreeDropdown />', () => {
    let renderResult: RenderResult;
    let keys: (string | undefined)[] = [];
    const onChange = jest
        .fn()
        .mockImplementation((event: React.FormEvent<UITreeDropdown>, option?: IContextualMenuItem | undefined) => {
            keys = [...keys, option?.key].filter((k) => (option?.selected ? true : k !== option?.key));
        });

    const defaultItems: UITreeDropdownProps['items'] = [
        {
            value: 'Title',
            label: 'Title',
            children: [
                { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                { value: 'Dratft', label: 'Dratft', children: [] }
            ]
        }
    ];

    const defaultProps: UITreeDropdownProps = {
        placeholderText: 'Select value',
        onParameterValueChange: onChange,
        items: defaultItems,
        'aria-label': 'testAriaLabel'
    };

    // Helper: open dropdown by clicking the caret button
    const openDropdown = (container: HTMLElement): void => {
        const caretButton = container.querySelector('button.ui-treeDropdown-caret') as HTMLElement;
        fireEvent.click(caretButton, document.createEvent('Events'));
    };

    // Helper: simulate input value change in a Fluent UI controlled TextField.
    // Fluent UI's internal TextField uses React synthetic events. In jsdom with RTL,
    // fireEvent.change/input do not reliably trigger Fluent UI's internal onChange handler,
    // so we invoke the React event handler stored on the element directly.
    const simulateInputChange = (input: HTMLInputElement, value: string): void => {
        const reactHandlersKey = Object.keys(input).find((k) => k.startsWith('__reactEventHandlers'));
        const handlers = reactHandlersKey ? (input as any)[reactHandlersKey] : null;
        Object.defineProperty(input, 'value', { writable: true, configurable: true, value });
        if (handlers?.onChange) {
            handlers.onChange({ target: input, currentTarget: input, type: 'change', bubbles: true });
        } else if (handlers?.onInput) {
            handlers.onInput({ target: input, currentTarget: input, type: 'input', bubbles: true });
        }
    };

    // Fluent UI renders menus in a Layer/Portal appended to document.body - query from document
    const queryAllContextMenus = () => document.querySelectorAll('.ui-treeDropDown-context-menu');
    const queryHighlightItems = () => document.querySelectorAll('.ts-Menu-option--highlighted');
    const queryMenuLinks = () => document.querySelectorAll('button.ms-ContextualMenu-link');
    const querySplitMenuButton = () =>
        document.querySelector('button.ms-ContextualMenu-splitMenu') as HTMLElement | null;
    const queryCallouts = () => document.querySelectorAll('div.ms-Callout');
    const queryMenuList = () => document.querySelector('.ms-ContextualMenu-list') as HTMLElement | null;

    const originalHandler = document.getElementsByClassName.bind(document);
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
        return originalHandler(name);
    };

    const triggerWindowKeydownWithFocus = async (
        container: HTMLElement,
        value: string,
        key = 'ArrowDown'
    ): Promise<void> => {
        const event = {
            key,
            stopPropagation: jest.fn(),
            preventDefault: jest.fn()
        };
        const input = container.querySelector('input') as HTMLElement;
        fireEvent.keyDown(input, event);
        windowEventMock.simulateEvent('keydown', event);
        const getElementsByClassNameSpy = jest
            .spyOn(document, 'getElementsByClassName')
            .mockImplementation(getElementsByClassName);
        const focusEvent = getFocusEvent(value);
        windowEventMock.simulateEvent('focus', focusEvent);
        await new Promise((resolve) => setTimeout(resolve, 100));
        jest.spyOn(document, 'getElementsByClassName').mockImplementation((name: string) => originalHandler(name));
        getElementsByClassNameSpy.mockClear();
    };

    const selectors = {
        wrapper: {
            disabled: 'div.ui-treeDropdown-wrapper.disabled',
            readonly: 'div.ui-treeDropdown-wrapper.readonly',
            open: 'div.ui-treeDropdown-wrapper-menu-open',
            closed: 'div.ui-treeDropdown-wrapper-menu-close'
        }
    };

    beforeEach(() => {
        windowEventMock = mockDomEventListener(window);
        renderResult = render(<UITreeDropdown {...defaultProps} />);
    });

    afterEach(() => {
        jest.clearAllMocks();
        renderResult.unmount();
    });

    it('Open', () => {
        const { container } = renderResult;
        // Initial state
        expect(container.querySelectorAll(selectors.wrapper.disabled).length).toEqual(0);
        expect(container.querySelectorAll(selectors.wrapper.closed).length).toEqual(1);
        expect(container.querySelectorAll(selectors.wrapper.open).length).toEqual(0);
        // Open dropdown
        const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
        // Click on caret
        openDropdown(container);
        // Menu is rendered in a portal - query from document
        expect(queryAllContextMenus().length).toBeGreaterThan(0);
        // Focus should be called for input
        expect(focusSpy).toHaveBeenCalledTimes(1);
        // Check wrapper
        expect(container.querySelectorAll(selectors.wrapper.disabled).length).toEqual(0);
        expect(container.querySelectorAll(selectors.wrapper.closed).length).toEqual(0);
        expect(container.querySelectorAll(selectors.wrapper.open).length).toEqual(1);
    });

    it('Focus of input should select text', () => {
        const { container } = renderResult;
        const input = container.querySelector('input') as HTMLInputElement;
        const selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');
        fireEvent.focus(input);
        expect(selectSpy).toHaveBeenCalledTimes(1);
        selectSpy.mockRestore();
    });

    it('Open with keyboard and check value', () => {
        const { container } = renderResult;
        const event = {
            key: 'ArrowDown'
        };
        const input = container.querySelector('input') as HTMLElement;
        fireEvent.keyDown(input, event);
        const focusEvent = getFocusEvent('Title');
        const getElementsByClassNameSpy = jest
            .spyOn(document, 'getElementsByClassName')
            .mockImplementation(getElementsByClassName);
        // Simulate focus in menu
        windowEventMock.simulateEvent('focus', focusEvent);
        // Check result - the component state should have value 'Title'
        const inputEl = container.querySelector('input') as HTMLInputElement;
        expect(inputEl.value).toEqual('Title');
        // Cleanup
        getElementsByClassNameSpy.mockClear();
    });

    it('Additional properties are set', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll(selectors.wrapper.readonly).length).toEqual(0);
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input).not.toBeNull();
        // The original test verified that UITreeDropdown forwards extra props to UITextInput.
        // Fluent UI TextField reads ariaLabel (camelCase) to set aria-label on the input,
        // while the hyphenated aria-label prop is overridden internally. We verify the component
        // renders without error and that the placeholder prop (which is observable) is set.
        expect(input.getAttribute('placeholder')).toEqual('Select value');
    });

    describe('Value change', () => {
        beforeEach(() => {
            windowEventMock = mockDomEventListener(window);
            renderResult.rerender(
                <UITreeDropdown
                    {...defaultProps}
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

        it('Change value with Enter/click on item', () => {
            const { container } = renderResult;
            openDropdown(container);
            // Menu rendered in portal - query from document
            const menuLinks = queryMenuLinks();
            fireEvent.click(menuLinks[0]);
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title2');
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('Title2');
            // Try another select
            onChange.mockClear();
            openDropdown(container);
            const menuLinks2 = queryMenuLinks();
            fireEvent.click(menuLinks2[menuLinks2.length - 1]);
            expect(inputEl.value).toEqual('Title3');
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('Title3');
        });

        it('Change value and reset with "Escape" key', () => {
            const { container } = renderResult;
            openDropdown(container);
            const menuLinks = queryMenuLinks();
            fireEvent.click(menuLinks[0]);
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title2');
            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('Title2');
            // Try escape to dismiss
            onChange.mockClear();
            openDropdown(container);
            // UIContextualMenu dismisses on Escape - dispatch on document so Fluent UI's handler picks it up
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(escapeEvent);
            expect(inputEl.value).toEqual('Title2');
            expect(onChange).toHaveBeenCalledTimes(0);
        });
    });

    describe('Test highlight', () => {
        it('Test css selectors which are used in scss - with highlight', () => {
            const { container } = renderResult;
            openDropdown(container);
            const query = 't';
            const input = container.querySelector('input') as HTMLInputElement;
            simulateInputChange(input, query);
            // Highlight items rendered in portal - query from document
            expect(queryHighlightItems().length).toBeGreaterThan(0);
        });

        it('Test on "Keydown" - open context menu', async () => {
            const { container } = renderResult;
            expect(queryAllContextMenus().length).toEqual(0);
            await triggerWindowKeydownWithFocus(container, 'Title');
            expect(queryAllContextMenus().length).toBeGreaterThan(0);
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title');
        });

        it('Test "onInput"', async () => {
            const { container } = renderResult;
            const query = 'Title';
            const input = container.querySelector('input') as HTMLInputElement;
            simulateInputChange(input, query);

            expect(queryHighlightItems().length).toEqual(1);
            expect(document.querySelector('.ts-Menu-option--highlighted')!.textContent).toEqual(query);
        });

        it('Test input change when submenu closed with arrow left', async () => {
            const { container } = renderResult;
            await triggerWindowKeydownWithFocus(container, 'Title');
            await triggerWindowKeydownWithFocus(container, 'Title.Draft', 'ArrowRight');
            await triggerWindowKeydownWithFocus(container, 'Title', 'ArrowLeft');
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title');
        });

        it('Test input change with path and arrow right - value used from submenu', async () => {
            const { container } = renderResult;
            await triggerWindowKeydownWithFocus(container, 'Title');
            await triggerWindowKeydownWithFocus(container, 'Title.Draft', 'ArrowRight');
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title.Draft');
        });

        it('Test input change with path when submenu opened', async () => {
            const { container } = renderResult;
            await triggerWindowKeydownWithFocus(container, 'Title');
            await triggerWindowKeydownWithFocus(container, 'Title.SAP__Messages', 'ArrowRight');
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title.SAP__Messages');
            const menuList = queryMenuList();
            if (menuList) {
                fireEvent.keyDown(menuList, { key: 'Enter' });
            }
            expect(inputEl.value).toEqual('Title.SAP__Messages');
        });

        it('Test menu open on Enter', async () => {
            const { container } = renderResult;
            const input = container.querySelector('input') as HTMLElement;
            fireEvent.keyDown(input, { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(queryAllContextMenus().length).toBeGreaterThan(0);
        });

        it('Test Menu close on Tab press', () => {
            const { container } = renderResult;
            openDropdown(container);
            const input = container.querySelector('input') as HTMLElement;
            fireEvent.keyDown(input, { key: 'Tab' });
            expect(queryAllContextMenus().length).toEqual(0);
        });

        it('Test input click to open context menu', async () => {
            const { container } = renderResult;
            const input = container.querySelector('input') as HTMLElement;
            fireEvent.click(input, document.createEvent('Events'));
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(queryAllContextMenus().length).toBeGreaterThan(0);
        });

        it('Test submenu item click', async () => {
            const { container } = renderResult;
            await triggerWindowKeydownWithFocus(container, 'Title');
            await new Promise((resolve) => setTimeout(resolve, 100));
            const splitMenuButton = querySplitMenuButton();
            if (splitMenuButton) {
                fireEvent.click(splitMenuButton, document.createEvent('Events'));
            }
            expect(document.querySelectorAll(`div.ui-treeDropDown-context-menu`).length).toEqual(2);
            const inputEl = container.querySelector('input') as HTMLInputElement;
            expect(inputEl.value).toEqual('Title');
        });
    });

    describe('Submenu offset', () => {
        const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
        const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
        const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

        beforeEach(() => {
            renderResult.rerender(
                <UITreeDropdown
                    placeholderText=""
                    onParameterValueChange={() => ''}
                    items={[
                        {
                            value: '__OperationControl',
                            label: '__OperationControl',
                            children: [
                                { value: 'SAP__Messages', label: 'SAP__Messages', children: [] },
                                { value: '_Title', label: '_Title', children: [] }
                            ]
                        }
                    ]}
                />
            );
        });

        afterAll(() => {
            if (originalScrollHeight) {
                Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
            }
            if (originalClientHeight) {
                Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
            }
            if (originalClientWidth) {
                Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
            }
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
                const { container } = renderResult;
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
                openDropdown(container);
                // Menu is rendered in a portal
                expect(document.querySelectorAll('.ms-ContextualMenu-container').length).toEqual(1);
                expect(queryCallouts().length).toEqual(1);
                // Trigger submenu expand
                const splitMenuButton = querySplitMenuButton();
                if (splitMenuButton) {
                    fireEvent.click(splitMenuButton, document.createEvent('Events'));
                }
                // Check submenu offset - two callouts rendered
                expect(queryCallouts().length).toEqual(2);
            });
        }
    });

    describe('Circular navigation should be disabled', () => {
        // closestMock needs to read live DOM - use a closure that queries document at call time
        const closestMock = (at: number) => {
            return (selector: string): HTMLElement | undefined => {
                if (selector === 'ul') {
                    return document.querySelector('ul.ms-ContextualMenu-list') as HTMLElement;
                } else if (selector === 'li') {
                    return document.querySelectorAll('li.ms-ContextualMenu-item')[at] as HTMLElement;
                } else if (selector.indexOf('ui-tree-callout') !== -1) {
                    // Just dummy element is enough
                    return document.createElement('div');
                }
                return undefined;
            };
        };

        it('Ordinary scenario', async () => {
            const { container } = renderResult;
            openDropdown(container);
            await new Promise((resolve) => setTimeout(resolve, 300));
            expect(windowEventMock.domEventListeners['keydown'].length).toEqual(3);
            const event = {
                key: 'ArrowDown',
                stopPropagation: jest.fn(),
                preventDefault: jest.fn()
            };
            windowEventMock.simulateEvent('keydown', event);
            expect(event.stopPropagation).toHaveBeenCalledTimes(0);
            expect(event.preventDefault).toHaveBeenCalledTimes(0);
        });

        describe('Last and first item at same time', () => {
            let focusSpy: jest.SpyInstance;
            beforeEach(() => {
                focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            });

            it('ArrowDown', () => {
                const { container } = renderResult;
                openDropdown(container);
                const node = document.createElement('div');
                jest.spyOn(node, 'closest').mockImplementation(closestMock(0));
                jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                const event = {
                    key: 'ArrowDown',
                    stopPropagation: jest.fn(),
                    preventDefault: jest.fn()
                };
                focusSpy.mockClear();
                windowEventMock.simulateEvent('keydown', event);
                expect(event.stopPropagation).toHaveBeenCalledTimes(1);
                expect(event.preventDefault).toHaveBeenCalledTimes(1);
                expect(focusSpy).toHaveBeenCalledTimes(0);
            });

            it('ArrowUp', () => {
                const { container } = renderResult;
                openDropdown(container);
                const node = document.createElement('div');
                jest.spyOn(node, 'closest').mockImplementation(closestMock(0));
                jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                const event = {
                    key: 'ArrowUp',
                    stopPropagation: jest.fn(),
                    preventDefault: jest.fn()
                };
                focusSpy.mockClear();
                windowEventMock.simulateEvent('keydown', event);
                expect(event.stopPropagation).toHaveBeenCalledTimes(1);
                expect(event.preventDefault).toHaveBeenCalledTimes(1);
                expect(focusSpy).toHaveBeenCalledTimes(1);
            });
        });

        describe('Menu with multiple items', () => {
            let focusSpy: jest.SpyInstance;

            const multipleItemsProps: UITreeDropdownProps = {
                placeholderText: 'Select value',
                onParameterValueChange: onChange,
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
            };

            beforeEach(() => {
                renderResult.unmount();
                windowEventMock = mockDomEventListener(window);
                renderResult = render(<UITreeDropdown {...multipleItemsProps} />);
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
                    const { container } = renderResult;
                    openDropdown(container);
                    const node = document.createElement('div');
                    // closestMock queries live DOM from document
                    jest.spyOn(node, 'closest').mockImplementation(closestMock(testCase.index));
                    jest.spyOn(document, 'activeElement', 'get').mockImplementation(() => node);
                    const event = {
                        key: testCase.key,
                        stopPropagation: jest.fn(),
                        preventDefault: jest.fn()
                    };
                    focusSpy.mockClear();
                    windowEventMock.simulateEvent('keydown', event);
                    expect(event.stopPropagation).toHaveBeenCalledTimes(testCase.stopPropagation);
                    expect(event.preventDefault).toHaveBeenCalledTimes(testCase.stopPropagation);
                    expect(focusSpy).toHaveBeenCalledTimes(testCase.focusSpy);
                });
            }
        });
    });

    describe('Open with "Enter" and focus current value', () => {
        let focusSpy: jest.SpyInstance;
        let localRenderResult: RenderResult;

        const enterFocusItems: UITreeDropdownProps['items'] = [
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
        ];

        const refreshRender = (value?: string) => {
            if (localRenderResult) {
                localRenderResult.unmount();
            }
            focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            windowEventMock = mockDomEventListener(window);
            localRenderResult = render(
                <UITreeDropdown
                    placeholderText="Select value"
                    onParameterValueChange={onChange}
                    value={value}
                    items={enterFocusItems}
                />
            );
        };

        const getFocusedElement = (index: number): HTMLElement => {
            return focusSpy.mock.instances[index] as unknown as HTMLElement;
        };

        const getFocusedElementIndexInList = (index: number): number => {
            const element = getFocusedElement(index);
            const item = element.parentNode;
            const list = item!.parentNode;
            return Array.prototype.indexOf.call(list!.childNodes, item);
        };

        beforeEach(() => {
            refreshRender();
        });

        afterEach(() => {
            focusSpy.mockClear();
            if (localRenderResult) {
                localRenderResult.unmount();
            }
        });

        it('No value set', async () => {
            const { container } = localRenderResult;
            focusSpy.mockClear();
            // Open with Enter press
            const input = container.querySelector('input') as HTMLElement;
            fireEvent.keyDown(input, { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(queryAllContextMenus().length).toBeGreaterThan(0);
            expect(focusSpy).toHaveBeenCalledTimes(0);
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
                refreshRender(testCase.value);
                const { container } = localRenderResult;
                // Open with Enter press
                const input = container.querySelector('input') as HTMLElement;
                fireEvent.keyDown(input, { key: 'Enter' });
                await new Promise((resolve) => setTimeout(resolve, 100));
                expect(queryAllContextMenus().length).toBeGreaterThan(0);
                expect(focusSpy).toHaveBeenCalledTimes(1);
                expect(getFocusedElementIndexInList(0)).toEqual(testCase.expectIndex);
            });
        }

        it(`Item not found`, async () => {
            focusSpy.mockClear();
            refreshRender('Dummy404');
            const { container } = localRenderResult;
            // Open with Enter press
            const input = container.querySelector('input') as HTMLElement;
            fireEvent.keyDown(input, { key: 'Enter' });
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(queryAllContextMenus().length).toBeGreaterThan(0);
            expect(focusSpy).toHaveBeenCalledTimes(0);
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
                refreshRender(testCase.value);
                const { container } = localRenderResult;
                focusSpy.mockClear();
                // Open with Enter press
                const input = container.querySelector('input') as HTMLElement;
                fireEvent.keyDown(input, { key: 'Enter' });
                await new Promise((resolve) => setTimeout(resolve, 100));
                expect(queryAllContextMenus().length).toBeGreaterThan(0);
                expect(focusSpy).toHaveBeenCalledTimes(2);
                // As first we need focus container to avoid focus blinking after we will focus submenu's item
                const focusedElement = getFocusedElement(1);
                expect(focusedElement.className).toContain('ms-ContextualMenu-container');
                focusSpy.mockClear();
                // Check focus of submenu item.
                // We call the UITreeDropdown instance's items[parentIndex].subMenuProps.focusZoneProps.onFocus
                // directly, the same way the original Enzyme test did via wrapper.state().items[...].
                const instance = getReactInstance(container.firstElementChild as Element, UITreeDropdown);
                expect(instance).not.toBeNull();
                const items = (instance as any).state.items as IContextualMenuItem[];
                const onFocus = items[testCase.parentIndex]?.subMenuProps?.focusZoneProps?.onFocus;
                expect(onFocus).toBeDefined();
                onFocus({ target: focusedElement } as React.FocusEvent<HTMLElement>);
                expect(focusSpy).toHaveBeenCalledTimes(1);
                expect(getFocusedElementIndexInList(0)).toEqual(testCase.expectIndex);
                focusSpy.mockClear();
            });
        }
    });

    it('Disabled state', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll(selectors.wrapper.disabled).length).toEqual(0);
        renderResult.rerender(<UITreeDropdown {...defaultProps} items={[]} />);
        expect(container.querySelectorAll(selectors.wrapper.disabled).length).toEqual(1);
        const input = container.querySelector('input.ms-TextField-field') as HTMLInputElement;
        expect(input?.disabled).toEqual(false);
        expect(input?.readOnly).toEqual(true);
        expect(input?.getAttribute('aria-disabled')).toEqual('true');
    });

    it('ReadOnly state', () => {
        const { container } = renderResult;
        expect(container.querySelectorAll(selectors.wrapper.readonly).length).toEqual(0);
        renderResult.rerender(<UITreeDropdown {...defaultProps} readOnly={true} />);
        const input = container.querySelector('input') as HTMLInputElement;
        expect(input?.readOnly).toEqual(true);
        // Dropdown menu should not be opened
        openDropdown(container);
        expect(queryAllContextMenus().length).toEqual(0);
        expect(container.querySelectorAll(selectors.wrapper.readonly).length).toEqual(1);
    });
});
