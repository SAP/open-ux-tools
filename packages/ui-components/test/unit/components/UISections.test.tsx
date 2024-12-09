import * as React from 'react';
import * as Enzyme from 'enzyme';
import { UISections } from '../../../src/components/UISection/UISections';
import { UISectionLayout } from '../../../src/components/UISection/UISection';
import { UISplitterType } from '../../../src/components/UISection/UISplitter';
import type { UISectionsProps, UISectionsState } from '../../../src/components/UISection/UISections';
import { mockResizeObserver, mockDomEventListener } from '../../utils/utils';
import { initIcons } from '../../../src/components/Icons';

initIcons();
mockResizeObserver();

describe('<Sections />', () => {
    let wrapper: Enzyme.ReactWrapper<UISectionsProps, UISectionsState>;
    let windowEventListenerMock = mockDomEventListener(window);

    const simulateMouseEvent = (type: string, x = 0, y = 0): void => {
        const event: MouseEvent = document.createEvent('MouseEvents');
        event.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
        document.body.dispatchEvent(event);
    };

    const simulateSplitterResize = (
        wrapper: Enzyme.ReactWrapper<UISectionsProps, UISectionsState>,
        start: number,
        end: number,
        splitterIndex = 0
    ): void => {
        const splitter = wrapper.find('.splitter').at(splitterIndex);
        splitter.simulate('mousedown', { clientX: start, button: 0, clientY: start });
        simulateMouseEvent('mousemove', end, end);
        simulateMouseEvent('mouseup', end, end);
    };

    const mockClientHeight = (size: number, sizesMap?: { [key: string]: number }) => {
        jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
            if (sizesMap) {
                for (const className in sizesMap) {
                    if (this.classList.contains(className)) {
                        return sizesMap[className];
                    }
                }
            }
            return size;
        });
    };

    const mockClientWidth = (size: number, sizesMap?: { [key: string]: number }) => {
        jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
            if (sizesMap) {
                for (const className in sizesMap) {
                    if (this.classList.contains(className)) {
                        return sizesMap[className];
                    }
                }
            }
            return size;
        });
        const rect = {
            top: 0,
            height: 1000,
            width: 1000,
            left: 0
        } as DOMRect;
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
            if (sizesMap) {
                for (const className in sizesMap) {
                    if (this.classList.contains(className)) {
                        return { ...rect, height: sizesMap[className], width: sizesMap[className] };
                    }
                }
            }
            return rect;
        });
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(
            <UISections vertical={false}>
                <UISections.Section
                    layout={UISectionLayout.Standard}
                    className="dummy-left-section"
                    title="Left Title"
                    height="100%">
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section
                    layout={UISectionLayout.Extended}
                    className="dummy-right-section"
                    title="Right Title"
                    height="100%">
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );

        windowEventListenerMock.cleanDomEventListeners();
        windowEventListenerMock = mockDomEventListener(window);
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Should render a Shell component', () => {
        expect(wrapper.exists()).toEqual(true);
        expect(wrapper.find('.sections').length).toEqual(1);
        expect(wrapper.find('.section').length).toEqual(2);
        expect(wrapper.find('.sections--vertical').length).toEqual(0);
        expect(wrapper.find('.sections--horizontal').length).toEqual(1);
        expect(wrapper.find('.sections--animated').length).toEqual(0);
        expect(wrapper.find('.sections--full').length).toEqual(0);
    });

    it('Test "vertical" property', () => {
        wrapper.setProps({
            vertical: true
        });
        expect(wrapper.find('.sections--vertical').length).toEqual(1);
        expect(wrapper.find('.sections--horizontal').length).toEqual(0);
    });

    it('Test "animation" property', () => {
        wrapper.setProps({
            animation: true
        });
        expect(wrapper.find('.sections--animated').length).toEqual(1);
    });

    it('Test "height" property', () => {
        const height = '500px';
        wrapper.setProps({
            height
        });
        const dom: HTMLElement = wrapper.getDOMNode();
        expect(dom.style.height).toEqual(height);
    });

    it('Test "hidden" section', () => {
        const hiddenWrapper = Enzyme.mount(
            <UISections vertical={false} splitter={true} minSectionSize={6}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section hidden={true}>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        expect(hiddenWrapper.find('.sections__item--hidden').length).toEqual(1);
        expect(hiddenWrapper.find('.sections--full').length).toEqual(1);
    });

    // There would need additional tests, but it would take some time to mock DOM values for multiple cases
    describe('Test splitter', () => {
        beforeEach(() => {
            wrapper.setProps({
                splitter: true
            });
            const rect = {
                top: 0,
                height: 1000,
                width: 1000,
                left: 0
            } as DOMRect;
            jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect);
            mockClientWidth(1000, { sections: 2000 });
            mockClientHeight(1000, { sections: 2000 });
            jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
                cb(1);
                return 1;
            });
        });

        it('Test "splitter" visibility', () => {
            expect(wrapper.find('.splitter').length).toEqual(1);
        });

        it('Test "splitter" resize', () => {
            simulateSplitterResize(wrapper, 100, 50);
            const section: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
            expect(section.style.left).toEqual('0px');
            expect(section.style.right).toEqual('1050px');
        });

        it('Test "splitter" resize', () => {
            const verticalWrapper = Enzyme.mount(
                <UISections vertical={true} splitter={true}>
                    <UISections.Section
                        layout={UISectionLayout.Standard}
                        className="dummy-left-section"
                        title="Left Title"
                        height="100%">
                        <div>Left</div>
                    </UISections.Section>
                    <UISections.Section
                        layout={UISectionLayout.Extended}
                        className="dummy-right-section"
                        title="Right Title"
                        height="100%">
                        <div>Right</div>
                    </UISections.Section>
                </UISections>
            );
            simulateSplitterResize(verticalWrapper, 100, 50);
            const section: HTMLElement = verticalWrapper.find('.sections__item').first().getDOMNode();
            expect(section.style.top).toEqual('0px');
            expect(section.style.bottom).toEqual('1050px');
        });

        describe('Test 3 columns splitter resize', () => {
            beforeEach(() => {
                mockClientWidth(1000, { sections: 3000 });
                wrapper = Enzyme.mount(
                    <UISections
                        vertical={false}
                        splitterType={UISplitterType.Resize}
                        splitter={true}
                        sizes={[1000, 1000, 1000]}
                        minSectionSize={[200, 100, 300]}>
                        <UISections.Section className="dummy-left-section" title="Left Title" height="100%">
                            <div>Left</div>
                        </UISections.Section>
                        <UISections.Section className="dummy-middle-section" title="Middle Title" height="100%">
                            <div>Middle</div>
                        </UISections.Section>
                        <UISections.Section className="dummy-right-section" title="Right Title" height="100%">
                            <div>Right</div>
                        </UISections.Section>
                    </UISections>
                );

                windowEventListenerMock.cleanDomEventListeners();
                windowEventListenerMock = mockDomEventListener(window);
            });

            const testCases = [
                {
                    name: 'Move first splitter left',
                    move: {
                        index: 0,
                        start: 100,
                        end: 50
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2050px'
                        },
                        middle: {
                            left: '950px',
                            right: '1000px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move first splitter right',
                    move: {
                        index: 0,
                        start: 100,
                        end: 150
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '1950px'
                        },
                        middle: {
                            left: '1050px',
                            right: '1000px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move second splitter left',
                    move: {
                        index: 1,
                        start: 100,
                        end: 50
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        middle: {
                            left: '1000px',
                            right: '1050px'
                        },
                        last: {
                            left: '1950px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move second splitter right',
                    move: {
                        index: 1,
                        start: 100,
                        end: 150
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        middle: {
                            left: '1000px',
                            right: '950px'
                        },
                        last: {
                            left: '2050px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move first splitter and trigger min size on left',
                    move: {
                        index: 0,
                        start: 2000,
                        end: 50
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2800px'
                        },
                        middle: {
                            left: '200px',
                            right: '1000px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move first splitter and trigger min size on right',
                    move: {
                        index: 0,
                        start: 0,
                        end: 3000
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '400px'
                        },
                        middle: {
                            left: '2600px',
                            right: '300px'
                        },
                        last: {
                            left: '2700px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move second splitter and trigger min size on left',
                    move: {
                        index: 1,
                        start: 2000,
                        end: 50
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        middle: {
                            left: '1000px',
                            right: '1900px'
                        },
                        last: {
                            left: '1100px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move second splitter and trigger min size on left',
                    move: {
                        index: 1,
                        start: 0,
                        end: 3000
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        middle: {
                            left: '1000px',
                            right: '300px'
                        },
                        last: {
                            left: '2700px',
                            right: '0px'
                        }
                    }
                }
            ];
            test.each(testCases)('$name', ({ move, result }) => {
                simulateSplitterResize(wrapper, move.start, move.end, move.index);
                const firstSection: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
                const middleSection: HTMLElement = wrapper.find('.sections__item').at(1).getDOMNode();
                const lastSection: HTMLElement = wrapper.find('.sections__item').last().getDOMNode();
                expect({
                    first: {
                        left: firstSection.style.left,
                        right: firstSection.style.right
                    },
                    middle: {
                        left: middleSection.style.left,
                        right: middleSection.style.right
                    },
                    last: {
                        left: lastSection.style.left,
                        right: lastSection.style.right
                    }
                }).toEqual(result);
            });
        });
    });

    it('Test "minSectionSize"', () => {
        mockClientWidth(1000, { sections: 2000 });
        wrapper = Enzyme.mount(
            <UISections vertical={false} splitter={true} minSectionSize={[200, 100]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(wrapper, 1000, 50);
        const firstSection: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
        expect(firstSection.style.left).toEqual('0px');
        // 2000 - 200(min of first section) = 1800px
        expect(firstSection.style.right).toEqual('1800px');
        // Reverse move
        simulateSplitterResize(wrapper, 1000, 3000);
        const lastSection: HTMLElement = wrapper.find('.sections__item').last().getDOMNode();
        // 2000 - 100(min of second section) = 1900px
        expect(lastSection.style.left).toEqual('1900px');
        expect(lastSection.style.right).toEqual('0px');
        expect(lastSection.style.width).toEqual('');
    });

    it('Test "minSectionSize" - avoid resize when no place', () => {
        mockClientWidth(1000);
        wrapper = Enzyme.mount(
            <UISections vertical={false} splitter={true} minSectionSize={[800, 700]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(wrapper, 1000, 50);
        const firstSection: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
        expect(firstSection.style.left).toEqual('0%');
        expect(firstSection.style.right).toEqual('50%');
    });

    it('Test property "onResize"', () => {
        const resizeFn = jest.fn();
        wrapper = Enzyme.mount(
            <UISections vertical={false} splitter={true} minSectionSize={[800, 700]} onResize={resizeFn}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(wrapper, 1000, 50);
        expect(resizeFn).toBeCalledTimes(1);
    });

    it('Test window resize', () => {
        const mockWidth = (windowWidth: number) => {
            jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => {
                return windowWidth;
            });
            jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => {
                return {
                    top: 0,
                    height: 1000,
                    width: windowWidth,
                    left: 0
                } as DOMRect;
            });
        };

        const onToggleFullscreen = jest.fn();
        mockWidth(1000);
        wrapper = Enzyme.mount(
            <UISections
                vertical={false}
                splitter={true}
                sizes={[450, undefined]}
                minSectionSize={[430, 530]}
                onToggleFullscreen={onToggleFullscreen}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );

        // Simulate restore for min size
        mockWidth(970);
        windowEventListenerMock.simulateEvent('resize', {});
        expect(onToggleFullscreen).toBeCalledTimes(0);
        expect(wrapper.state().sizes).toEqual([
            { end: 530, percentage: false, start: 0 },
            { end: 0, percentage: false, size: 530, start: undefined }
        ]);

        onToggleFullscreen.mockClear();
        mockWidth(800);
        windowEventListenerMock.simulateEvent('resize', {});
        expect(onToggleFullscreen).toBeCalledTimes(1);
        expect(wrapper.state().sizes).toEqual([
            {
                end: 360,
                percentage: false,
                size: 440,
                start: 0
            },
            {
                end: 0,
                percentage: false,
                size: 360,
                start: 440
            }
        ]);

        onToggleFullscreen.mockClear();
        mockWidth(1000);

        windowEventListenerMock.simulateEvent('resize', {});
        expect(onToggleFullscreen).toBeCalledTimes(1);
        expect(wrapper.state().sizes).toEqual([
            {
                end: 560,
                percentage: false,
                size: 440,
                start: 0
            },
            {
                end: 0,
                percentage: false,
                size: 560,
                start: 440
            }
        ]);
    });

    describe('Test property "sizes"', () => {
        beforeEach(() => {
            const rect = {
                top: 0,
                height: 1000,
                width: 1000,
                left: 0
            } as DOMRect;
            jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect);
        });

        const testCases = [
            {
                name: 'Numbers and splitterType=Toggle',
                props: {
                    splitterType: UISplitterType.Toggle,
                    sizes: [undefined, 350]
                },
                expectFirst: {
                    left: '0px',
                    right: '350px',
                    width: ''
                },
                expectSecond: {
                    left: '650px',
                    right: '0px',
                    width: ''
                }
            },
            {
                name: 'Percents and splitterType=Resize',
                props: {
                    splitterType: UISplitterType.Resize,
                    sizesAsPercents: true,
                    sizes: [60, 40]
                },
                expectFirst: {
                    left: '0%',
                    right: '40%',
                    width: ''
                },
                expectSecond: {
                    left: '60%',
                    right: '0%',
                    width: ''
                }
            },
            {
                name: 'Numbers and splitterType=Resize',
                props: {
                    splitterType: UISplitterType.Resize,
                    sizesAsPercents: false,
                    sizes: [undefined, 200]
                },
                expectFirst: {
                    left: '0px',
                    right: '200px',
                    width: ''
                },
                expectSecond: {
                    left: '800px',
                    right: '0px',
                    width: ''
                }
            },
            {
                name: 'Numbers - second hidden',
                props: {
                    splitterType: UISplitterType.Toggle,
                    sizes: [undefined, 350]
                },
                secondProps: {
                    hidden: true
                },
                expectFirst: {
                    left: '0%',
                    right: '0%',
                    width: ''
                },
                expectSecond: {
                    left: '100%',
                    right: '-350px',
                    width: ''
                }
            },
            {
                name: 'Percents - second hidden',
                props: {
                    splitterType: UISplitterType.Resize,
                    sizes: [undefined, 350]
                },
                secondProps: {
                    hidden: true
                },
                expectFirst: {
                    left: '0%',
                    right: '0%',
                    width: ''
                },
                expectSecond: {
                    left: '100%',
                    right: '-350px',
                    width: ''
                }
            }
        ];

        for (const testCase of testCases) {
            it(testCase.name, () => {
                const wrapper = Enzyme.mount(
                    <UISections vertical={false} splitter={true} {...testCase.props}>
                        <UISections.Section>
                            <div>Left</div>
                        </UISections.Section>
                        <UISections.Section {...testCase.secondProps}>
                            <div>Right</div>
                        </UISections.Section>
                    </UISections>
                );
                const firstSection: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
                const secondSection: HTMLElement = wrapper.find('.sections__item').last().getDOMNode();
                expect({
                    first: {
                        left: firstSection.style.left,
                        right: firstSection.style.right,
                        width: firstSection.style.width
                    },
                    second: {
                        left: secondSection.style.left,
                        right: secondSection.style.right,
                        width: secondSection.style.width
                    }
                }).toEqual({
                    first: testCase.expectFirst,
                    second: testCase.expectSecond
                });
                expect(secondSection.getAttribute('class')?.includes('sections__item--hidden')).toEqual(
                    !!testCase.secondProps?.hidden
                );
            });
        }
    });

    it('Test data property', () => {
        const testValue = 'test value';
        wrapper = Enzyme.mount(
            <UISections data-test={testValue}>
                <UISections.Section>
                    <div />
                </UISections.Section>
                <UISections.Section>
                    <div />
                </UISections.Section>
            </UISections>
        );
        expect(wrapper.find('.sections[data-test="test value"]').getDOMNode().getAttribute('data-test')).toEqual(
            testValue
        );
    });

    it('Resize with splitter and apply window resize', () => {
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            cb(1);
            return 1;
        });
        const mockWidth = (windowWidth: number) => {
            // ToDo - is 200 correct here?
            mockClientWidth(windowWidth, { sections: 2000 });
            jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => {
                return {
                    top: 0,
                    height: 1000,
                    width: windowWidth,
                    left: 0
                } as DOMRect;
            });
        };

        mockWidth(1000);

        wrapper = Enzyme.mount(
            <UISections vertical={false} splitter={true} sizes={[450, undefined]} minSectionSize={[200, 190]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );

        simulateSplitterResize(wrapper, 200, 100);
        // Simulate restore for min size
        mockWidth(650);
        windowEventListenerMock.simulateEvent('resize', {});
        expect(wrapper.state().sizes).toEqual([
            { end: 450, percentage: false, start: 0 },
            { end: 0, percentage: false, size: 450, start: undefined }
        ]);
        simulateSplitterResize(wrapper, 0, 0);
        const section: HTMLElement = wrapper.find('.sections__item').first().getDOMNode();
        expect(section.style.left).toEqual('0px');
        expect(section.style.right).toEqual('450px');
        expect(wrapper.state().sizes).toEqual([
            { end: 450, percentage: false, start: 0 },
            { end: 0, percentage: false, size: 450, start: undefined }
        ]);
    });
});
