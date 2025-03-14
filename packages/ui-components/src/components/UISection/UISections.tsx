import React from 'react';
import { divProperties, getNativeProps } from '@fluentui/react';
import { UISection } from './UISection';
import type { UISectionProps } from './UISection';
import { UISplitter, UISplitterType, UISplitterLayoutType } from './UISplitter';

import './UISections.scss';

export const ANIMATION_TIME = 300;

export interface UISectionsProps {
    children: React.ReactNodeArray;
    splitter?: boolean;
    sizes?: Array<number | undefined>;
    sizesAsPercents?: boolean;
    height?: string;
    vertical?: boolean;
    minSectionSize?: number | Array<number>;
    animation?: boolean | boolean[];
    splitterType?: UISplitterType;
    /**
     * Tabindex of splitter element.
     *
     * @default 0
     */
    splitterTabIndex?: -1 | 0;
    onClose?: () => void;
    splitterTitle?: string;
    splitterLayoutType?: UISplitterLayoutType;
    onResize?: (sizes: Array<UISectionSize | undefined>) => void;
    onToggleFullscreen?: (isFullScreen: boolean) => void;
}

export interface UISectionsState {
    sizes?: Array<UISectionSize>;
    visibleSections?: number[];
    animate?: boolean;
    dynamicSection?: number;
}

export interface UISectionSize {
    start?: number;
    end?: number;
    percentage: boolean;
    size?: number;
}

interface SectionResizeSession {
    size: number;
    dom: HTMLElement;
    maxSize: number;
    section: UISectionSize;
}

interface SectionStyleCalculation {
    visible: boolean;
    style?: React.CSSProperties;
}

const SECTIONS_ANIMATION_CLASS = 'sections--animated';

interface SizeCalculationInfo {
    size: number;
    spareSize: number;
    minSize: number;
}

/**
 * UISections component.
 *
 * @exports
 * @class {UISections}
 * @extends {React.Component<UISectionsProps, UISectionsState>}
 */
export class UISections extends React.Component<UISectionsProps, UISectionsState> {
    static readonly Section = UISection;
    private sizeProperty: 'height' | 'width';
    private readonly domSizeProperty: 'clientHeight' | 'clientWidth';
    private startPositionProperty: 'top' | 'left';
    private endPositionProperty: 'bottom' | 'right';
    private resizeSections: Array<SectionResizeSession> = [];
    private readonly rootRef: React.RefObject<HTMLDivElement>;

    private isFullScreen = false;
    private rootSize = 0;
    private ignoreAnimation = false;

    /**
     * Initializes component properties.
     *
     * @param {UISectionsProps} props
     */
    constructor(props: UISectionsProps) {
        super(props);
        this.state = {
            sizes: undefined
        };
        this.onWindowResize = this.onWindowResize.bind(this);
        this.rootRef = React.createRef();
        this.sizeProperty = props.vertical ? 'height' : 'width';
        this.domSizeProperty = props.vertical ? 'clientHeight' : 'clientWidth';
        this.startPositionProperty = props.vertical ? 'top' : 'left';
        this.endPositionProperty = props.vertical ? 'bottom' : 'right';
        this.sizeProperty = props.vertical ? 'height' : 'width';
        window.addEventListener('resize', this.onWindowResize);
    }

    /**
     * Updates state sizes.
     *
     * @param newSize Latest size of root
     * @param sizes Sizes of sections
     * @param oldSize Old size of root before resize of window
     * @returns Calculated sizes and position for all sections
     */
    updateStateSizes(
        newSize: number,
        sizes: Array<number | UISectionSize | undefined>,
        oldSize = newSize
    ): UISectionSize[] {
        let uiSizes: UISectionSize[] = sizes as UISectionSize[];
        const dynamicSectionIndex = this.getDynamicSectionIndex();
        // Calculate size for dynamic section
        let availableSize = 0;
        sizes.forEach((section, index) => {
            if (typeof section === 'object' && section.size === undefined) {
                section.size = this.getSize(section, oldSize);
            }
            if (index !== dynamicSectionIndex) {
                availableSize += (typeof section === 'object' ? section.size : section) ?? 0;
            }
        });
        availableSize = newSize - availableSize;
        // Check if number array is passed as sizes. Convert array of number to array of UISectionSize
        if (typeof sizes[0] !== 'object') {
            uiSizes = [];
            let start = 0;
            (sizes as number[]).forEach((size, index) => {
                size = dynamicSectionIndex !== index ? size : availableSize;
                uiSizes.push({
                    percentage: false,
                    size,
                    start
                });
                start += size || 0;
            });
        }
        // Apply size for dynamic section
        const dynamicSection = uiSizes[dynamicSectionIndex];
        if (dynamicSection) {
            dynamicSection.size = availableSize;
        }
        // Recalculate start and end positions
        this.recalculatePositions(uiSizes);
        // Validate min sizes
        this.validateStateMinSizes(uiSizes);
        return uiSizes;
    }

