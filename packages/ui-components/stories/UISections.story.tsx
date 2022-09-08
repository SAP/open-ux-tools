import React, { useState } from 'react';
import type { UISectionsProps } from '../src/components/UISection';
import { UISections, UISplitterType, UISplitterLayoutType } from '../src/components/UISection';
import { UIToggle, UIToggleSize } from '../src/components/UIToggle';
import type { UIDropdownOption } from '../src/components/UIDropdown';
import { UIDropdown } from '../src/components/UIDropdown';
import { UIDefaultButton } from '../src/components/UIButton';

export default { title: 'Utilities/Splitter' };

const css = `
    .componentOptions {
        display: flex;
    }
    .componentOptions > div {
        min-width: 100px;
        margin-right: 10px;
    }
`;

const text = `Lorem ipsum dolor sit amet, modo iriure prompta eos in, eos ex meis ponderum, veniam cetero imperdiet ex mel. Munere recteque nam ut, ipsum aeterno est ex. Duo porro nulla ea, ut iudicabit scriptorem sed. Eos senserit imperdiet consequuntur in.
Zril corpora ad per, id pri alia duis erant, elitr signiferumque eu duo. Offendit sententiae no vel, eos ad augue tibique definitionem, per ad aliquid graecis molestiae. No vero singulis sensibus nec, viris congue omnium an cum, eum cu veri maiorum suscipiantur. Ne comprehensam concludaturque nec. Eripuit deterruisset ei cum, cum elit debet sapientem ei.
At mollis integre inciderint usu. Eu eam inani affert populo, modus idque salutandi no ius. Ad qui nostro voluptua gloriatur. Novum gloriatur persequeris eu vel, vim te nominavi abhorreant expetendis. His assum possit officiis ut, et est affert nominati aliquando, nam ne omnes doming graecis. Pri ex tota idque appareat, fugit oporteat urbanitas eu pro.
Unum maluisset signiferumque has et, at persius intellegebat qui. Zril dolorum dignissim no ius, duo nostrud conceptam voluptatibus ut. Eam no noster fabellas, in meis tamquam expetendis pri. Id mel veri torquatos. Ridens facilisi constituto mei an, eos cu iriure facilis intellegam, cu magna graeci denique sea.
Unum consectetuer et pro, at ignota evertitur mei. Wisi meis officiis sed ne, ea errem veritus dissentiunt quo. Eum et meis persequeris eloquentiam, mei et platonem complectitur. Vidisse legendos tincidunt id quo, id inermis facilis deleniti ius.`;

interface SectionsExampleProps {
    vertical: boolean;
}

const getOptions = (values: string[]): UIDropdownOption[] => {
    return values.map(
        (value): UIDropdownOption => ({
            key: value,
            text: value
        })
    );
};

