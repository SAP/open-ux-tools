import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { UISplitterProps } from '../../../src/components/UISection/UISplitter';
import { UISplitter, UISplitterType, UISplitterLayoutType } from '../../../src/components/UISection/UISplitter';
import { initIcons, UiIcons } from '../../../src/components/Icons';

initIcons();

describe('<Splitter />', () => {
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;
    const onResize = jest.fn();

    beforeEach(() => {
        renderResult = render(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        container = renderResult.container;
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            cb(1);
            return 1;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        if (renderResult) {
            renderResult.unmount();
        }
    });

    const simulateMouseEvent = (type: string, x = 0, y = 0): void => {
        const event: MouseEvent = document.createEvent('MouseEvents');
        event.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
        document.body.dispatchEvent(event);
    };

    it('Should render a PropertiesPanel component', () => {
        expect(container.querySelectorAll('.splitter').length).toEqual(1);
        expect(container.querySelectorAll('.splitter--horizontal').length).toEqual(1);
        expect(container.querySelectorAll('.splitter--vertical').length).toEqual(0);
    });

    it('Should render as vertical splitter', () => {
        renderResult.rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} vertical={true} />);
        expect(container.querySelectorAll('.splitter--horizontal').length).toEqual(0);
        expect(container.querySelectorAll('.splitter--vertical').length).toEqual(1);
    });

    const orientations = [true, false];
    for (const orientation of orientations) {
        it('Test resize event ' + orientation, () => {
            const mouseStartCoordinate = 50;
            const mouseMoveCoordinate1 = 200;
            const mouseMoveCoordinate2 = 300;
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            onResize.mockReturnValue(true);
            const { container: resizeContainer } = render(
                <UISplitter
                    type={UISplitterType.Resize}
                    onResizeStart={onResizeStart}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                    vertical={orientation}
                />
            );
            const splitter = resizeContainer.querySelector('.splitter') as HTMLElement;
            fireEvent.mouseDown(splitter, { clientX: mouseStartCoordinate, button: 0, clientY: mouseStartCoordinate });
            simulateMouseEvent('mousemove', mouseMoveCoordinate1, mouseMoveCoordinate1);
            simulateMouseEvent('mousemove', mouseMoveCoordinate2, mouseMoveCoordinate2);
            simulateMouseEvent('mouseup', mouseMoveCoordinate2, mouseMoveCoordinate2);
            // Another 'simulateMouseEvent' with 'mousemove' to detect is removeEventListener called
            simulateMouseEvent('mousemove', 300, 300);
            expect(onResizeStart).toHaveBeenCalledTimes(1);
            expect(onResize).toHaveBeenCalledTimes(2);
            expect(onResize.mock.calls[0][0]).toEqual(mouseMoveCoordinate1 - mouseStartCoordinate);
            expect(onResize.mock.calls[1][0]).toEqual(mouseMoveCoordinate2 - mouseStartCoordinate);
            expect(onResizeEnd).toHaveBeenCalledTimes(1);
        });
    }

    describe('Keyboard resize and toggle', () => {
        it('Test spliter resize using keyboard', () => {
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            const onToggle = jest.fn();
            onResize.mockReturnValue(true);
            renderResult.rerender(
                <UISplitter
                    type={UISplitterType.Resize}
                    onResize={onResize}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    onToggle={onToggle}
                />
            );
            // Pass some dummy keys, which should not trigger resize
            const splitter = container.querySelector('.splitter') as HTMLElement;
            fireEvent.keyDown(splitter, { key: 'w' });
            fireEvent.keyDown(splitter, { key: 'a' });
            fireEvent.keyDown(splitter, { key: 'S' });
            fireEvent.keyDown(splitter, { key: 'D' });
            // Resize Left
            fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
            expect(onResizeStart).toHaveBeenCalledTimes(1);
            expect(onResize).toHaveBeenCalledTimes(1);
            expect(onResize.mock.calls[0][0]).toEqual(-10);
            expect(onResizeEnd).toHaveBeenCalledTimes(1);
            // Resize Top - should be same as Left
            fireEvent.keyDown(splitter, { key: 'ArrowUp' });
            expect(onResize.mock.calls[1][0]).toEqual(-10);
            // One more Left
            fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
            expect(onResize.mock.calls[2][0]).toEqual(-10);
            // Go Right
            fireEvent.keyDown(splitter, { key: 'ArrowRight' });
            expect(onResize.mock.calls[3][0]).toEqual(10);
            // One more Left
            fireEvent.keyDown(splitter, { key: 'ArrowDown' });
            expect(onResize.mock.calls[4][0]).toEqual(10);
            // Another unaccaptable dummy keys
            fireEvent.keyDown(splitter, { key: '4' });
            fireEvent.keyDown(splitter, { key: '8' });
            fireEvent.keyDown(splitter, { key: '1' });
            fireEvent.keyDown(splitter, { key: '5' });
            fireEvent.keyDown(splitter, { key: 'Enter' });
            // Total call;
            expect(onResizeEnd).toHaveBeenCalledTimes(5);
            // Toggle should not be called
            expect(onToggle).toHaveBeenCalledTimes(0);
        });

        it('Test spliter toggle using keyboard', () => {
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            const onToggle = jest.fn();
            onResize.mockReturnValue(true);
            renderResult.rerender(
                <UISplitter
                    type={UISplitterType.Toggle}
                    onResize={onResize}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    onToggle={onToggle}
                />
            );
            // Some unacceptable variants for toggle
            const splitterToggle = container.querySelector('.splitter') as HTMLElement;
            fireEvent.keyDown(splitterToggle, { key: 'w' });
            fireEvent.keyDown(splitterToggle, { key: 'a' });
            fireEvent.keyDown(splitterToggle, { key: 'S' });
            fireEvent.keyDown(splitterToggle, { key: 'D' });
            fireEvent.keyDown(splitterToggle, { key: 'ArrowUp' });
            fireEvent.keyDown(splitterToggle, { key: 'ArrowLeft' });
            fireEvent.keyDown(splitterToggle, { key: 'ArrowRight' });
            fireEvent.keyDown(splitterToggle, { key: 'ArrowDown' });
            fireEvent.keyDown(splitterToggle, { key: '4' });
            // Expect resize
            expect(onResizeStart).toHaveBeenCalledTimes(0);
            expect(onResize).toHaveBeenCalledTimes(0);
            expect(onResizeEnd).toHaveBeenCalledTimes(0);
            expect(onToggle).toHaveBeenCalledTimes(0);
            // Trigger toggle
            fireEvent.keyDown(splitterToggle, { key: 'Enter' });
            expect(onToggle).toHaveBeenCalledTimes(1);
        });

        it('Test spliter toggle - aria', () => {
            renderResult.rerender(<UISplitter type={UISplitterType.Toggle} onResize={onResize} />);
            const toggleSplitter = container.querySelector('.splitter--toggle') as HTMLElement;
            expect(toggleSplitter.getAttribute('role')).toEqual('button');
            expect(toggleSplitter.getAttribute('aria-pressed')).toEqual('true');
            renderResult.rerender(<UISplitter type={UISplitterType.Toggle} onResize={onResize} hidden={true} />);
            expect(toggleSplitter.getAttribute('aria-pressed')).toEqual('false');
        });
    });

    it('Test "splitterTabIndex" property', () => {
        // default value
        const splitterHorizontal = container.querySelector('.splitter--horizontal') as HTMLElement;
        expect(splitterHorizontal.tabIndex).toEqual(0);
        renderResult.rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} splitterTabIndex={-1} />);
        expect(splitterHorizontal.tabIndex).toEqual(-1);
    });

    it('Test "hidden" property', () => {
        expect(container.querySelectorAll('.splitter--hidden').length).toEqual(0);
        renderResult.rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} hidden={true} />);
        expect(container.querySelectorAll('.splitter--hidden').length).toEqual(1);
    });

    describe('Splitter icon', () => {
        const testCases = [
            {
                type: UISplitterType.Toggle,
                vertical: false,
                splitterLayoutType: UISplitterLayoutType.Standard,
                expect: {
                    standard: true,
                    horizontal: true,
                    icon: UiIcons.ArrowLeft
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: false,
                splitterLayoutType: UISplitterLayoutType.Standard,
                expect: {
                    standard: true,
                    horizontal: true,
                    icon: UiIcons.VerticalGrip
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: true,
                splitterLayoutType: UISplitterLayoutType.Standard,
                expect: {
                    standard: true,
                    vertical: true,
                    icon: UiIcons.VerticalGrip
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: false,
                splitterLayoutType: UISplitterLayoutType.Compact,
                expect: {
                    compact: true,
                    horizontal: true,
                    icon: UiIcons.Grabber
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: true,
                splitterLayoutType: UISplitterLayoutType.Compact,
                expect: {
                    compact: true,
                    vertical: true,
                    icon: UiIcons.Grabber
                }
            }
        ];

        for (const testCase of testCases) {
            it(`Splitter types - vertical=${testCase.vertical} splitterLayoutType=${testCase.splitterLayoutType} type=${testCase.type} `, () => {
                expect(container.querySelectorAll('.splitter--hidden').length).toEqual(0);
                renderResult.rerender(
                    <UISplitter
                        type={testCase.type}
                        onResize={onResize}
                        vertical={testCase.vertical}
                        splitterLayoutType={testCase.splitterLayoutType}
                    />
                );
                expect(container.querySelectorAll('.splitter--standard').length).toEqual(
                    testCase.expect.standard ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter--compact').length).toEqual(
                    testCase.expect.compact ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter--vertical').length).toEqual(
                    testCase.expect.vertical ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter--horizontal').length).toEqual(
                    testCase.expect.horizontal ? 1 : 0
                );

                const icon = container.querySelector('[data-icon-name]') as HTMLElement;
                expect(container.querySelectorAll('.splitter__grip').length).toEqual(1);
                expect(icon.getAttribute('data-icon-name')).toEqual(testCase.expect.icon);
            });
        }
    });
});