    componentDidMount(): void {
        const { sizesAsPercents, sizes } = this.props;
        this.rootSize = this.getRootSize();
        if (!sizesAsPercents && sizes) {
            // Calculate state
            this.setState({
                sizes: this.updateStateSizes(this.rootSize, sizes)
            });
        }
    }

    /**
     * React lifecycle method that is invoked immediately after updating occurs.
     * This method is used to determine if the section sizes need to be recalculated
     * when the external prop sizes have changed.
     *
     * @param prevProps The previous props of the component before the update.
     * @param prevState The previous state of the component before the update.
     */
    componentDidUpdate(prevProps: UISectionsProps, prevState: UISectionsState): void {
        this.ignoreAnimation = false;
        const externalSizes = this.props.sizes ?? [];
        const sizes = this.state.sizes ?? [];
        const prevSizes = prevProps.sizes ?? [];
        const prevVisibleSections = prevState.visibleSections ?? [];
        const visibleSections = this.state.visibleSections ?? [];
        let newSizes: UISectionSize[] | undefined;
        // Recalculate sizes when external sizes changed
        const isExternalSizesChanged =
            externalSizes !== prevSizes &&
            (externalSizes.length !== prevSizes.length ||
                externalSizes.some((size, index) => size !== prevSizes[index]));
        // Recalculate sizes when visibility of sections are changed
        const isSectionsVisibilityToggled =
            prevVisibleSections.length !== visibleSections.length ||
            prevVisibleSections.some((index) => !visibleSections.includes(index));
        if (isExternalSizesChanged || isSectionsVisibilityToggled) {
            newSizes = this.updateStateSizes(this.rootSize, isExternalSizesChanged ? externalSizes : sizes);
        }
        if (newSizes) {
            // State sizes are updated
            this.setState({
                sizes: newSizes
            });
            // Update cached section's sizes
            for (let i = 0; i < newSizes.length; i++) {
                if (this.resizeSections[i]) {
                    this.resizeSections[i].section = newSizes[i];
                }
            }
        }
    }

    /**
     * Gets derived state from properties.
     *
     * @param {UISectionProps} nextProps
     * @param {UISectionsState} prevState
     * @returns {UISectionsState | null}
     */
    static getDerivedStateFromProps(nextProps: UISectionsProps, prevState: UISectionsState): UISectionsState | null {
        // Handle property "animation" as array
        let animate = prevState.animate;
        const visibleSections: number[] = UISections.getVisibleSections(nextProps.children);
        let dynamicSection = 0;
        if (Array.isArray(nextProps.animation)) {
            // Check if there is transition for section with enabled animation
            let transitionAnimation: boolean | undefined;
            for (let i = 0; i < nextProps.animation.length; i++) {
                if (visibleSections?.includes(i) !== prevState.visibleSections?.includes(i)) {
                    transitionAnimation = transitionAnimation || nextProps.animation[i];
                }
            }
            if (transitionAnimation !== undefined) {
                // Visibility of sections changed - apply animation for transition section
                animate = transitionAnimation;
            }
        } else {
            animate = nextProps.animation;
        }
        // Find dynamic section index
        nextProps.sizes?.forEach((size: number | undefined, index: number) => {
            if (size === undefined) {
                dynamicSection = index;
            }
        });
        return {
            animate,
            visibleSections,
            dynamicSection
        };
    }