function SectionsExample(props: SectionsExampleProps): JSX.Element {
    const [sectionsProps, setSectionsProps] = useState<Omit<UISectionsProps, 'children'>>({
        vertical: props.vertical,
        splitterType: UISplitterType.Resize,
        splitter: true,
        minSectionSize: [300, 300],
        animation: true,
        splitterLayoutType: UISplitterLayoutType.Standard,
        sizesAsPercents: false,
        sizes: [400, undefined]
    });
    const [leftSectionVisible, setLeftSectionVisible] = useState<boolean>(true);
    const [rightSectionVisible, setRightSectionVisible] = useState<boolean>(true);
    const propertyChange = (name: string, value?: unknown) => {
        setSectionsProps({
            ...sectionsProps,
            [name]: value
        });
    };
    const switchChange = (event: React.MouseEvent<HTMLElement, MouseEvent>, checked?: boolean) => {
        propertyChange(event.currentTarget.id, checked);
    };
    const animationChange = (index: number, checked?: boolean) => {
        let animation = sectionsProps.animation;
        if (animation === true && !checked) {
            animation = [true, true];
            animation[index] = false;
        } else if (!animation && checked) {
            animation = [false, false];
            animation[index] = true;
        } else {
            animation = checked;
        }
        propertyChange('animation', animation);
    };
    const dropdownChange = (
        id: string,
        event: React.FormEvent<HTMLDivElement>,
        option?: UIDropdownOption,
        index?: number
    ) => {
        propertyChange(id, option?.key);
    };
    return (
        <>
            <style>{css}</style>
            <div
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                <div className="componentOptions">
                    <UIToggle
                        id="splitter"
                        label="splitter"
                        checked={sectionsProps.splitter}
                        inlineLabel
                        inlineLabelLeft
                        size={UIToggleSize.Small}
                        onChange={switchChange}
                    />
                    <UIDropdown
                        id="splitterType"
                        label="splitterType"
                        selectedKey={sectionsProps.splitterType}
                        options={getOptions([UISplitterType.Resize, UISplitterType.Toggle])}
                        // ts-ignore
                        onChange={dropdownChange.bind(this, 'splitterType')}
                    />
                    <UIDropdown
                        id="splitterLayoutType"
                        label="splitterLayoutType"
                        selectedKey={sectionsProps.splitterLayoutType}
                        options={getOptions([UISplitterLayoutType.Compact, UISplitterLayoutType.Standard])}
                        // ts-ignore
                        onChange={dropdownChange.bind(this, 'splitterLayoutType')}
                    />
                    <div>
                        <UIToggle
                            id="animation1"
                            label="Animate left section"
                            checked={
                                Array.isArray(sectionsProps.animation)
                                    ? sectionsProps.animation[0]
                                    : sectionsProps.animation
                            }
                            inlineLabel
                            inlineLabelLeft
                            size={UIToggleSize.Small}
                            onChange={(event: React.MouseEvent<HTMLElement, MouseEvent>, checked?: boolean) =>
                                animationChange(0, checked)
                            }
                        />
                        <UIToggle
                            id="animation1"
                            label="Animate right section"
                            checked={
                                Array.isArray(sectionsProps.animation)
                                    ? sectionsProps.animation[1]
                                    : sectionsProps.animation
                            }
                            inlineLabel
                            inlineLabelLeft
                            size={UIToggleSize.Small}
                            onChange={(event: React.MouseEvent<HTMLElement, MouseEvent>, checked?: boolean) =>
                                animationChange(1, checked)
                            }
                        />
                    </div>
                    <div>
                        <UIToggle
                            id="sectionVisible"
                            label="toggle left section"
                            checked={leftSectionVisible}
                            inlineLabel
                            inlineLabelLeft
                            size={UIToggleSize.Small}
                            onChange={() => {
                                setLeftSectionVisible(!leftSectionVisible);
                            }}
                        />
                        <UIToggle
                            id="sectionVisible"
                            label="toggle right section"
                            checked={rightSectionVisible}
                            inlineLabel
                            inlineLabelLeft
                            size={UIToggleSize.Small}
                            onChange={() => {
                                setRightSectionVisible(!rightSectionVisible);
                            }}
                        />
                    </div>
                    <div>
                        <UIDefaultButton
                            text="Toggle sections"
                            onClick={() => {
                                setLeftSectionVisible(!leftSectionVisible);
                                setRightSectionVisible(!rightSectionVisible);
                            }}
                        />
                    </div>
                </div>
                <div
                    style={{
                        height: '100%'
                    }}>
                    <UISections
                        {...sectionsProps}
                        height="100%"
                        onClose={() => {
                            setRightSectionVisible(!rightSectionVisible);
                        }}>
                        <UISections.Section height="100%" cleanPadding={true} hidden={!leftSectionVisible}>
                            <div>
                                {text}
                                {text}
                                {text}
                            </div>
                        </UISections.Section>
                        <UISections.Section height="100%" cleanPadding={true} hidden={!rightSectionVisible}>
                            <div>
                                {text}
                                {text}
                                {text}
                            </div>
                        </UISections.Section>
                    </UISections>
                </div>
            </div>
        </>
    );
}

export const HorizontalSections = (): JSX.Element => <SectionsExample vertical={false} />;

export const VerticalSections = (): JSX.Element => <SectionsExample vertical={true} />;
