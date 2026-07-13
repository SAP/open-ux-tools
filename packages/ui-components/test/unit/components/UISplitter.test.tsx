import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import type { UISplitterProps } from '../../../src/components/UISection/UISplitter';
import { UISplitter, UISplitterType, UISplitterLayoutType } from '../../../src/components/UISection/UISplitter';
import { initIcons, UiIcons } from '../../../src/components/Icons';

initIcons();

describe('<Splitter />', () => {
    const onResize = jest.fn();

    beforeEach(() => {
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            cb(1);
            return 1;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const simulateMouseEvent = (type: string, x = 0, y = 0): void => {
        const event: MouseEvent = document.createEvent('MouseEvents');
        event.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
        document.body.dispatchEvent(event);
    };

    it('Should render a PropertiesPanel component', () => {
        const { container } = render(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        expect(container.querySelector('.splitter')).toBeTruthy();
        expect(container.querySelectorAll('.splitter--horizontal')).toHaveLength(1);
        expect(container.querySelectorAll('.splitter--vertical')).toHaveLength(0);
    });

    it('Should render as vertical splitter', () => {
        const { container, rerender } = render(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} vertical={true} />);
        expect(container.querySelectorAll('.splitter--horizontal')).toHaveLength(0);
        expect(container.querySelectorAll('.splitter--vertical')).toHaveLength(1);
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
            const { container } = render(
                <UISplitter
                    type={UISplitterType.Resize}
                    onResizeStart={onResizeStart}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                    vertical={orientation}
                />
            );
            const splitter = container.querySelector('.splitter') as HTMLElement;
            // Check if there no 'splitter--active' before resizing
            expect(container.querySelectorAll('.splitter--active')).toHaveLength(0);
            fireEvent.mouseDown(splitter, { clientX: mouseStartCoordinate, button: 0, clientY: mouseStartCoordinate });
            simulateMouseEvent('mousemove', mouseMoveCoordinate1, mouseMoveCoordinate1);
            simulateMouseEvent('mousemove', mouseMoveCoordinate2, mouseMoveCoordinate2);
            // Check if there is 'splitter--active' during resize
            expect(container.querySelectorAll('.splitter--active')).toHaveLength(1);
            simulateMouseEvent('mouseup', mouseMoveCoordinate2, mouseMoveCoordinate2);
            // Check if there no 'splitter--active' after resizing
            expect(container.querySelectorAll('.splitter--active')).toHaveLength(0);
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
            const { container } = render(
                <UISplitter
                    type={UISplitterType.Resize}
                    onResize={onResize}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    onToggle={onToggle}
                />
            );
            const splitter = container.querySelector('.splitter') as HTMLElement;
            // Pass some dummy keys, which should not trigger resize
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
            // One more Down
            fireEvent.keyDown(splitter, { key: 'ArrowDown' });
            expect(onResize.mock.calls[4][0]).toEqual(10);
            // Another unacceptable dummy keys
            fireEvent.keyDown(splitter, { key: '4' });
            fireEvent.keyDown(splitter, { key: '8' });
            fireEvent.keyDown(splitter, { key: '1' });
            fireEvent.keyDown(splitter, { key: '5' });
            fireEvent.keyDown(splitter, { key: 'Enter' });
            // Total calls
            expect(onResizeEnd).toHaveBeenCalledTimes(5);
            // Toggle should not be called
            expect(onToggle).toHaveBeenCalledTimes(0);
        });

        it('Test spliter toggle using keyboard', () => {
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            const onToggle = jest.fn();
            onResize.mockReturnValue(true);
            const { container } = render(
                <UISplitter
                    type={UISplitterType.Toggle}
                    onResize={onResize}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    onToggle={onToggle}
                />
            );
            const splitter = container.querySelector('.splitter') as HTMLElement;
            // Some unacceptable variants for toggle
            fireEvent.keyDown(splitter, { key: 'w' });
            fireEvent.keyDown(splitter, { key: 'a' });
            fireEvent.keyDown(splitter, { key: 'S' });
            fireEvent.keyDown(splitter, { key: 'D' });
            fireEvent.keyDown(splitter, { key: 'ArrowUp' });
            fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
            fireEvent.keyDown(splitter, { key: 'ArrowRight' });
            fireEvent.keyDown(splitter, { key: 'ArrowDown' });
            fireEvent.keyDown(splitter, { key: '4' });
            // Expect no resize
            expect(onResizeStart).toHaveBeenCalledTimes(0);
            expect(onResize).toHaveBeenCalledTimes(0);
            expect(onResizeEnd).toHaveBeenCalledTimes(0);
            expect(onToggle).toHaveBeenCalledTimes(0);
            // Trigger toggle
            fireEvent.keyDown(splitter, { key: 'Enter' });
            expect(onToggle).toHaveBeenCalledTimes(1);
        });

        it('Test spliter toggle - aria', () => {
            const { container, rerender } = render(<UISplitter type={UISplitterType.Toggle} onResize={onResize} />);
            const splitter = container.querySelector('.splitter--toggle') as HTMLElement;
            expect(splitter.getAttribute('role')).toEqual('button');
            expect(splitter.getAttribute('aria-pressed')).toEqual('true');
            rerender(<UISplitter type={UISplitterType.Toggle} onResize={onResize} hidden={true} />);
            const splitterUpdated = container.querySelector('.splitter--toggle') as HTMLElement;
            expect(splitterUpdated.getAttribute('aria-pressed')).toEqual('false');
        });
    });

    it('Test "splitterTabIndex" property', () => {
        const { container, rerender } = render(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        // default value
        const splitter = container.querySelector('.splitter--horizontal') as HTMLElement;
        expect(splitter.tabIndex).toEqual(0);
        rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} splitterTabIndex={-1} />);
        const splitterUpdated = container.querySelector('.splitter--horizontal') as HTMLElement;
        expect(splitterUpdated.tabIndex).toEqual(-1);
    });

    it('Test "hidden" property', () => {
        const { container, rerender } = render(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        expect(container.querySelectorAll('.splitter--hidden')).toHaveLength(0);
        rerender(<UISplitter type={UISplitterType.Resize} onResize={onResize} hidden={true} />);
        expect(container.querySelectorAll('.splitter--hidden')).toHaveLength(1);
    });

    describe('Splitter icon', () => {
        const testCases: Array<{
            type: UISplitterType;
            vertical: boolean;
            splitterLayoutType: UISplitterLayoutType;
            expect: {
                standard?: boolean;
                compact?: boolean;
                horizontal?: boolean;
                vertical?: boolean;
                icon?: UiIcons;
            };
        }> = [
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
                    icon: undefined
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: true,
                splitterLayoutType: UISplitterLayoutType.Standard,
                expect: {
                    standard: true,
                    vertical: true,
                    icon: undefined
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: false,
                splitterLayoutType: UISplitterLayoutType.Compact,
                expect: {
                    compact: true,
                    horizontal: true,
                    icon: undefined
                }
            },
            {
                type: UISplitterType.Resize,
                vertical: true,
                splitterLayoutType: UISplitterLayoutType.Compact,
                expect: {
                    compact: true,
                    vertical: true,
                    icon: undefined
                }
            }
        ];

        for (const testCase of testCases) {
            it(`Splitter types - vertical=${testCase.vertical} splitterLayoutType=${testCase.splitterLayoutType} type=${testCase.type} `, () => {
                const props: UISplitterProps = {
                    type: testCase.type,
                    vertical: testCase.vertical,
                    splitterLayoutType: testCase.splitterLayoutType,
                    onResize
                };
                const { container } = render(<UISplitter {...props} />);
                expect(container.querySelectorAll('.splitter--hidden')).toHaveLength(0);
                expect(container.querySelectorAll('.splitter--standard')).toHaveLength(
                    testCase.expect.standard ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter--compact')).toHaveLength(testCase.expect.compact ? 1 : 0);
                expect(container.querySelectorAll('.splitter--vertical')).toHaveLength(
                    testCase.expect.vertical ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter--horizontal')).toHaveLength(
                    testCase.expect.horizontal ? 1 : 0
                );
                expect(container.querySelectorAll('.splitter__grip')).toHaveLength(1);
                const icons = container.querySelectorAll(`i[data-icon-name]`);
                expect(icons.length).toEqual(testCase.expect.icon ? 1 : 0);
                if (testCase.expect.icon) {
                    expect(icons[0].getAttribute('data-icon-name')).toEqual(testCase.expect.icon);
                }
            });
        }
    });
});