    /**
     * Validates state min sizes.
     *
     * @param {UISectionSize[]} sizes
     */
    private validateStateMinSizes(sizes: UISectionSize[]): void {
        // Prerequisite. Get size infos
        let minSizesSum = 0;
        let recalculateSizes = false;
        const sizesInfo: Array<SizeCalculationInfo> = [];
        for (let i = 0; i < this.props.children.length; i++) {
            const size = sizes[i]?.size ?? 0;
            const minSize = this.getMinSectionSize(i);
            if (minSize > size) {
                recalculateSizes = true;
            }
            minSizesSum += minSize;
            // Sizes data
            sizesInfo.push({
                size,
                minSize,
                spareSize: size - minSize
            });
        }
        // First Part. Check if full screen required
        const layoutSize = this.getRootSize();
        // Second Part. Calculate sections which less than min size.
        if (recalculateSizes && layoutSize >= minSizesSum) {
            const recalculatedSizes = this.calculateSectionSizes(sizesInfo);
            for (let i = 0; i < sizes.length; i++) {
                sizes[i] = recalculatedSizes[i];
            }
        }
        // Check full screen toggle
        const isFullScreen = layoutSize < minSizesSum;
        if (isFullScreen !== this.isFullScreen) {
            this.isFullScreen = isFullScreen;
            this.props.onToggleFullscreen?.(isFullScreen);
        }
    }

    onWindowResize(): void {
        let { sizes } = this.state;
        // Dynamic section index
        const oldSize = this.rootSize;
        this.rootSize = this.getRootSize();
        if (sizes) {
            // Update sizes after resize
            sizes = this.updateStateSizes(this.rootSize, sizes, oldSize);
            // Update cached section's sizes
            for (let i = 0; i < sizes.length; i++) {
                if (this.resizeSections[i]) {
                    this.resizeSections[i].section = sizes[i];
                }
            }
            // Apply state
            this.ignoreAnimation = true;
            this.setState({
                sizes: sizes
            });
        }
    }

    /**
     * Method returns indices of visible sections.
     *
     * @param {React.ReactNodeArray} sections Section elements.
     * @returns {number[]} Indices of visible sections.
     */
    static getVisibleSections(sections: React.ReactNodeArray): number[] {
        const visibleSections: number[] = [];
        sections.forEach((child: React.ReactNode, i: number) => {
            if (!UISections.isSectionVisible(child as React.ReactElement)) {
                visibleSections.push(i);
            }
        });
        return visibleSections;
    }

    /**
     * Method checks is passed child section visible or not.
     *
     * @param {React.ReactElement | undefined} node React child node.
     * @returns {boolean} True if section visible.
     */
    static isSectionVisible(node: React.ReactElement | undefined): boolean {
        if (node && node.type === UISection) {
            return !(node.props as UISectionProps).hidden;
        }
        return false;
    }

    /**
     * Method called when resizing of section started.
     */
    private onSplitterResizeStart(): void {
        const rootDom = this.rootRef.current;
        const resizeSections = [];
        if (rootDom?.childNodes) {
            rootDom.classList.remove(SECTIONS_ANIMATION_CLASS);
            for (let i = 0; i < rootDom.childNodes.length; i++) {
                const minSectionSize = this.getMinSectionSize(i);
                const siblingMinSectionSize = this.getMinSectionSize(i === 0 ? 1 : 0);
                const sectionDom = rootDom.children[i] as HTMLElement;
                const maxSize = Math.max(minSectionSize, rootDom[this.domSizeProperty] - siblingMinSectionSize);
                resizeSections.push({
                    size: sectionDom[this.domSizeProperty],
                    dom: sectionDom,
                    maxSize,
                    section: this.resizeSections[i]
                        ? this.resizeSections[i].section
                        : {
                              percentage: false
                          }
                });
            }
        }
        this.resizeSections = resizeSections;
    }

