import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { UICallout, initIcons, CalloutCollisionTransform, UIIconButton, UIDialog } from '../../../src/components';

export interface TextComponentProps {
    id: string;
}

interface TestCase {
    name: string;
    source: DOMRect;
    target: DOMRect;
    container: DOMRect;
    callout: DOMRect;
    boundHeight: number;
    noActions?: boolean;
    result: {
        containerStyles?: {
            transform: string;
            position: string;
            top: string;
            left: string;
        };
        placeholder?: string;
    };
}

describe('CalloutCollisionTransform', () => {
    initIcons();

    let resetTransformationSpy: jest.SpyInstance;
    let preventDismissOnEventSpy: jest.SpyInstance;

    beforeEach(() => {
        resetTransformationSpy = jest.spyOn(CalloutCollisionTransform.prototype, 'resetTransformation');
        preventDismissOnEventSpy = jest.spyOn(CalloutCollisionTransform.prototype, 'preventDismissOnEvent');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const bbox: DOMRect = {
        height: 0,
        width: 0,
        x: 0,
        y: 0,
        bottom: 0,
        left: 0,
        top: 0,
        right: 0,
        toJSON: jest.fn
    };

    const classNames = {
        container: 'ms-Dialog-main',
        target: 'ms-Dialog-actions',
        source: 'TestSource',
        callout: 'ms-Callout-main',
        placeholder: 'ts-Callout-transformation'
    };

    const TestComponent = (props: TextComponentProps) => {
        const domRef = React.useRef<HTMLDivElement>(null);
        const menuDomRef = React.useRef<HTMLDivElement>(null);
        const calloutCollisionTransform = React.useRef<CalloutCollisionTransform>(
            new CalloutCollisionTransform(domRef, menuDomRef)
        );
        const { id } = props;
        const [isOpen, setIsOpen] = React.useState(false);
        return (
            <>
                <div ref={domRef} className="TestSource">
                    <UIIconButton
                        id={id}
                        title={`Opener ${id}`}
                        onClick={() => {
                            setIsOpen(!isOpen);
                        }}
                    />
                </div>
                {isOpen && (
                    <UICallout
                        target={`#${id}`}
                        onDismiss={() => {
                            setIsOpen(!isOpen);
                        }}
                        preventDismissOnEvent={calloutCollisionTransform.current.preventDismissOnEvent}
                        layerProps={{
                            onLayerDidMount: calloutCollisionTransform.current.applyTransformation,
                            onLayerWillUnmount: calloutCollisionTransform.current.resetTransformation
                        }}
                        popupProps={{
                            ref: menuDomRef
                        }}>
                        <div
                            style={{ height: 150, width: 300, backgroundColor: 'green' }}
                            title={`Callout content ${id}`}
                        />
                    </UICallout>
                )}
            </>
        );
    };

    const Dialog = (props: { hideButtons?: boolean }) => {
        return (
            <UIDialog
                isOpenAnimated={true}
                hidden={false}
                acceptButtonText={'Accept'}
                cancelButtonText={'Cancel'}
                onCancel={props.hideButtons ? undefined : jest.fn()}>
                <TestComponent id="test1" />
            </UIDialog>
        );
    };

    let bboxMaps: { [key: string]: DOMRect } = {};
    const addBBox = (className: string, value: DOMRect): void => {
        bboxMaps[className] = value;
    };
    const getBoundingClientRectOriginal = HTMLElement.prototype.getBoundingClientRect;
    function getBoundingClientRectMock(this: HTMLElement) {
        for (const className in bboxMaps) {
            if (this.classList.contains(className)) {
                return bboxMaps[className];
            }
        }
        return getBoundingClientRectOriginal.call(this);
    }
    const mockSizes = () => {
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(getBoundingClientRectMock);
    };

    const applyTransformationCase: TestCase = {
        name: 'Apply transformation with offset',
        source: { ...bbox, ...{ height: 20, top: 300, bottom: 320 } },
        target: { ...bbox, ...{ height: 50, top: 500, bottom: 550 } },
        container: { ...bbox, ...{ height: 450, top: 100, bottom: 0, left: 20 } },
        callout: { ...bbox, ...{ height: 400, top: 0, bottom: 0 } },
        boundHeight: 1000,
        result: {
            containerStyles: {
                transform: '',
                position: 'absolute',
                top: `100px`,
                left: `20px`
            },
            placeholder: '240px'
        }
    };
    const noTransformationCase: TestCase = {
        name: 'No need transformation - target is not overlapped',
        source: { ...bbox, ...{ height: 20, top: 110, bottom: 130 } },
        target: { ...bbox, ...{ height: 50, top: 500, bottom: 550 } },
        container: { ...bbox, ...{ height: 450, top: 100, bottom: 0, left: 20 } },
        callout: { ...bbox, ...{ height: 200, top: 0, bottom: 0 } },
        boundHeight: 750,
        result: {
            containerStyles: undefined,
            placeholder: undefined
        }
    };
    const testCases: TestCase[] = [
        applyTransformationCase,
        {
            name: 'Apply transformation without offset',
            source: { ...bbox, ...{ height: 20, top: 300, bottom: 320 } },
            target: { ...bbox, ...{ height: 50, top: 500, bottom: 550 } },
            container: { ...bbox, ...{ height: 450, top: 100, bottom: 0, left: 20 } },
            callout: { ...bbox, ...{ height: 400, top: 0, bottom: 0 } },
            boundHeight: 750,
            result: {
                containerStyles: {
                    transform: '',
                    position: 'absolute',
                    top: `100px`,
                    left: `20px`
                },
                placeholder: '220px'
            }
        },
        noTransformationCase,
        {
            name: 'Apply transformation without offset',
            source: { ...bbox, ...{ height: 20, top: 430, bottom: 480 } },
            target: { ...bbox, ...{ height: 50, top: 500, bottom: 550 } },
            container: { ...bbox, ...{ height: 450, top: 100, bottom: 0, left: 20 } },
            callout: { ...bbox, ...{ height: 400, top: 0, bottom: 0 } },
            boundHeight: 750,
            result: {
                containerStyles: undefined,
                placeholder: undefined
            }
        },
        {
            ...applyTransformationCase,
            name: 'No action buttons',
            noActions: true,
            result: {
                containerStyles: undefined,
                placeholder: undefined
            }
        }
    ];

    const simulateTransformationAtempt = async (testCase: TestCase): Promise<void> => {
        const { source, target, container, callout, boundHeight, noActions } = testCase;
        // Prepare sizes
        bboxMaps = {};
        addBBox(classNames.container, container);
        addBBox(classNames.target, target);
        addBBox(classNames.source, source);
        addBBox(classNames.callout, callout);
        window.innerHeight = boundHeight;
        mockSizes();
        // Render controls
        render(<Dialog hideButtons={noActions} />);
        const opener = screen.getByTitle('Opener test1');
        opener.click();
        // Async appeareance
        await new Promise((resolve) => setTimeout(resolve, 1));
    };

    for (const testCase of testCases) {
        it(`applyTransformation - ${testCase.name}`, async () => {
            const { result } = testCase;
            await simulateTransformationAtempt(testCase);
            const containerElement: HTMLElement | null = document.querySelector(`.${classNames.container}`);
            if (result.containerStyles) {
                const styles: { [key: string]: string | null } = {};
                for (const name in result.containerStyles) {
                    styles[name] = containerElement?.style[name];
                }
                expect(styles).toEqual(result.containerStyles);
            } else {
                expect(containerElement?.style['position']).toEqual('');
            }
            const targetElement: HTMLElement | null = document.querySelector(`.${classNames.placeholder}`);
            if (result.placeholder) {
                expect(targetElement?.style.height).toEqual(result.placeholder);
            }
        });
    }

    for (const testCase of [applyTransformationCase, noTransformationCase]) {
        it(`resetTransformation - ${testCase.name}`, async () => {
            await simulateTransformationAtempt(testCase);
            resetTransformationSpy.mockClear();
            document.body.click();
            // Async appeareance
            await new Promise((resolve) => setTimeout(resolve, 1));
            const containerElement: HTMLElement | null = document.querySelector(`.${classNames.container}`);
            expect(containerElement?.style['position']).toEqual('');
            expect(resetTransformationSpy).toHaveBeenCalledTimes(1);
            expect(preventDismissOnEventSpy).toHaveBeenCalledTimes(1);
        });
    }

    const preventDismissTestCases = [
        {
            name: 'Prevent on target action click',
            approach: () => {
                const submitBtn: HTMLElement | null = document.querySelector(`.${classNames.target} button`);
                submitBtn?.focus();
            },
            result: true
        },
        {
            name: 'Do not prevent',
            approach: () => {
                document.body.click();
            },
            result: false
        }
    ];
    for (const testCase of preventDismissTestCases) {
        it(`preventDismissOnEvent - ${testCase.name}`, async () => {
            await simulateTransformationAtempt(applyTransformationCase);
            resetTransformationSpy.mockClear();
            testCase.approach();
            // Async appeareance
            await new Promise((resolve) => setTimeout(resolve, 1));
            expect(preventDismissOnEventSpy.mock.results[0].value).toEqual(testCase.result);
        });
    }
});
