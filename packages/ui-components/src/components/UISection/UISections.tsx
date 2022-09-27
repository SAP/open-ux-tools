import React from 'react';
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
    static Section = UISection;
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
     * @param {number} layoutSize
     * @param {Array<number | UISectionSize | undefine>} sizes
     * @returns {UISectionSize[]}
     */
    updateStateSizes(layoutSize: number, sizes: Array<number | UISectionSize | undefined>): UISectionSize[] {
        let uiSizes: UISectionSize[] = sizes as UISectionSize[];
        const dynamicSectionIndex = this.getDynamicSectionIndex();
        // Calculate size for dynamic section
        let availableSize = 0;
        sizes.forEach((section, index) => {
            if (typeof section === 'object' && section.size === undefined) {
                const position = this.getSectionPosition(section);
                section.size = Math.abs(this.rootSize - position.end - position.start);
            }
            if (index !== dynamicSectionIndex) {
                availableSize += (typeof section === 'object' ? section.size : section) || 0;
            }
        });
        availableSize = layoutSize - availableSize;
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

    componentDidUpdate(): void {
        this.ignoreAnimation = false;
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
        let visibleSections: number[] | undefined;
        let dynamicSection = 0;
        if (Array.isArray(nextProps.animation)) {
            visibleSections = UISections.getVisibleSections(nextProps.children);
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
            //const size = this.getSectionCurrentSize(i);
            const size = sizes[i].size || 0;
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
        const layoutSize = this.getRootSize();
        if (sizes) {
            // Update sizes after resize
            sizes = this.updateStateSizes(layoutSize, sizes);
            // Apply state
            this.ignoreAnimation = true;
            this.setState({
                sizes: sizes
            });
        }
        this.rootSize = layoutSize;
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
        if (rootDom && rootDom.childNodes) {
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
     * @param {number} position Delta position in pixels.
     * @returns {boolean} If resizing was happened - it can return false when splitter meets resizing limitation.
     */
    private onSplitterResize(position: number): boolean {
        const resizeSections = position !== 0 ? this.resizeSections : [];
        let left = 0;
        for (let i = 0; i < resizeSections.length; i++) {
            const minSectionSize = this.getMinSectionSize(i);
            const resizeSection = resizeSections[i];
            let newSize = resizeSection.size + (i === 0 ? position : -position);
            if (minSectionSize === resizeSection.maxSize) {
                // Ignore resize - section is not resizable
                continue;
            }
            // Do not allow size exceed min and max boundaries
            if (newSize < minSectionSize) {
                position = this.correctBoundaryPosition(position, minSectionSize, newSize, i === 0);
                newSize = minSectionSize;
            } else if (newSize > resizeSection.maxSize) {
                position = this.correctBoundaryPosition(position, resizeSection.maxSize, newSize, i === 0);
                newSize = resizeSection.maxSize;
            }
            const sectionSize: UISectionSize = {
                percentage: false
            };
            const nextSession = resizeSections[i + 1];
            const right = nextSession ? nextSession.size - position : 0;
            if (i > 0) {
                sectionSize.size = newSize;
                sectionSize.start = left;
                resizeSection.dom.style[this.startPositionProperty] = left + 'px';
            } else {
                sectionSize.start = 0;
                resizeSection.dom.style[this.startPositionProperty] = '0px';
            }
            sectionSize.end = right;
            resizeSection.dom.style[this.endPositionProperty] = right + 'px';
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
     * @param {boolean} [reverse=false] Reverse calculation(width vs right).
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
        if (
            this.props.sizesAsPercents ||
            !this.props.sizes ||
            childrenCount < 2 ||
            (index >= this.props.sizes.length && index >= childrenCount)
        ) {
            return undefined;
        }
        const sectionStyle: React.CSSProperties = {
            [this.sizeProperty]: this.props.sizes[index] ? this.props.sizes[index] + 'px' : this.props.sizes[index]
        };
        if (index === 0) {
            sectionStyle[this.startPositionProperty] = 0;
        }
        if (index === this.props.sizes.length - 1) {
            sectionStyle[this.endPositionProperty] = 0;
        } else if (this.props.sizes[index + 1]) {
            sectionStyle[this.endPositionProperty] = this.props.sizes[index + 1] + 'px';
        }
        return sectionStyle;
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
        const stateSize = this.state.sizes && this.state.sizes[index];
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
            const toggleSectionSize = this.getSectionSize(index, childrenCount);
            if (toggleSectionSize) {
                sectionStyle.style = { ...sectionStyle.style, ...toggleSectionSize };
            } else {
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
        let stateSize = this.state.sizes && this.state.sizes[index];
        if (
            !stateSize &&
            this.props.splitterType === UISplitterType.Toggle &&
            this.props.sizes &&
            this.props.sizes[index]
        ) {
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
            const sectionSize = this.getSectionSize(index, childrenCount);
            if (sectionSize && sectionSize.width) {
                size = parseFloat(sectionSize.width.toString());
                unit = 'px';
            } else {
                size = this.getSizePercents(index, childrenCount);
                unit = '%';
            }
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
        const splitterType = this.props.splitterType || UISplitterType.Resize;
        const splitterLayoutType = this.props.splitterLayoutType || UISplitterLayoutType.Standard;
        let isSplitterVisible = this.props.splitter && index > 0;
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
                        vertical={this.props.vertical}
                        onResize={this.onSplitterResize.bind(this)}
                        onResizeStart={this.onSplitterResizeStart.bind(this)}
                        onResizeEnd={this.onSplitterResizeEnd.bind(this)}
                        onToggle={this.onSplitterToggle.bind(this)}
                        hidden={isSectionHidden || isSingleSection}
                        type={splitterType}
                        title={this.props.splitterTitle}
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
     * Method converts passed positions to section position object.
     *
     * @param {UISectionSize} section Section size.
     * @returns Position object.
     */
    private getSectionPosition(section: UISectionSize): { start: number; end: number } {
        return { start: section.start || 0, end: section.end || 0 };
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
            const next = sizes[i + 1];
            const right = next ? next.size : 0;
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
        // Recalculate positions - START
        let start = 0;
        sizes.forEach((section) => {
            section.start = start;
            // Next start
            start += section.size || 0;
        });
        // Recalculate positions - END
        let end = 0;
        for (let i = sizes.length - 1; i >= 0; i--) {
            sizes[i].end = end;
            // Next start
            end += sizes[i].size || 0;
        }
    }

    /**
     * Method returns size of sections container.
     *
     * @returns {UISectionSize[]} Size of sections container.
     */
    private getRootSize(): number {
        const rootDom = this.rootRef.current;
        return rootDom?.getBoundingClientRect()[this.sizeProperty] || 0;
    }

    /**
     * @returns {React.ReactElement}
     */
    render(): React.ReactElement {
        const sections = [];
        let visibleSections = 0;
        for (let i = 0; i < this.props.children.length; i++) {
            const childNode = this.props.children[i] as React.ReactElement;
            const isSectionHidden = !UISections.isSectionVisible(childNode);

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
                ref={this.rootRef}
                className={`sections ${this.getClassNames(visibleSections === 1)}`}
                style={{
                    ...(this.props.height && { height: this.props.height })
                }}>
                {sections}
            </div>
        );
    }
}
