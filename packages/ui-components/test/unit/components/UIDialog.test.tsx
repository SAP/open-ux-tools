import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { DialogProps, DialogState } from '../../../src/components/UIDialog';
import { UIDialog, UIDialogScrollArea, DIALOG_MAX_HEIGHT_OFFSET } from '../../../src/components/UIDialog';
import { UIDefaultButton } from '../../../src/components/UIButton';
import type { IDialogStyles, IDialogContentStyles, IDialogFooterStyles } from '@fluentui/react';
import { Dialog, DialogFooter, ContextualMenu } from '@fluentui/react';
import type { DOMEventListenerMock } from '../../utils/utils';
import { mockDomEventListener } from '../../utils/utils';

describe('<UIDialog />', () => {
    const windowHeight = 300;
    const onAcceptSpy = jest.fn();
    const onRejectSpy = jest.fn();
    let wrapper: Enzyme.ReactWrapper<DialogProps, DialogState>;
    let windowEventMock: DOMEventListenerMock;
    const changeSize = (property: 'innerHeight', value: number): void => {
        Object.defineProperty(window, property, { writable: true, configurable: true, value: value });
    };
    const dialogSelectors = {
        main: 'div.ms-Dialog-main',
        title: 'div.ms-Dialog-title'
    };

    beforeAll(() => {
        changeSize('innerHeight', windowHeight);
    });

    beforeEach(() => {
        windowEventMock = mockDomEventListener(window);
        wrapper = Enzyme.mount(
            <UIDialog
                acceptButtonText="Yes"
                cancelButtonText="No"
                onAccept={onAcceptSpy}
                onCancel={onRejectSpy}
                isOpen={true}>
                <div className="dummy"></div>
            </UIDialog>
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
        wrapper.unmount();
    });

    it('Should render dialog content', () => {
        expect(wrapper.find('.dummy').length).toEqual(1);
    });

    it('On Accept', () => {
        const buttons = wrapper.find(UIDefaultButton);
        expect(buttons.length).toEqual(2);
        buttons.first().simulate('click');
        expect(onAcceptSpy).toHaveBeenCalledTimes(1);
    });

    it('On Cancel', () => {
        const buttons = wrapper.find(UIDefaultButton);
        expect(buttons.length).toEqual(2);
        buttons.last().simulate('click');
        expect(onRejectSpy).toHaveBeenCalledTimes(1);
    });

    describe('Footer', () => {
        it('Accept and reject buttons', () => {
            const buttons = wrapper.find(UIDefaultButton);
            expect(wrapper.find(DialogFooter).length).toEqual(1);
            expect(buttons.length).toEqual(2);
        });

        it('Accept button', () => {
            wrapper.setProps({
                onCancel: undefined
            });
            const buttons = wrapper.find(UIDefaultButton);
            expect(wrapper.find(DialogFooter).length).toEqual(1);
            expect(buttons.length).toEqual(1);
        });

        it('Reject button', () => {
            wrapper.setProps({
                onAccept: undefined
            });
            const buttons = wrapper.find(UIDefaultButton);
            expect(wrapper.find(DialogFooter).length).toEqual(1);
            expect(buttons.length).toEqual(1);
        });

        it('Empty footer', () => {
            wrapper.setProps({
                onAccept: undefined,
                onCancel: undefined
            });
            const buttons = wrapper.find(UIDefaultButton);
            expect(wrapper.find(DialogFooter).length).toEqual(0);
            expect(buttons.length).toEqual(0);
        });

        it('Custom footer', () => {
            wrapper.setProps({
                footer: <div className="dummyFooter"></div>
            });
            expect(wrapper.find(DialogFooter).length).toEqual(1);
            expect(wrapper.find('.dummyFooter').length).toEqual(1);
        });

        it('Custom footer with multiple elements', () => {
            wrapper.setProps({
                footer: [
                    <UIDefaultButton key="accept" className="dummyButton" />,
                    <UIDefaultButton key="decline" className="dummyButton" />,
                    <UIDefaultButton key="cancel" className="dummyButton" />
                ]
            });
            expect(wrapper.find(DialogFooter).length).toEqual(1);
            expect(wrapper.find('UIDefaultButton.dummyButton').length).toEqual(3);
        });
    });

    describe('onResize', () => {
        it('Resize attachment and detachment', async () => {
            // Resize attached
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
            wrapper.setProps({
                isOpen: false
            });
            // Resize detached - test with close timeout
            await new Promise((resolve) => setTimeout(resolve, 500));
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(2);
        });

        it('No resize handling when scrollArea is Dialog', () => {
            // Resize attached
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
            // Set scrollArea to Dialog
            wrapper.setProps({
                scrollArea: UIDialogScrollArea.Dialog
            });
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(3);
            // Set scrollArea to Content
            wrapper.setProps({
                scrollArea: UIDialogScrollArea.Content
            });
            expect(windowEventMock.domEventListeners['resize'].length).toEqual(4);
        });

        it('Handle resize - check state', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            const expectSize = 1000;
            let state = wrapper.state();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

            // Simulate resize with new value
            changeSize('innerHeight', expectSize);
            windowEventMock.simulateEvent('resize', {});

            // Check new state
            state = wrapper.state();
            expect(state.resizeMaxHeight).toEqual(expectSize - offset);

            changeSize('innerHeight', windowHeight);
        });

        it('Handle resize when scrollArea is Dialog', () => {
            const offset = DIALOG_MAX_HEIGHT_OFFSET;
            // Set scrollArea to Dialog
            wrapper.setProps({
                scrollArea: UIDialogScrollArea.Dialog
            });
            let state = wrapper.state();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

            // Simulate resize with new value
            changeSize('innerHeight', 1000);
            windowEventMock.simulateEvent('resize', {});

            // Check new state - it should not be changed
            state = wrapper.state();
            expect(state.resizeMaxHeight).toEqual(windowHeight - offset);

            changeSize('innerHeight', windowHeight);
        });
    });

    describe('closeButtonVisible', () => {
        const testCases = [
            {
                value: true,
                expect: undefined
            },
            {
                value: false,
                expect: 'none'
            },
            {
                value: undefined,
                expect: 'none'
            }
        ];
        for (const testCase of testCases) {
            it(`Value - ${testCase.value}`, () => {
                wrapper.setProps({
                    isBlocking: true,
                    closeButtonVisible: testCase.value
                });
                const dialog = wrapper.find(Dialog);
                const props = dialog.props();

                // Dialog Content Styles
                const dialogContentStyles = props.dialogContentProps.styles as IDialogContentStyles;
                // Display undefined - visible by fluent ui styles
                expect(dialogContentStyles.button['display']).toEqual(testCase.expect);
            });
        }
    });

    describe('Styles', () => {
        it('Basic style', () => {
            const dialog = wrapper.find(Dialog);
            const props = dialog.props();
            expect(props.modalProps?.overlay?.styles).toEqual({
                root: {
                    background: 'var(--vscode-editor-background)',
                    opacity: 0.8
                }
            });
        });
        it('Title - single line', () => {
            const dialog = wrapper.find(Dialog);
            const props = dialog.props();
            const styles = props.dialogContentProps.titleProps.style;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-panelTitle-activeForeground)",
                  "overflow": "hidden",
                  "padding": "20px 45px 5px",
                  "textAlign": "center",
                  "textOverflow": "ellipsis",
                  "whiteSpace": "nowrap",
                }
            `
            );
        });

        it('Title - multi line', () => {
            wrapper.setProps({
                multiLineTitle: true
            });
            const dialog = wrapper.find(Dialog);
            const props = dialog.props();
            const styles = props.dialogContentProps.titleProps.style;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-panelTitle-activeForeground)",
                  "padding": "20px 0  5px",
                  "textAlign": "center",
                }
            `
            );
        });

        it('Footer', () => {
            const footer = wrapper.find(DialogFooter);
            const props = footer.props();
            const styles = props.styles as IDialogFooterStyles;
            expect(styles).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "action": Object {
                    "margin": "0px 5px",
                  },
                  "actions": Object {
                    "lineHeight": "auto",
                    "margin": "10px 0 20px",
                  },
                  "actionsRight": Object {
                    "justifyContent": "center",
                    "margin": "0px",
                    "textAlign": "center",
                    "width": "100%",
                  },
                }
            `
            );
        });

        it('ScrollArea - content', () => {
            const dialog = wrapper.find(Dialog);
            const props = dialog.props();
            const dialogStyles = props.styles as IDialogStyles;
            // Dialog styles
            expect(dialogStyles.main).toMatchInlineSnapshot(
                {},
                `
                Object {
                  ".ms-Modal-scrollableContent": Object {
                    "height": "100%",
                    "overflow": "hidden",
                  },
                  "backgroundColor": "var(--vscode-editorWidget-background)",
                  "border": "1px solid var(--vscode-editorWidget-border)",
                  "borderRadius": 4,
                  "boxShadow": "var(--ui-box-shadow-medium)",
                  "minHeight": 100,
                  "overflow": "hidden",
                }
            `
            );

            // Dialog Content Styles
            const dialogContentStyles = props.dialogContentProps.styles as IDialogContentStyles;
            expect(dialogContentStyles.header).toMatchInlineSnapshot(`undefined`);
            expect(dialogContentStyles.button).toMatchInlineSnapshot(`
                Object {
                  "display": "none",
                }
            `);
            expect(dialogContentStyles.inner).toMatchInlineSnapshot(`
                Object {
                  "display": "flex",
                  "flexDirection": "column",
                  "height": "100%",
                  "overflow": "hidden",
                  "padding": "0",
                }
            `);
            expect(dialogContentStyles.subText).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "lineHeight": 18,
                  "margin": "0",
                }
            `);
            expect(dialogContentStyles.content).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "display": "flex",
                  "flexDirection": "column",
                  "fontSize": 13,
                  "height": "100%",
                  "maxHeight": 268,
                }
            `);
            expect(dialogContentStyles.innerContent).toMatchInlineSnapshot(`
                Object {
                  "boxSizing": "border-box",
                  "height": "100%",
                  "overflow": "auto",
                  "padding": "10px 45px",
                }
            `);
        });

        it('Whole dialog scrollable', () => {
            wrapper.setProps({
                scrollArea: UIDialogScrollArea.Dialog
            });
            const dialog = wrapper.find(Dialog);
            const props = dialog.props();
            const dialogStyles = props.styles as IDialogStyles;
            // Dialog styles
            expect(dialogStyles.main).toMatchInlineSnapshot(`
                Object {
                  "backgroundColor": "var(--vscode-editorWidget-background)",
                  "border": "1px solid var(--vscode-editorWidget-border)",
                  "borderRadius": 4,
                  "boxShadow": "var(--ui-box-shadow-medium)",
                  "minHeight": 100,
                }
            `);

            // Dialog Content Styles
            const dialogContentStyles = props.dialogContentProps.styles as IDialogContentStyles;
            expect(dialogContentStyles.header).toMatchInlineSnapshot(`undefined`);
            expect(dialogContentStyles.button).toMatchInlineSnapshot(`
                Object {
                  "display": "none",
                }
            `);
            expect(dialogContentStyles.inner).toMatchInlineSnapshot(`
                Object {
                  "padding": "0",
                }
            `);
            expect(dialogContentStyles.subText).toMatchInlineSnapshot(`
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                  "lineHeight": 18,
                  "margin": "0",
                }
            `);
            expect(dialogContentStyles.content).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "color": "var(--vscode-foreground)",
                  "fontSize": 13,
                }
            `
            );
            expect(dialogContentStyles.innerContent).toMatchInlineSnapshot(
                {},
                `
                Object {
                  "boxSizing": "border-box",
                  "padding": "10px 45px",
                }
            `
            );
        });
    });

    describe('Draggable dialog - handle header mousedown', () => {
        const modalProps = {
            dragOptions: {
                moveMenuItemText: 'Move',
                closeMenuItemText: 'Close',
                menu: ContextualMenu,
                keepInBounds: true
            }
        };
        it('Draggable - focus focuszone placeholder', async () => {
            const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            wrapper.setProps({
                modalProps
            });
            expect(wrapper.find(dialogSelectors.main).length).toEqual(1);
            const titleElement = wrapper.find(dialogSelectors.title);
            expect(titleElement.length).toEqual(1);
            expect(focusSpy).toHaveBeenCalledTimes(0);
            titleElement.simulate('mousedown');
            expect(titleElement.length).toEqual(1);
            expect(focusSpy).toHaveBeenCalledTimes(1);
        });

        it('Undraggable', async () => {
            const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
            expect(wrapper.find(dialogSelectors.main).length).toEqual(1);
            const titleElement = wrapper.find(dialogSelectors.title);
            expect(titleElement.length).toEqual(1);
            expect(focusSpy).toHaveBeenCalledTimes(0);
            titleElement.simulate('mousedown');
            expect(titleElement.length).toEqual(1);
            expect(focusSpy).toHaveBeenCalledTimes(0);
        });
    });

    describe('Property "isOpenAnimated"', () => {
        const getRootStyles = (): React.CSSProperties => {
            const dialog = wrapper.find(Dialog);
            const dialogProps = dialog.props();
            return (dialogProps.styles as IDialogStyles).root as React.CSSProperties;
        };
        const testCases = [
            {
                value: true,
                expectOpacity: 0
            },
            {
                value: undefined,
                expectOpacity: 0
            },
            {
                value: false,
                expectOpacity: undefined
            }
        ];
        for (const testCase of testCases) {
            it(`Open with "isOpenAnimated=${testCase.value}"`, () => {
                wrapper = Enzyme.mount(
                    <UIDialog
                        acceptButtonText="Yes"
                        cancelButtonText="No"
                        onAccept={onAcceptSpy}
                        onCancel={onRejectSpy}
                        isOpen={false}
                        isOpenAnimated={testCase.value}>
                        <div className="dummy"></div>
                    </UIDialog>
                );
                let styles = getRootStyles();
                // Opacity before opened
                expect(styles.opacity).toEqual(testCase.expectOpacity);
                // Open dialog to simulate opacity update
                wrapper.setProps({
                    isOpen: true
                });
                wrapper.update();
                styles = getRootStyles();
                expect(styles.opacity).toEqual(undefined);
            });
        }
    });
});
