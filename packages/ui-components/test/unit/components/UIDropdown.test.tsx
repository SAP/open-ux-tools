import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { UIDropdownProps } from '../../../src/components/UIDropdown';
import { UIDropdown } from '../../../src/components/UIDropdown';
import type { IStyleFunction, ICalloutContentStyles, IDropdownStyleProps } from '@fluentui/react';
import { Dropdown, ResponsiveMode } from '@fluentui/react';
import { data as originalData } from '../../__mock__/select-data';
import { initIcons } from '../../../src/components/Icons';

const data = JSON.parse(JSON.stringify(originalData));

describe('<UIDropdown />', () => {
    let wrapper: Enzyme.ReactWrapper<UIDropdownProps>;
    initIcons();

    const openDropdown = (): void => {
        wrapper.find('.ms-Dropdown .ms-Dropdown-caretDownWrapper').simulate('click', document.createEvent('Events'));
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UIDropdown options={data} />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Test responsive mode - default value', () => {
        expect(wrapper.find(Dropdown).prop('responsiveMode')).toEqual(ResponsiveMode.xxxLarge);
        expect(wrapper.find('div.ts-SelectBox').prop('className')).toEqual('ms-Dropdown-container ts-SelectBox');
    });

    it('Styles - default', () => {
        const styles = (wrapper.find(Dropdown).props().styles as IStyleFunction<{}, {}>)({}) as IDropdownStyleProps;
        expect(styles).toMatchInlineSnapshot(
            {},
            `
            Object {
              "errorMessage": Array [
                Object {
                  "backgroundColor": "var(--vscode-inputValidation-errorBackground)",
                  "borderBottom": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderColor": "var(--vscode-inputValidation-errorBorder)",
                  "borderLeft": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "borderRight": "1px solid var(--vscode-inputValidation-errorBorder)",
                  "color": "var(--vscode-input-foreground)",
                  "margin": 0,
                  "paddingBottom": 5,
                  "paddingLeft": 8,
                  "paddingTop": 4,
                },
              ],
              "label": Object {
                "color": "var(--vscode-input-foreground)",
                "fontFamily": "var(--vscode-font-family)",
                "fontSize": "13px",
                "fontWeight": "bold",
                "padding": "4px 0",
              },
            }
        `
        );
    });

    it('Test responsive mode - custom value', () => {
        wrapper.setProps({
            responsiveMode: ResponsiveMode.small
        });
        expect(wrapper.find(Dropdown).prop('responsiveMode')).toEqual(ResponsiveMode.small);
    });

    it('Test css selectors which are used in scss - main', () => {
        expect(wrapper.find('div.ts-SelectBox').length).toEqual(1);
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown-title').length).toEqual(1);
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown-caretDownWrapper i svg').length).toEqual(1);
        openDropdown();
        expect(wrapper.find('.ts-Callout-Dropdown').length).toBeGreaterThan(0);
        expect(wrapper.find('.ts-Callout-Dropdown .ms-Callout-main').length).toBeGreaterThan(0);
        expect(wrapper.find('.ts-Callout-Dropdown .ms-Dropdown-items .ms-Button--command').length).toBeGreaterThan(0);
    });

    it('Test disabled selector', () => {
        wrapper.setProps({
            disabled: true
        });
        expect(wrapper.find('.ts-SelectBox .ms-Dropdown.is-disabled').length).toEqual(1);
    });

    it('Test className property', () => {
        wrapper.setProps({
            className: 'dummy'
        });
        expect(wrapper.find('div.ts-SelectBox').prop('className')).toEqual('ms-Dropdown-container ts-SelectBox dummy');
    });

    describe('Error message', () => {
        it('Error', () => {
            wrapper.setProps({
                errorMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(1);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Warning', () => {
            wrapper.setProps({
                warningMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(1);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(0);
        });

        it('Info', () => {
            wrapper.setProps({
                infoMessage: 'dummy'
            });
            expect(wrapper.find('div.ts-SelectBox--error').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--warning').length).toEqual(0);
            expect(wrapper.find('div.ts-SelectBox--info').length).toEqual(1);
        });
    });

    describe('Test "useDropdownAsMenuMinWidth" property', () => {
        const getCalloutStyles = (width: number): Partial<ICalloutContentStyles> | undefined => {
            const calloutProps = wrapper.find(Dropdown).prop('calloutProps');
            let calloutStyles;
            if (calloutProps.styles) {
                calloutStyles = (calloutProps.styles as IStyleFunction<{}, {}>)({
                    calloutWidth: width
                });
            }
            return calloutStyles;
        };

        it('Default', () => {
            wrapper.setProps({
                useDropdownAsMenuMinWidth: false
            });
            const styles = getCalloutStyles(100);
            expect(styles).toEqual(undefined);
        });

        it('False', () => {
            wrapper.setProps({
                useDropdownAsMenuMinWidth: false
            });
            const styles = getCalloutStyles(100);
            expect(styles).toEqual(undefined);
        });

        const widths = [100, 500, undefined];
        for (const width of widths) {
            it(`True - width ${width}`, () => {
                wrapper.setProps({
                    useDropdownAsMenuMinWidth: true
                });
                const styles = getCalloutStyles(width);
                expect(styles).toEqual({
                    root: {
                        maxWidth: 'calc(100% - 10px)',
                        minWidth: width,
                        width: 'auto'
                    }
                });
            });
        }
    });

    describe('Behavior of title/tooltip for options', () => {
        const buttonSelector = '.ts-Callout-Dropdown .ms-Button--command';
        it('Default - inherit from text', () => {
            wrapper.setProps({
                options: originalData
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual('Yemen');
        });

        it('Custom title', () => {
            const expectTitle = 'dummy';
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = expectTitle;
            wrapper.setProps({
                options: dataTemp
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual(expectTitle);
        });

        it('No title', () => {
            const dataTemp = JSON.parse(JSON.stringify(originalData));
            dataTemp[dataTemp.length - 1].title = null;
            wrapper.setProps({
                options: dataTemp
            });
            openDropdown();
            expect(wrapper.find(buttonSelector).last().getDOMNode().getAttribute('title')).toEqual(null);
        });
    });
});
