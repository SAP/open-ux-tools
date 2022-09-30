import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UISplitterProps } from '../../../src/components/UISection/UISplitter';
import { UISplitter, UISplitterType, UISplitterLayoutType } from '../../../src/components/UISection/UISplitter';
import { initIcons, UiIcons } from '../../../src/components/Icons';

initIcons();

describe('<Splitter />', () => {
    let wrapper: Enzyme.ReactWrapper<UISplitterProps>;
    const onResize = jest.fn();

    beforeEach(() => {
        wrapper = Enzyme.mount(<UISplitter type={UISplitterType.Resize} onResize={onResize} />);
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(1);
            return 1;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    const simulateMouseEvent = (type: string, x = 0, y = 0): void => {
        const event: MouseEvent = document.createEvent('MouseEvents');
        event.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
        document.body.dispatchEvent(event);
    };

    it('Should render a PropertiesPanel component', () => {
        expect(wrapper.exists()).toEqual(true);
        expect(wrapper.find('.splitter').length).toEqual(1);
        expect(wrapper.find('.splitter--horizontal').length).toEqual(1);
        expect(wrapper.find('.splitter--vertical').length).toEqual(0);
    });

    it('Should render as vertical splitter', () => {
        wrapper.setProps({
            vertical: true
        });
        expect(wrapper.find('.splitter--horizontal').length).toEqual(0);
        expect(wrapper.find('.splitter--vertical').length).toEqual(1);
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
            const resizeWrapper = Enzyme.mount(
                <UISplitter
                    type={UISplitterType.Resize}
                    onResizeStart={onResizeStart}
                    onResize={onResize}
                    onResizeEnd={onResizeEnd}
                    vertical={orientation}
                />
            );
            resizeWrapper
                .find('.splitter')
                .simulate('mousedown', { clientX: mouseStartCoordinate, button: 0, clientY: mouseStartCoordinate });
            simulateMouseEvent('mousemove', mouseMoveCoordinate1, mouseMoveCoordinate1);
            simulateMouseEvent('mousemove', mouseMoveCoordinate2, mouseMoveCoordinate2);
            simulateMouseEvent('mouseup', mouseMoveCoordinate2, mouseMoveCoordinate2);
            // Another 'simulateMouseEvent' with 'mousemove' to detect is removeEventListener called
            simulateMouseEvent('mousemove', 300, 300);
            expect(onResizeStart).toBeCalledTimes(1);
            expect(onResize).toBeCalledTimes(2);
            expect(onResize.mock.calls[0][0]).toEqual(mouseMoveCoordinate1 - mouseStartCoordinate);
            expect(onResize.mock.calls[1][0]).toEqual(mouseMoveCoordinate2 - mouseStartCoordinate);
            expect(onResizeEnd).toBeCalledTimes(1);
        });
    }

    describe('Keyboard resize and toggle', () => {
        it('Test spliter resize using keyboard', () => {
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            const onToggle = jest.fn();
            onResize.mockReturnValue(true);
            wrapper.setProps({
                onResizeStart,
                onResizeEnd,
                onToggle
            });
            // Pass some dummy keys, which should not trigger resize
            wrapper.simulate('keyDown', { key: 'w' });
            wrapper.simulate('keyDown', { key: 'a' });
            wrapper.simulate('keyDown', { key: 'S' });
            wrapper.simulate('keyDown', { key: 'D' });
            // Resize Left
            wrapper.simulate('keyDown', { key: 'ArrowLeft' });
            expect(onResizeStart).toBeCalledTimes(1);
            expect(onResize).toBeCalledTimes(1);
            expect(onResize.mock.calls[0][0]).toEqual(-10);
            expect(onResizeEnd).toBeCalledTimes(1);
            // Resize Top - should be same as Left
            wrapper.simulate('keyDown', { key: 'ArrowUp' });
            expect(onResize.mock.calls[1][0]).toEqual(-10);
            // One more Left
            wrapper.simulate('keyDown', { key: 'ArrowLeft' });
            expect(onResize.mock.calls[2][0]).toEqual(-10);
            // Go Right
            wrapper.simulate('keyDown', { key: 'ArrowRight' });
            expect(onResize.mock.calls[3][0]).toEqual(10);
            // One more Left
            wrapper.simulate('keyDown', { key: 'ArrowDown' });
            expect(onResize.mock.calls[4][0]).toEqual(10);
            // Another unaccaptable dummy keys
            wrapper.simulate('keyDown', { key: '4' });
            wrapper.simulate('keyDown', { key: '8' });
            wrapper.simulate('keyDown', { key: '1' });
            wrapper.simulate('keyDown', { key: '5' });
            wrapper.simulate('keyDown', { key: 'Enter' });
            // Total call;
            expect(onResizeEnd).toBeCalledTimes(5);
            // Toggle should not be called
            expect(onToggle).toBeCalledTimes(0);
        });

        it('Test spliter toggle using keyboard', () => {
            const onResizeStart = jest.fn();
            const onResizeEnd = jest.fn();
            const onToggle = jest.fn();
            onResize.mockReturnValue(true);
            wrapper.setProps({
                onResizeStart,
                onResizeEnd,
                onToggle,
                type: UISplitterType.Toggle
            });
            // Some unacceptable variants for toggle
            wrapper.simulate('keyDown', { key: 'w' });
            wrapper.simulate('keyDown', { key: 'a' });
            wrapper.simulate('keyDown', { key: 'S' });
            wrapper.simulate('keyDown', { key: 'D' });
            wrapper.simulate('keyDown', { key: 'ArrowUp' });
            wrapper.simulate('keyDown', { key: 'ArrowLeft' });
            wrapper.simulate('keyDown', { key: 'ArrowRight' });
            wrapper.simulate('keyDown', { key: 'ArrowDown' });
            wrapper.simulate('keyDown', { key: '4' });
            // Expect resize
            expect(onResizeStart).toBeCalledTimes(0);
            expect(onResize).toBeCalledTimes(0);
            expect(onResizeEnd).toBeCalledTimes(0);
            expect(onToggle).toBeCalledTimes(0);
            // Trigger toggle
            wrapper.simulate('keyDown', { key: 'Enter' });
            expect(onToggle).toBeCalledTimes(1);
        });

        it('Test spliter toggle - aria', () => {
            wrapper.setProps({
                type: UISplitterType.Toggle
            });
            expect(wrapper.find('.splitter--toggle').prop('role')).toEqual('button');
            expect(wrapper.find('.splitter--toggle').prop('aria-pressed')).toEqual(true);
            wrapper.setProps({
                hidden: true
            });
            expect(wrapper.find('.splitter--toggle').prop('aria-pressed')).toEqual(false);
        });
    });

    it('Test "hidden" property', () => {
        expect(wrapper.find('.splitter--hidden').length).toEqual(0);
        wrapper.setProps({
            hidden: true
        });
        expect(wrapper.find('.splitter--hidden').length).toEqual(1);
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
                expect(wrapper.find('.splitter--hidden').length).toEqual(0);
                wrapper.setProps({
                    vertical: testCase.vertical,
                    splitterLayoutType: testCase.splitterLayoutType,
                    type: testCase.type
                });
                expect(wrapper.find('.splitter--standard').length).toEqual(testCase.expect.standard ? 1 : 0);
                expect(wrapper.find('.splitter--compact').length).toEqual(testCase.expect.compact ? 1 : 0);
                expect(wrapper.find('.splitter--vertical').length).toEqual(testCase.expect.vertical ? 1 : 0);
                expect(wrapper.find('.splitter--horizontal').length).toEqual(testCase.expect.horizontal ? 1 : 0);

                const icon = wrapper.find('UIIcon');
                expect(wrapper.find('.splitter__grip').length).toEqual(1);
                expect(icon.prop('iconName')).toEqual(testCase.expect.icon);
            });
        }
    });
});
