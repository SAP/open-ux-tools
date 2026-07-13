import * as React from 'react';
import { render } from '@testing-library/react';
import { UISections } from '../../../src/components/UISection/UISections';
import { UISectionLayout } from '../../../src/components/UISection/UISection';
import { UISplitterLayoutType, UISplitterType } from '../../../src/components/UISection/UISplitter';
import type { UISectionsProps } from '../../../src/components/UISection/UISections';
import { mockResizeObserver, mockDomEventListener } from '../../utils/utils';
import { initIcons } from '../../../src/components/Icons';

initIcons();
mockResizeObserver();

describe('<Sections />', () => {
    let container: HTMLElement;
    let unmount: () => void;
    let rerender: (ui: React.ReactElement) => void;
    let sectionsRef: React.RefObject<UISections>;
    let windowEventListenerMock = mockDomEventListener(window);

    const simulateMouseEvent = (type: string, x = 0, y = 0): void => {
        const event: MouseEvent = document.createEvent('MouseEvents');
        event.initMouseEvent(type, true, true, window, 0, 0, 0, x, y, false, false, false, false, 0, null);
        document.body.dispatchEvent(event);
    };

    const simulateSplitterResize = (cont: HTMLElement, start: number, end: number, splitterIndex = 0): void => {
        const splitters = cont.querySelectorAll('.splitter');
        const splitter = splitters[splitterIndex] as HTMLElement;
        const mousedownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            clientX: start,
            clientY: start,
            button: 0
        });
        splitter.dispatchEvent(mousedownEvent);
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
        sectionsRef = React.createRef<UISections>();
        const result = render(
            <UISections ref={sectionsRef} vertical={false}>
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
        container = result.container;
        unmount = result.unmount;
        rerender = result.rerender;

        windowEventListenerMock.cleanDomEventListeners();
        windowEventListenerMock = mockDomEventListener(window);
    });

    afterEach(() => {
        jest.clearAllMocks();
        unmount();
    });

    it('Should render a Shell component', () => {
        expect(container.querySelector('.sections')).toBeTruthy();
        expect(container.querySelectorAll('.sections')).toHaveLength(1);
        expect(container.querySelectorAll('.section')).toHaveLength(2);
        expect(container.querySelectorAll('.sections--vertical')).toHaveLength(0);
        expect(container.querySelectorAll('.sections--horizontal')).toHaveLength(1);
        expect(container.querySelectorAll('.sections--animated')).toHaveLength(0);
        expect(container.querySelectorAll('.sections--full')).toHaveLength(0);
    });

    it('Test "vertical" property', () => {
        rerender(
            <UISections ref={sectionsRef} vertical={true}>
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
        expect(container.querySelectorAll('.sections--vertical')).toHaveLength(1);
        expect(container.querySelectorAll('.sections--horizontal')).toHaveLength(0);
    });

    it('Test "animation" property', () => {
        rerender(
            <UISections ref={sectionsRef} vertical={false} animation={true}>
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
        expect(container.querySelectorAll('.sections--animated')).toHaveLength(1);
    });

    it('Test "height" property', () => {
        const height = '500px';
        rerender(
            <UISections ref={sectionsRef} vertical={false} height={height}>
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
        const dom = container.querySelector('.sections') as HTMLElement;
        expect(dom.style.height).toEqual(height);
    });

    describe('Test "splitterLayoutType" property', () => {
        const testCases = [
            {
                name: 'Default value',
                splitterLayoutType: undefined,
                isCompact: true
            },
            {
                name: 'splitterLayoutType = Compact',
                splitterLayoutType: UISplitterLayoutType.Compact,
                isCompact: true
            },
            {
                name: 'splitterLayoutType = Standard',
                splitterLayoutType: UISplitterLayoutType.Standard,
                isCompact: false
            }
        ];
        test.each(testCases)('$name', ({ splitterLayoutType, isCompact }) => {
            rerender(
                <UISections ref={sectionsRef} vertical={false} splitter={true} splitterLayoutType={splitterLayoutType}>
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
            expect(container.querySelectorAll('.splitter--compact')).toHaveLength(isCompact ? 1 : 0);
            expect(container.querySelectorAll('.splitter--standard')).toHaveLength(isCompact ? 0 : 1);
        });
    });

    it('Test "hidden" section', () => {
        const { container: hiddenContainer, unmount: hiddenUnmount } = render(
            <UISections vertical={false} splitter={true} minSectionSize={6}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section hidden={true}>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        expect(hiddenContainer.querySelectorAll('.sections__item--hidden')).toHaveLength(1);
        expect(hiddenContainer.querySelectorAll('.sections--full')).toHaveLength(1);
        hiddenUnmount();
    });

    // There would need additional tests, but it would take some time to mock DOM values for multiple cases
    describe('Test splitter', () => {
        beforeEach(() => {
            rerender(
                <UISections ref={sectionsRef} vertical={false} splitter={true}>
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
            expect(container.querySelectorAll('.splitter')).toHaveLength(1);
        });

        it('Test "splitter" resize', () => {
            simulateSplitterResize(container, 100, 50);
            const section = container.querySelector('.sections__item') as HTMLElement;
            expect(section.style.left).toEqual('0px');
            expect(section.style.right).toEqual('1050px');
        });

        it('Test "splitter" resize', () => {
            const verticalRef = React.createRef<UISections>();
            const { container: verticalContainer, unmount: verticalUnmount } = render(
                <UISections ref={verticalRef} vertical={true} splitter={true}>
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
            simulateSplitterResize(verticalContainer, 100, 50);
            const section = verticalContainer.querySelector('.sections__item') as HTMLElement;
            expect(section.style.top).toEqual('0px');
            expect(section.style.bottom).toEqual('1050px');
            verticalUnmount();
        });

        describe('Test 3 columns splitter resize', () => {
            let threeColContainer: HTMLElement;
            let threeColUnmount: () => void;
            let threeColRerender: (ui: React.ReactElement) => void;
            let threeColRef: React.RefObject<UISections>;

            const buildThreeColJsx = (visible = [true, true, true], extraProps: Partial<UISectionsProps> = {}) => (
                <UISections
                    ref={threeColRef}
                    vertical={false}
                    splitterType={UISplitterType.Resize}
                    splitter={true}
                    sizes={[1000, 1000, 1000]}
                    minSectionSize={[200, 100, 300]}
                    {...extraProps}>
                    <UISections.Section
                        className="dummy-left-section"
                        title="Left Title"
                        height="100%"
                        hidden={!visible[0]}>
                        <div>Left</div>
                    </UISections.Section>
                    <UISections.Section
                        className="dummy-middle-section"
                        title="Middle Title"
                        height="100%"
                        hidden={!visible[1]}>
                        <div>Middle</div>
                    </UISections.Section>
                    <UISections.Section
                        className="dummy-right-section"
                        title="Right Title"
                        height="100%"
                        hidden={!visible[2]}>
                        <div>Right</div>
                    </UISections.Section>
                </UISections>
            );

            beforeEach(() => {
                mockClientWidth(1000, { sections: 3000 });
                threeColRef = React.createRef<UISections>();
                const result = render(buildThreeColJsx());
                threeColContainer = result.container;
                threeColUnmount = result.unmount;
                threeColRerender = result.rerender;

                windowEventListenerMock.cleanDomEventListeners();
                windowEventListenerMock = mockDomEventListener(window);
            });

            afterEach(() => {
                threeColUnmount();
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
                },
                {
                    name: 'Try move last section onleft when middle section is minimal size',
                    sizes: {
                        sizes: [1000, 1000, 1000],
                        minSectionSize: [200, 1000, 1000]
                    },
                    move: {
                        index: 1,
                        start: 2000,
                        end: 100
                    },
                    result: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        },
                        middle: {
                            left: '',
                            right: ''
                        }
                    }
                }
            ];
            test.each(testCases)('$name', ({ move, result, sizes }) => {
                if (sizes) {
                    threeColRerender(
                        buildThreeColJsx([true, true, true], {
                            sizes: [1000, 1000, 1000] as Array<number | undefined>,
                            minSectionSize: [200, 1000, 1000]
                        })
                    );
                }
                simulateSplitterResize(threeColContainer, move.start, move.end, move.index);
                const items = threeColContainer.querySelectorAll('.sections__item');
                const firstSection = items[0] as HTMLElement;
                const middleSection = items[1] as HTMLElement;
                const lastSection = items[items.length - 1] as HTMLElement;
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

            const getSizes = () => {
                const items = threeColContainer.querySelectorAll('.sections__item');
                const firstSection = items[0] as HTMLElement;
                const middleSection = items[1] as HTMLElement;
                const lastSection = items[items.length - 1] as HTMLElement;
                return {
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
                };
            };

            const resetTestCases = [
                {
                    name: 'Reset - different size',
                    resetSizes: [500, 1000, 1000],
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        },
                        middle: {
                            left: '1000px',
                            right: '1000px'
                        }
                    }
                },
                {
                    name: 'No reset - sizes are same',
                    resetSizes: [1000, 1000, 1000],
                    expectedResult: {
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
                    name: 'Reset - different length',
                    resetSizes: [1000, 1000, 1000, 1000],
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        middle: {
                            left: '',
                            right: '1000px'
                        },
                        last: {
                            left: '',
                            right: '0px'
                        }
                    }
                }
            ];

            test.each(resetTestCases)('Handle update of external sizes. $name', ({ resetSizes, expectedResult }) => {
                const move = {
                    index: 0,
                    start: 100,
                    end: 50
                };
                threeColRerender(
                    buildThreeColJsx([true, true, true], {
                        sizes: [1000, 1000, 1000] as Array<number | undefined>,
                        minSectionSize: [200, 1000, 1000]
                    })
                );
                simulateSplitterResize(threeColContainer, move.start, move.end, move.index);
                expect(getSizes()).toEqual({
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
                });

                // Reset sizes
                threeColRerender(
                    buildThreeColJsx([true, true, true], {
                        sizes: resetSizes as Array<number | undefined>,
                        minSectionSize: [200, 1000, 1000]
                    })
                );
                expect(getSizes()).toEqual(expectedResult);
            });

            const hiddenTestCases = [
                {
                    name: 'First section is hidden',
                    visibility: [false, true, true],
                    expectedResult: {
                        first: {
                            left: '-1000px',
                            right: '100%'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        },
                        middle: {
                            left: '0px',
                            right: '1000px'
                        }
                    }
                },
                {
                    name: 'Second section is hidden',
                    visibility: [true, false, true],
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '1000px'
                        },
                        last: {
                            left: '1000px',
                            right: '0px'
                        },
                        middle: {
                            left: '100%',
                            right: '-1000px'
                        }
                    }
                },
                {
                    name: 'Third section is hidden',
                    visibility: [true, true, false],
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        last: {
                            left: '100%',
                            right: '-1000px'
                        },
                        middle: {
                            left: '1000px',
                            right: '0px'
                        }
                    }
                },
                {
                    name: 'Move between first and second, then hide first section',
                    visibility: [false, true, true],
                    move: {
                        index: 0,
                        start: 100,
                        end: 50
                    },
                    expectedResult: {
                        first: {
                            left: '-950px',
                            right: '2050px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        },
                        middle: {
                            left: '950px',
                            right: '1000px'
                        }
                    }
                },
                {
                    name: 'Move between first and second, then hide third section',
                    visibility: [true, true, false],
                    move: {
                        index: 0,
                        start: 100,
                        end: 50
                    },
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '2050px'
                        },
                        last: {
                            left: '2000px',
                            right: '0px'
                        },
                        middle: {
                            left: '950px',
                            right: '1000px'
                        }
                    }
                },
                {
                    name: 'Move between second and third, then hide first section',
                    visibility: [false, true, true],
                    move: {
                        index: 1,
                        start: 100,
                        end: 150
                    },
                    expectedResult: {
                        first: {
                            left: '-1000px',
                            right: '100%'
                        },
                        last: {
                            left: '1050px',
                            right: '0px'
                        },
                        middle: {
                            left: '0px',
                            right: '1950px'
                        }
                    }
                },
                {
                    name: 'Move between second and third, then hide third section',
                    visibility: [true, true, false],
                    move: {
                        index: 1,
                        start: 100,
                        end: 150
                    },
                    expectedResult: {
                        first: {
                            left: '0px',
                            right: '2000px'
                        },
                        last: {
                            left: '2050px',
                            right: '-950px'
                        },
                        middle: {
                            left: '1000px',
                            right: '950px'
                        }
                    }
                }
            ];
            test.each(hiddenTestCases)('Handle hidden sections. $name', ({ visibility, expectedResult, move }) => {
                const { container: localContainer, unmount: localUnmount } = render(
                    buildThreeColJsx(visibility as [boolean, boolean, boolean])
                );
                if (move) {
                    simulateSplitterResize(localContainer, move.start, move.end, move.index);
                }
                const items = localContainer.querySelectorAll('.sections__item');
                const firstSection = items[0] as HTMLElement;
                const middleSection = items[1] as HTMLElement;
                const lastSection = items[items.length - 1] as HTMLElement;

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
                }).toEqual(expectedResult);
                localUnmount();
            });
        });
    });

    it('Test "minSectionSize"', () => {
        mockClientWidth(1000, { sections: 2000 });
        const localRef = React.createRef<UISections>();
        const { container: localContainer, unmount: localUnmount } = render(
            <UISections ref={localRef} vertical={false} splitter={true} minSectionSize={[200, 100]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(localContainer, 1000, 50);
        const firstSection = localContainer.querySelector('.sections__item') as HTMLElement;
        expect(firstSection.style.left).toEqual('0px');
        // 2000 - 200(min of first section) = 1800px
        expect(firstSection.style.right).toEqual('1800px');
        // Reverse move
        simulateSplitterResize(localContainer, 1000, 3000);
        const items = localContainer.querySelectorAll('.sections__item');
        const lastSection = items[items.length - 1] as HTMLElement;
        // 2000 - 100(min of second section) = 1900px
        expect(lastSection.style.left).toEqual('1900px');
        expect(lastSection.style.right).toEqual('0px');
        expect(lastSection.style.width).toEqual('');
        localUnmount();
    });

    it('Test "minSectionSize" - avoid resize when no place', () => {
        mockClientWidth(1000);
        const localRef = React.createRef<UISections>();
        const { container: localContainer, unmount: localUnmount } = render(
            <UISections ref={localRef} vertical={false} splitter={true} minSectionSize={[800, 700]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(localContainer, 1000, 50);
        const firstSection = localContainer.querySelector('.sections__item') as HTMLElement;
        expect(firstSection.style.left).toEqual('0%');
        expect(firstSection.style.right).toEqual('50%');
        localUnmount();
    });

    it('Test property "onResize"', () => {
        const resizeFn = jest.fn();
        const localRef = React.createRef<UISections>();
        const { container: localContainer, unmount: localUnmount } = render(
            <UISections ref={localRef} vertical={false} splitter={true} minSectionSize={[800, 700]} onResize={resizeFn}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        simulateSplitterResize(localContainer, 1000, 50);
        expect(resizeFn).toHaveBeenCalledTimes(1);
        localUnmount();
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
        const localRef = React.createRef<UISections>();
        const { unmount: localUnmount } = render(
            <UISections
                ref={localRef}
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
        expect(onToggleFullscreen).toHaveBeenCalledTimes(0);
        expect(localRef.current!.state.sizes).toEqual([
            { end: 530, percentage: false, start: 0 },
            { end: 0, percentage: false, size: 530, start: undefined }
        ]);

        onToggleFullscreen.mockClear();
        mockWidth(800);
        windowEventListenerMock.simulateEvent('resize', {});
        expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
        expect(localRef.current!.state.sizes).toEqual([
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
        expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
        expect(localRef.current!.state.sizes).toEqual([
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
        localUnmount();
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
                const { container: localContainer, unmount: localUnmount } = render(
                    <UISections vertical={false} splitter={true} {...testCase.props}>
                        <UISections.Section>
                            <div>Left</div>
                        </UISections.Section>
                        <UISections.Section {...testCase.secondProps}>
                            <div>Right</div>
                        </UISections.Section>
                    </UISections>
                );
                const items = localContainer.querySelectorAll('.sections__item');
                const firstSection = items[0] as HTMLElement;
                const secondSection = items[items.length - 1] as HTMLElement;
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
                localUnmount();
            });
        }
    });

    it('Test data property', () => {
        const testValue = 'test value';
        const { container: localContainer, unmount: localUnmount } = render(
            <UISections data-test={testValue}>
                <UISections.Section>
                    <div />
                </UISections.Section>
                <UISections.Section>
                    <div />
                </UISections.Section>
            </UISections>
        );
        const el = localContainer.querySelector(`.sections[data-test="test value"]`) as HTMLElement;
        expect(el.getAttribute('data-test')).toEqual(testValue);
        localUnmount();
    });

    it('Resize with splitter and apply window resize', () => {
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            cb(1);
            return 1;
        });
        mockClientWidth(1000, { sections: 2000 });

        const localRef = React.createRef<UISections>();
        const { container: localContainer, unmount: localUnmount } = render(
            <UISections
                ref={localRef}
                vertical={false}
                splitter={true}
                sizes={[450, undefined]}
                minSectionSize={[200, 190]}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );

        simulateSplitterResize(localContainer, 2000, 100);
        // Simulate restore for min size
        mockClientWidth(650, { sections: 650 });
        windowEventListenerMock.simulateEvent('resize', {});
        expect(localRef.current!.state.sizes).toEqual([
            { end: 450, percentage: false, size: 200, start: 0 },
            { end: 0, percentage: false, size: 450, start: 200 }
        ]);
        simulateSplitterResize(localContainer, 0, 0);
        const section = localContainer.querySelector('.sections__item') as HTMLElement;
        expect(section.style.left).toEqual('0px');
        expect(section.style.right).toEqual('450px');
        expect(localRef.current!.state.sizes).toEqual([
            { end: 450, percentage: false, size: 200, start: 0 },
            { end: 0, percentage: false, size: 450, start: 200 }
        ]);
        localUnmount();
    });

    it('Test "hidden" section - restore visibility', () => {
        const hiddenRef = React.createRef<UISections>();
        const { rerender: hiddenRerender, unmount: hiddenUnmount } = render(
            <UISections ref={hiddenRef} vertical={false} splitter={true} minSectionSize={6}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section hidden={true}>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        jest.spyOn(UISections, 'getVisibleSections').mockReturnValueOnce([]);
        hiddenRerender(
            <UISections ref={hiddenRef} vertical={false} splitter={true} minSectionSize={100}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section hidden={true}>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        const { container: hiddenContainer } = render(
            <UISections ref={hiddenRef} vertical={false} splitter={true} minSectionSize={100}>
                <UISections.Section>
                    <div>Left</div>
                </UISections.Section>
                <UISections.Section hidden={true}>
                    <div>Right</div>
                </UISections.Section>
            </UISections>
        );
        expect(hiddenContainer.querySelectorAll('.sections__item')).toHaveLength(2);
        hiddenUnmount();
    });

    it('Test window resize and ToggleFullscreen', () => {
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

        const onToggleFullscreen = jest.fn().mockImplementation(() => {
            jest.spyOn(UISections, 'getVisibleSections').mockReturnValueOnce([0]);
        });
        mockWidth(1000);
        const localRef = React.createRef<UISections>();
        const { unmount: localUnmount } = render(
            <UISections
                ref={localRef}
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
        mockWidth(670);

        windowEventListenerMock.simulateEvent('resize', {});
        expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
        expect(localRef.current!.state.sizes).toEqual([
            { end: 220, percentage: false, size: 450, start: 0 },
            { end: 0, percentage: false, size: 220, start: 450 }
        ]);
        localUnmount();
    });
});