    /**
     * Method called when resizing of section is happening.
     *
     * @param {number} index Index of splitter.
     * @param {number} position Delta position in pixels.
     * @returns {boolean} If resizing was happened - it can return false when splitter meets resizing limitation.
     */
    private onSplitterResize(index: number, position: number): boolean {
        const resizeSections = position !== 0 ? this.resizeSections : [];
        const totalSize = this.rootSize;
        let left = this.getSiblingsSize(resizeSections, 0, index, true);
        this.refreshResizeSections(0, index, this.state.sizes);
        let minSizeTriggered = false;
        for (let i = index; i < resizeSections.length; i++) {
            const sectionSize: UISectionSize = {
                percentage: false
            };
            const resizeSection = resizeSections[i];
            const minSectionSize = this.getMinSectionSize(i);
            const maxSectioSize = this.getMaxSectionSize(i, minSectionSize, index);
            if (minSectionSize === maxSectioSize) {
                // Ignore resize - section is not resizable
                left += minSectionSize;
                continue;
            }
            let newSize = resizeSection.size;
            if (i === index) {
                newSize = resizeSection.size + position;
            } else if (i === index + 1 || minSizeTriggered) {
                newSize = resizeSection.size - position;
            }
            // Do not allow size exceed min and max boundaries
            minSizeTriggered = false;
            if (newSize < minSectionSize) {
                position = this.correctBoundaryPosition(position, minSectionSize, newSize, i === index);
                newSize = minSectionSize;
                minSizeTriggered = true;
            } else if (newSize > maxSectioSize) {
                position = this.correctBoundaryPosition(position, maxSectioSize, newSize, i === index);
                newSize = maxSectioSize;
            }
            let right = 0;
            if (resizeSections[i + 1]) {
                right = totalSize - left - newSize;
            }
            this.updateSectionSize(sectionSize, i, {
                size: newSize,
                start: left,
                end: right,
                percentage: false
            });
            resizeSection.dom.style[this.startPositionProperty] = sectionSize.start + 'px';
            resizeSection.dom.style[this.endPositionProperty] = sectionSize.end + 'px';
            resizeSection.dom.style[this.sizeProperty] = '';
            resizeSection.section = sectionSize;
            left += newSize;
        }
        return false;
    }

    /**
     * Method returns corrected position based on boundary and size.
     *
     * @param {number} position Delta position in pixels.
     * @param {number} boundary Boundary position.
     * @param {number} size Section size.
     * @param {boolean} positive Direction.
     * @returns {number} Position after correction based on boundary.
     */
    private correctBoundaryPosition(position: number, boundary: number, size: number, positive: boolean): number {
        const diff = boundary - size;
        return position + (positive ? diff : -diff);
    }

    /**
     * Method called when resizing session ended.
     */
    private onSplitterResizeEnd(): void {
        const rootDom = this.rootRef.current;
        if (rootDom && this.isAnimationEnabled()) {
            rootDom.classList.add(SECTIONS_ANIMATION_CLASS);
        }
        const sizes = this.resizeSections.map((resizeSection) => resizeSection.section);
        if (sizes.some((size) => size.end !== undefined || size.start !== undefined || size.size !== undefined)) {
            this.setState({
                sizes
            });
        }
        this.props.onResize?.(sizes);
    }

    /**
     * Method called when splitter with type 'Toggle' was toggled.
     */
    private onSplitterToggle(): void {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    /**
     * Method returns visible children sections count.
     *
     * @returns {number} Count of visible children sections.
     */
    private getVisibleChildrenCount(): number {
        return this.props.children.filter((child) => child && UISections.isSectionVisible(child as React.ReactElement))
            .length;
    }

    /**
     * Method returns size of section in percents.
     *
     * @param {number} index Target section index.
     * @param {number} childrenCount Count of children.
     * @param {boolean} [reverse] Reverse calculation(width vs right).
     * @returns {number} Size of section in percents. For example 50% => 0.5.
     */
    private getSizePercents(index: number, childrenCount: number, reverse = false): number {
        const { sizes = [], sizesAsPercents } = this.props;
        let propSize = sizes[index];
        if (propSize === undefined && index === this.state.dynamicSection) {
            // Find available size
            let newSize = 100;
            sizes.every((size) => {
                if (size) {
                    newSize -= size;
                }
            });
            propSize = newSize;
        }
        if (propSize && sizesAsPercents) {
            return reverse ? 100 - propSize : propSize;
        }
        return childrenCount > 0 ? 100 / childrenCount : 0;
    }

    /**
     * Method gets section size when section size is not percent based and 'sizes' prop is passed from outside.
     *
     * @param {number} index Section index to look up.
     * @param {number} childrenCount Count of visible children.
     * @returns {React.CSSProperties | undefined} CSS Style object or undefined if no style from 'sizes' prop.
     */
    private getSectionSize(index: number, childrenCount: number): React.CSSProperties | undefined {
        const { sizes } = this.state;
        if (!sizes || this.props.sizesAsPercents || !this.props.sizes || childrenCount < 2) {
            return undefined;
        }
        const result: React.CSSProperties = {};
        if (sizes[index].start !== undefined) {
            result[this.startPositionProperty] = sizes[index].start;
        }
        if (sizes[index].end !== undefined) {
            result[this.endPositionProperty] = sizes[index].end;
        }
        return result;
    }

    /**
     * Gets position style value.
     *
     * @param {number} childrenCount
     * @param {string} value
     * @returns {string}
     */
    private getPositionStyleValue(childrenCount: number, value: string): string {
        return childrenCount === 1 ? '0%' : value;
    }

    /**
     * Method returns style object for passed visible section.
     * Method calculates size of section depending on several points.
     * 1. Section - resized or not.
     * 2. Animation - off or on.
     *
     * @param {number} index Index of section.
     * @returns {SectionStyleCalculation} Object which contains visibility state and styles to apply.
     */
    private getVisibleSectionStyle(index: number): SectionStyleCalculation {
        const sectionStyle: { visible: boolean; style?: React.CSSProperties } = {
            visible: true,
            style: {}
        };
        // Use values from state or calculate initial percents
        const childrenCount = this.getVisibleChildrenCount();
        const stateSize = this.state.sizes?.[index];
        if (childrenCount === this.props.children.length && stateSize) {
            sectionStyle.style = {
                ...(stateSize.start !== undefined && { [this.startPositionProperty]: stateSize.start + 'px' }),
                ...(stateSize.end !== undefined && { [this.endPositionProperty]: stateSize.end + 'px' })
            };
            if (stateSize.size !== undefined && (stateSize.start === undefined || stateSize.end === undefined)) {
                // No need to provide size if start and end defined
                sectionStyle.style[this.sizeProperty] = stateSize.size + 'px';
            }
        } else {
            let usePercents = true;
            if (stateSize) {
                const toggleSectionSize = this.getSectionSize(index, childrenCount);
                if (toggleSectionSize) {
                    sectionStyle.style = { ...sectionStyle.style, ...toggleSectionSize };
                    usePercents = false;
                }
            }
            if (usePercents) {
                const size: number = this.getSizePercents(index, childrenCount, true);
                sectionStyle.style = {
                    [this.startPositionProperty]: this.getPositionStyleValue(childrenCount, `${index * size}%`),
                    [this.endPositionProperty]: this.getPositionStyleValue(
                        childrenCount,
                        `${(childrenCount - (index + 1)) * size}%`
                    )
                };
            }
        }
        return sectionStyle;
    }

    /**
     * Method returns style object for passed hidden section.
     * Method calculates size of section depending on several points.
     * 1. Section - resized or not.
     * 2. Animation - off or on.
     *
     * @param {number} index Index of section.
     * @returns {SectionStyleCalculation} Object which contains visibility state and styles to apply.
     */
    private getHiddenSectionStyle(index: number): SectionStyleCalculation {
        const sectionStyle: { visible: boolean; style?: React.CSSProperties } = {
            visible: false
        };
        // Hidden section when animation is ON
        let stateSize = this.state.sizes?.[index];
        if (!stateSize && this.props.splitterType === UISplitterType.Toggle && this.props.sizes?.[index]) {
            stateSize = {
                size: this.props.sizes[index],
                percentage: false
            };
        }
        let unit: string;
        let size = 0;
        if (stateSize) {
            unit = 'px';
            if (stateSize.size) {
                size = stateSize.size;
            } else if (stateSize?.start !== undefined && stateSize?.end !== undefined) {
                size = this.getRootSize() - stateSize.end - stateSize.start;
            }
        } else {
            const childrenCount = this.props.children.length;
            size = this.getSizePercents(index, childrenCount);
            unit = '%';
        }

        const hiddenPosition = -size + unit;
        sectionStyle.style = {
            [this.endPositionProperty]: index === 0 ? '100%' : hiddenPosition,
            [this.startPositionProperty]: index === 0 ? hiddenPosition : '100%'
        };
        return sectionStyle;
    }

    /**
     * Method returns minimal size for passed section.
     *
     * @param {number} index Index of section.
     * @returns {number} Minimal size of section.
     */
    private getMinSectionSize(index: number): number {
        const minSectionSize = this.props.minSectionSize;
        let minSize = 0;
        if (minSectionSize) {
            minSize = Array.isArray(minSectionSize) ? minSectionSize[index] : minSectionSize;
        }
        return minSize;
    }

    /**
     * Method returns class names string depending on props and component state.
     *
     * @param {boolean} fullSizeMode Is full size mode - only ine sction visible.
     * @returns {number} Minimal size of section.
     */
    getClassNames(fullSizeMode: boolean): string {
        let classNames = ` ${this.props.vertical ? 'sections--vertical' : 'sections--horizontal'}`;
        // Animation
        const sectionsAnimationClass = ` ${SECTIONS_ANIMATION_CLASS}`;
        classNames += `${this.isAnimationEnabled() ? sectionsAnimationClass : ''}`;
        // Full 'screen' mode - only one section visible
        classNames += `${fullSizeMode ? ' sections--full' : ''}`;
        return classNames;
    }

    /**
     * Method returns section's react element based on passed section index.
     *
     * @param {number} index Section index.
     * @param {boolean} isSectionHidden Is section hidden.
     * @returns {React.ReactElement | undefined} Section's react element.
     */
    getSection(index: number, isSectionHidden: boolean): React.ReactElement | undefined {
        const childNode = this.props.children[index] as React.ReactElement;
        const sectionStyle = UISections.isSectionVisible(childNode)
            ? this.getVisibleSectionStyle(index)
            : this.getHiddenSectionStyle(index);

        if (!sectionStyle) {
            return undefined;
        }
        const {
            splitter,
            vertical,
            splitterTitle,
            splitterType = UISplitterType.Resize,
            splitterTabIndex,
            splitterLayoutType = UISplitterLayoutType.Standard
        } = this.props;
        let isSplitterVisible = splitter && index > 0;
        const isSingleSection = this.getVisibleChildrenCount() === 1;
        if (isSingleSection && !this.isAnimationEnabled()) {
            isSplitterVisible = false;
        }
        return (
            <div
                key={index}
                className={`sections__item${isSplitterVisible ? ' sections__item--' + splitterType : ''}${
                    !sectionStyle.visible ? ' sections__item--hidden' : ''
                }`}
                style={sectionStyle.style}>
                {isSplitterVisible && childNode && (
                    <UISplitter
                        vertical={vertical}
                        onResize={this.onSplitterResize.bind(this, index - 1)}
                        onResizeStart={this.onSplitterResizeStart.bind(this)}
                        onResizeEnd={this.onSplitterResizeEnd.bind(this)}
                        onToggle={this.onSplitterToggle.bind(this)}
                        hidden={isSectionHidden || isSingleSection || !this.isSectionVisible(index - 1)}
                        type={splitterType}
                        splitterTabIndex={splitterTabIndex}
                        title={splitterTitle}
                        splitterLayoutType={splitterLayoutType}
                    />
                )}
                {childNode}
            </div>
        );
    }

    /**
     * Method checks if animation enabled with current state.
     *
     * @returns {boolean} True if animation is enabled.
     */
    private isAnimationEnabled() {
        return !this.ignoreAnimation && (this.props.animation === true || this.state.animate);
    }

    /**
     * Method returns index of dynamicly sized section.
     *
     * @returns {number} Index of dynamicly sized section.
     */
    private getDynamicSectionIndex(): number {
        return this.state.dynamicSection !== undefined ? this.state.dynamicSection : 0;
    }

    /**
     * Method calculates spare size for passed section.
     *
     * @param {SizeCalculationInfo} origin Section size.
     * @param {SizeCalculationInfo[]} sizes All section sizes.
     * @returns {number} Spare size.
     */
    private getSpareSize(origin: SizeCalculationInfo, sizes: SizeCalculationInfo[]): number {
        let increaseSize = 0;
        let target = origin.minSize - origin.size;
        for (const info of sizes) {
            if (info === origin) {
                continue;
            }
            if (info.spareSize > 0) {
                const useSize = Math.min(info.spareSize, target);
                // Update targets
                increaseSize += useSize;
                info.spareSize -= useSize;
                info.size -= useSize;
                target -= useSize;
            }
            if (target <= 0) {
                // Desireable target meet requirement
                break;
            }
        }
        return increaseSize;
    }

    /**
     * Method converts SizeCalculationInfo into UISectionSize before applying sizes to state.
     *
     * @param {SizeCalculationInfo[]} sizes Section sizes.
     * @returns {UISectionSize[]} Section sizes applyable for state.
     */
    private calculateSectionSizes(sizes: SizeCalculationInfo[]): UISectionSize[] {
        // Calculate sizes
        for (const section of sizes) {
            if (section.size < section.minSize) {
                const diff = this.getSpareSize(section, sizes);
                if (diff) {
                    section.size += diff;
                }
            }
        }
        // Apply sizes to state
        const stateSizes: Array<UISectionSize> = [];
        for (let i = 0; i < sizes.length; i++) {
            const sectionSize: UISectionSize = {
                percentage: false
            };
            const current = sizes[i];
            const right = this.getSiblingsSize(sizes, i + 1, sizes.length);
            if (i > 0) {
                sectionSize.size = current.size;
                sectionSize.start = undefined;
            } else {
                sectionSize.start = 0;
            }
            sectionSize.end = right;
            stateSizes.push(sectionSize);
        }
        return stateSizes;
    }

    /**
     * Method recalculates "start" and "end" position based on size property.
     *
     * @param {UISectionSize[]} sizes Section sizes.
     */
    private recalculatePositions(sizes: UISectionSize[]): void {
        sizes.forEach((section, index) => {
            if (this.isSectionVisible(index)) {
                section.start = this.getSectionPosition(index, sizes, true);
                section.end = this.getSectionPosition(index, sizes, false);
            }
            // else {
            //     section.start = 0;
            //     section.end = 0;
            // }
        });
    }

    /**
     * Method returns size of sections container.
     *
     * @returns {UISectionSize[]} Size of sections container.
     */
    private getRootSize(): number {
        const rootDom = this.rootRef.current;
        return rootDom?.getBoundingClientRect()[this.sizeProperty] ?? 0;
    }

    /**
     * @returns {React.ReactElement}
     */
    render(): React.ReactElement {
        const divProps = getNativeProps<React.HTMLAttributes<HTMLDivElement>>(this.props, divProperties, [
            'className',
            'children'
        ]);
        const sections = [];
        let visibleSections = 0;
        for (let i = 0; i < this.props.children.length; i++) {
            const isSectionHidden = !this.isSectionVisible(i);

            if (!isSectionHidden) {
                visibleSections++;
            }
            const section = this.getSection(i, isSectionHidden);
            if (section) {
                sections.push(section);
            }
        }

        return (
            <div
                {...divProps}
                ref={this.rootRef}
                className={`sections ${this.getClassNames(visibleSections === 1)}`}
                style={{
                    ...(this.props.height && { height: this.props.height })
                }}>
                {sections}
            </div>
        );
    }

    /**
     * Calculates the total size of sibling elements within a specified range.
     *
     * @param sizes An array of objects, each containing 'size` property.
     * @param start The starting index (inclusive) of the range.
     * @param end The ending index (exclusive) of the range.
     * @param onlyVisible Calculate only visible sections.
     * @returns The sum of the sibling sizes for the specified range.
     */
    private getSiblingsSize(sizes: Array<{ size?: number }>, start: number, end: number, onlyVisible = false): number {
        let size = 0;
        for (let j = start; j < end; j++) {
            const next = sizes[j];
            if (next?.size && (!onlyVisible || this.isSectionVisible(j))) {
                size += next.size;
            }
        }
        return size;
    }

    /**
     * Refreshes the resize sections by updating their sizes from a provided range.
     *
     * @param start The starting index (inclusive) of the sections to refresh.
     * @param end The ending index (exclusive) of the sections to refresh.
     * @param sizes An array of section sizes to apply.
     */
    private refreshResizeSections(start: number, end: number, sizes: UISectionSize[] = []): void {
        for (let i = start; i < end; i++) {
            if (sizes[i]) {
                this.resizeSections[i].section = sizes[i];
            }
        }
    }

    /**
     * Calculates the maximum allowable size for a section at the specified index.
     *
     * @param index The index of the section to calculate the maximum size for.
     * @param minSectionSize The minimum size of the section.
     * @param splitterIndex Optional index of the splitter; if specified, the section at this index is not considered resizable.
     * @returns The maximum size the section can expand to, constrained by available space and other sections.
     */
    private getMaxSectionSize(index: number, minSectionSize: number, splitterIndex?: number): number {
        const resizeSection = this.resizeSections[index];
        if (resizeSection && index !== splitterIndex) {
            return Math.max(minSectionSize, resizeSection.maxSize);
        }
        // Calculate max size based on current DOM
        const rootDom = this.rootRef.current;
        const mainSize = rootDom?.[this.domSizeProperty] ?? 0;
        const resizeSections = this.resizeSections;
        let reservedSize = 0;
        for (let i = 0; i < index; i++) {
            if (this.isSectionVisible(i)) {
                reservedSize += resizeSections[i].size;
            }
        }
        for (let i = index + 1; i < resizeSections.length; i++) {
            if (this.isSectionVisible(i)) {
                reservedSize += this.getMinSectionSize(i);
            }
        }
        return Math.max(minSectionSize, mainSize - reservedSize);
    }

    /**
     * Updates the size and position of section.
     *
     * @param sectionSize The section object to be updated.
     * @param index The index of the section.
     * @param newSize The new size and position values for the section.
     */
    private updateSectionSize(sectionSize: UISectionSize, index: number, newSize: UISectionSize): void {
        if (index > 0) {
            sectionSize.size = newSize.size;
            sectionSize.start = newSize.start;
        } else {
            sectionSize.start = 0;
        }
        sectionSize.end = newSize.end;
        if (this.isSectionVisible(index) && sectionSize.end !== undefined && sectionSize.start !== undefined) {
            sectionSize.size = Math.abs(this.rootSize - sectionSize.end - sectionSize.start);
        }
    }

    /**
     * Determines whether a specific section is visible.
     *
     * @param {number} index - The index of the child node to check.
     * @returns {boolean} - Returns `true` if the section is visible, otherwise `false`.
     */
    private isSectionVisible(index: number): boolean {
        const childNode = this.props.children[index] as React.ReactElement;
        return childNode ? UISections.isSectionVisible(childNode) : false;
    }

    /**
     * Calculates the position of a section, either from the start or the end.
     *
     * @param index The index of the section.
     * @param sizes An array of section size objects.
     * @param start Determines whether to calculate from the start (true) or the end (false).
     * @returns The calculated position of the section.
     */
    private getSectionPosition(index: number, sizes: Array<UISectionSize>, start: boolean): number {
        let visibleSize = 0;
        let hiddenSize = 0;
        let totalHiddenSize = 0;

        const iterate = (i: number) => {
            const size = this.getSize(sizes[i]);
            if (this.isSectionVisible(i)) {
                visibleSize += size;
                totalHiddenSize += hiddenSize;
                hiddenSize = 0;
            } else {
                hiddenSize += size;
            }
        };

        if (start) {
            for (let i = 0; i < index; i++) {
                iterate(i);
            }
        } else {
            for (let i = sizes.length - 1; i > index; i--) {
                iterate(i);
            }
        }

        return visibleSize + totalHiddenSize;
    }

    /**
     * Returns the size of a section based on its properties(size, start, end).
     *
     * @param sizes The section size object containing size, start, and end properties.
     * @param rootSize Size of root container.
     * @returns The computed size of the section. Returns 0 if no valid size is found.
     */
    private getSize(sizes: UISectionSize, rootSize = this.rootSize): number {
        if (sizes.size !== undefined) {
            return sizes.size;
        }
        if (sizes.end !== undefined && sizes.start !== undefined) {
            return Math.abs(rootSize - sizes.end - sizes.start);
        }
        return 0;
    }
}
