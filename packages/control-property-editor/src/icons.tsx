import React from 'react';
import { registerIcons } from '@fluentui/react';

export enum IconName {
    desktop = 'desktop',
    table = 'tablet',
    phone = 'phone',
    funnel = 'funnel',
    eyeClosed = 'eyeClosed',
    lock = 'lock',
    noEdit = 'noEdit',
    editable = 'editable',
    boolTrue = 'boolTrue',
    boolFalse = 'boolFalse',
    dropdown = 'dropdown',
    string = 'string',
    number = 'number',
    expression = 'expression',
    arrow = 'arrow',
    grabber = 'grabber',
    themePainter = 'themePainter',
    chevronLeft = 'chevronLeft'
}

export function registerAppIcons(): void {
    registerIcons({
        icons: {
            boolTrue: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12.3536 5.35359L6.00004 11.7071L3.64648 9.35359L4.35359 8.64648L6.00004 10.2929L11.6465 4.64648L12.3536 5.35359Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            boolFalse: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M8.00004 8.70715L11.6465 12.3536L12.3536 11.6465L8.70715 8.00004L12.3536 4.35359L11.6465 3.64648L8.00004 7.29293L4.35359 3.64648L3.64648 4.35359L7.29293 8.00004L3.64648 11.6465L4.35359 12.3536L8.00004 8.70715Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            dropdown: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.14648 6.35359L3.85359 5.64648L8.00004 9.79293L12.1465 5.64648L12.8536 6.35359L8.00004 11.2071L3.14648 6.35359Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            string: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M4.0082 12L4.58594 9.89858H7.16875L7.74648 12H8.74336L6.42109 4.01929H5.33359L3 12H4.0082ZM6.21152 6.39819L6.94219 9.05464H4.8125L5.54316 6.39819C5.75085 5.5939 5.86224 5.14832 5.87734 5.06147L5.92266 5.24272C6.05104 5.77137 6.14733 6.15653 6.21152 6.39819ZM9.40283 11.6616C9.67497 11.9588 10.0527 12.1074 10.5361 12.1074C10.8799 12.1074 11.1681 12.0322 11.4009 11.8818C11.6372 11.7279 11.8306 11.5076 11.981 11.2212H12.0024C12.0096 11.4002 12.0132 11.5309 12.0132 11.6133L12.0239 12H12.8672C12.86 11.7064 12.8564 11.2373 12.8564 10.5928V8.0415C12.8564 7.40771 12.7043 6.92253 12.3999 6.58594C12.0991 6.24935 11.6623 6.08105 11.0894 6.08105C10.6561 6.08105 10.2873 6.17236 9.98291 6.35498C9.68213 6.53402 9.40462 6.79899 9.15039 7.1499L9.78955 7.67627C10.0223 7.37191 10.2336 7.16064 10.4233 7.04248C10.6167 6.92432 10.828 6.86523 11.0571 6.86523C11.3543 6.86523 11.5817 6.97087 11.7393 7.18213C11.9004 7.38981 11.981 7.7085 11.981 8.13818V8.58936L11.0195 8.61084C10.4215 8.62158 9.93457 8.77197 9.55859 9.06201C9.1862 9.34847 9 9.81038 9 10.4478C9 10.9598 9.13428 11.3644 9.40283 11.6616ZM11.4116 11.1299C11.229 11.2552 11.0142 11.3179 10.7671 11.3179C10.5057 11.3179 10.2998 11.2391 10.1494 11.0815C9.99902 10.924 9.92383 10.7056 9.92383 10.4263C9.92383 10.0288 10.0402 9.74593 10.2729 9.57764C10.5057 9.40934 10.8065 9.31803 11.1753 9.30371L11.9702 9.28223V9.92139C11.9702 10.172 11.9219 10.4048 11.8252 10.6196C11.7321 10.8309 11.5942 11.001 11.4116 11.1299Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            number: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M7 4H6V6H4V7H6V9H4V10H6V12H7V10H9V12H10V10H12V9H10V7H12V6H10V4H9V6H7V4ZM9 9V7H7V9H9Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),

            expression: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.70711 3.5C4.87868 3.5 4.20711 4.17157 4.20711 5V6.58579C4.20711 6.71839 4.15443 6.84557 4.06066 6.93934L3 8L4.06066 9.06066C4.15443 9.15443 4.20711 9.28161 4.20711 9.41421V11C4.20711 11.8284 4.87868 12.5 5.70711 12.5H6.20711V11.5H5.70711C5.43096 11.5 5.20711 11.2761 5.20711 11V9.41421C5.20711 9.01639 5.04907 8.63486 4.76777 8.35355L4.41421 8L4.76777 7.64645C5.04907 7.36514 5.20711 6.98361 5.20711 6.58579V5C5.20711 4.72386 5.43096 4.5 5.70711 4.5H6.20711V3.5H5.70711Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.2929 3.5C11.1213 3.5 11.7929 4.17157 11.7929 5V6.58579C11.7929 6.71839 11.8456 6.84557 11.9393 6.93934L13 8L11.9393 9.06066C11.8456 9.15443 11.7929 9.28161 11.7929 9.41421V11C11.7929 11.8284 11.1213 12.5 10.2929 12.5H9.79289V11.5H10.2929C10.569 11.5 10.7929 11.2761 10.7929 11V9.41421C10.7929 9.01639 10.9509 8.63486 11.2322 8.35355L11.5858 8L11.2322 7.64645C10.9509 7.36514 10.7929 6.98361 10.7929 6.58579V5C10.7929 4.72386 10.569 4.5 10.2929 4.5H9.79289V3.5H10.2929Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            desktop: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1 2C1 1.44772 1.44772 1 2 1H14C14.5523 1 15 1.44772 15 2V12C15 12.5523 14.5523 13 14 13H9V14H12V15H4V14H7V13H2C1.44772 13 1 12.5523 1 12V2ZM14 12V2H2V12H14Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            tablet: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3 3H13V11H3V3ZM7.5 12C7.22386 12 7 12.2239 7 12.5C7 12.7761 7.22386 13 7.5 13H8.5C8.77614 13 9 12.7761 9 12.5C9 12.2239 8.77614 12 8.5 12H7.5Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            phone: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5 2C4.44771 2 4 2.44772 4 3V13C4 13.5523 4.44771 14 5 14H11C11.5523 14 12 13.5523 12 13V3C12 2.44772 11.5523 2 11 2H5ZM11 3H5V13H11V3Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <rect x="7" y="11" width="2" height="1" rx="0.5" fill="var(--vscode-icon-foreground)" />
                </svg>
            ),
            funnel: (
                <svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M0.019 1.708L5.015 6.71L5.014 12.003H5.513L9.021 12.002L9.019 6.715L14.01 1.709L14.013 0.008L0 0L0.019 1.708ZM6.015 6.296L1.014 1.29L1.012 1.001L13.011 1.008V1.295L8.019 6.301L8.021 11.002L6.014 11.003L6.015 6.296Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            eyeClosed: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M2.45586 1.45583C2.2606 1.26057 1.94402 1.26057 1.74876 1.45583C1.5535 1.6511 1.5535 1.96768 1.74876 2.16294L9.90808 10.3223C10.1033 10.5175 10.4199 10.5175 10.6152 10.3223C10.8105 10.127 10.8105 9.81042 10.6152 9.61516L8 6.99999C8 5.89542 7.10457 4.99999 6 4.99999L4.35352 3.35349C4.85565 3.1264 5.41306 2.99999 6 2.99999C8.20914 2.99999 10 4.79085 10 6.99999H11C11 4.23856 8.76143 1.99999 6 1.99999C5.13358 1.99999 4.31862 2.22036 3.60814 2.60812L2.45586 1.45583Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <path
                        d="M2.12852 3.83561L2.84007 4.54716C2.31354 5.2245 2 6.07563 2 6.99999H1C1 5.79935 1.42317 4.69755 2.12852 3.83561Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <path
                        d="M5.03387 6.74096L4.27692 5.984C4.10097 6.28176 4 6.62908 4 6.99999C4 8.10456 4.89543 8.99999 6 8.99999C6.37091 8.99999 6.71823 8.89902 7.01599 8.72307L6.25902 7.96611C6.17641 7.98821 6.08958 7.99999 6 7.99999C5.44771 7.99999 5 7.55227 5 6.99999C5 6.91041 5.01178 6.82358 5.03387 6.74096Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            lock: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M9 4V5C9.55229 5 10 5.44772 10 6V10C10 10.5523 9.55229 11 9 11H3C2.44771 11 2 10.5523 2 10V6C2 5.44772 2.44771 5 3 5V4C3 2.34315 4.34314 1 6 1C7.65686 1 9 2.34315 9 4ZM8 4C8 2.89543 7.10457 2 6 2C4.89543 2 4 2.89543 4 4V5H8V4ZM5 7H7V10H6V8H5V7Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            noEdit: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M9.86438 3.41631L6.99388 6.2868L7.69432 6.98723L10.5648 4.11674C11.1451 3.53648 11.1451 2.5957 10.5648 2.01545L9.98456 1.43519C9.4043 0.854936 8.46352 0.854936 7.88326 1.43519L5.01278 4.30568L5.7132 5.00611L8.58369 2.13562C8.77711 1.9422 9.0907 1.9422 9.28412 2.13562L9.86438 2.71588C10.0578 2.9093 10.0578 3.22289 9.86438 3.41631Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1 8.31845L3.76653 5.55193L4.46695 6.25236L3.18626 7.53305L4.46695 8.81373L5.79958 7.48112L6.5 8.18155L3.68155 11H1V8.31845ZM3.76653 9.51416L2.48584 8.23348L1.99055 8.72876V10.0094H3.27124L3.76653 9.51416Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                    <path
                        d="M2.16968 1.46259C1.97443 1.26733 1.65784 1.26733 1.46259 1.46259C1.26732 1.65785 1.26732 1.97444 1.46259 2.1697L9.785 10.4921C9.98027 10.6874 10.2968 10.6874 10.4921 10.4921C10.6874 10.2969 10.6874 9.98028 10.4921 9.78502L2.16968 1.46259Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            editable: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.5648 2.01545C11.1451 2.5957 11.1451 3.53648 10.5648 4.11674L3.68155 11H1V8.31845L7.88326 1.43519C8.46352 0.854936 9.4043 0.854936 9.98456 1.43519L10.5648 2.01545ZM8.58369 2.13562C8.77711 1.9422 9.0907 1.9422 9.28412 2.13562L9.86438 2.71588C10.0578 2.9093 10.0578 3.30658 9.86438 3.5L4.46695 8.81373L3.18626 7.53305L8.58369 2.13562ZM3.76653 9.51416L2.48584 8.23348L1.99055 8.72876V10.0094H3.27124L3.76653 9.51416Z"
                        fill="var(--vscode-icon-foreground)"
                    />
                </svg>
            ),
            arrow: (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="9" viewBox="0 0 12 9" fill="none">
                    <path
                        d="M1 4C0.723858 4 0.5 4.22386 0.5 4.5C0.5 4.77614 0.723858 5 1 5V4ZM11.3536 4.85355C11.5488 4.65829 11.5488 4.34171 11.3536 4.14645L8.17157 0.964466C7.97631 0.769204 7.65973 0.769204 7.46447 0.964466C7.2692 1.15973 7.2692 1.47631 7.46447 1.67157L10.2929 4.5L7.46447 7.32843C7.2692 7.52369 7.2692 7.84027 7.46447 8.03553C7.65973 8.2308 7.97631 8.2308 8.17157 8.03553L11.3536 4.85355ZM1 5H11V4H1V5Z"
                        fill="var(--vscode-editor-foreground)"
                    />
                </svg>
            ),
            themePainter: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.38885 3.90404L6.5 0.792892L11.8706 6.16417C11.8782 6.17226 11.8876 6.18258 11.8984 6.195C11.9198 6.21972 11.9473 6.2535 11.9772 6.29533C12.0356 6.37703 12.1103 6.49981 12.1619 6.65439C12.2141 6.81106 12.2454 7.01014 12.2012 7.23088C12.1564 7.45531 12.0404 7.66669 11.8536 7.85356L10.7699 8.93722L10.8471 8.99285C11.1837 9.23553 11.638 9.56449 12.1082 9.9093C12.578 10.2538 13.0655 10.6155 13.4678 10.9231C13.8574 11.221 14.2 11.4929 14.3536 11.6464C14.7186 12.0114 14.875 12.5258 14.875 13C14.875 13.4742 14.7186 13.9886 14.3536 14.3536C13.9886 14.7185 13.4743 14.875 13 14.875C12.5258 14.875 12.0114 14.7185 11.6465 14.3536C11.4929 14.2 11.221 13.8573 10.9231 13.4678C10.6155 13.0654 10.2538 12.578 9.90931 12.1082C9.56451 11.638 9.23554 11.1837 8.99287 10.8471L8.93724 10.7699L7.85357 11.8536C7.6667 12.0404 7.45532 12.1563 7.23089 12.2012C7.01015 12.2454 6.81106 12.2141 6.6544 12.1618C6.49981 12.1103 6.37704 12.0355 6.29533 11.9772C6.25351 11.9473 6.21973 11.9198 6.19501 11.8984C6.18259 11.8876 6.17227 11.8782 6.16417 11.8706L6.15366 11.8606L6.14964 11.8567C6.00006 11.7089 5.73067 11.4389 5.47848 11.1861L2.05238 7.75948C2.10039 8.20274 2.1752 8.72636 2.25 9.24998C2.375 10.125 2.5 11 2.5 11.5C2.5 12.5 2 13 1.5 13C1 13 0.5 12.5 0.5 11.5C0.5 11.1487 0.573256 10.5314 0.6551 9.84175C0.80626 8.56799 0.986716 7.04736 0.789062 6.49998C0.617921 6.02603 1.95787 4.9999 3.25945 4.00316C3.30264 3.97008 3.34579 3.93704 3.38885 3.90404ZM3.91341 8.2063C4.09872 8.1988 4.29468 8.13686 4.5 7.99998C5.21523 7.52316 5.02103 6.81899 4.83888 6.15847C4.63901 5.43374 4.45364 4.76157 5.5 4.49998C6.6527 4.21181 6.65316 3.07242 6.34495 2.36216L6.5 2.20711L9.79289 5.5L5.5 9.79289L3.91341 8.2063ZM6.20711 10.5L10.5 6.2071L11.1416 6.84869L11.1427 6.84993C11.1466 6.85451 11.1543 6.8637 11.1635 6.87656C11.1832 6.90424 11.2022 6.93771 11.2132 6.97062C11.2235 7.00146 11.2234 7.02113 11.2207 7.03476C11.2187 7.04471 11.2096 7.08332 11.1465 7.14645L7.14646 11.1465C7.08333 11.2096 7.04472 11.2187 7.03477 11.2207C7.02114 11.2234 7.00147 11.2234 6.97063 11.2132C6.93772 11.2022 6.90425 11.1832 6.87657 11.1635C6.86371 11.1543 6.85452 11.1466 6.84994 11.1427L6.8487 11.1416L6.20711 10.5ZM10.0535 9.65366L9.65368 10.0535L9.80404 10.2623C10.0457 10.5975 10.373 11.0495 10.7157 11.5168C11.0587 11.9845 11.4158 12.4658 11.7175 12.8603C12.029 13.2677 12.2571 13.55 12.3536 13.6464C12.4886 13.7815 12.7243 13.875 13 13.875C13.2758 13.875 13.5114 13.7815 13.6465 13.6464C13.7815 13.5114 13.875 13.2758 13.875 13C13.875 12.7242 13.7815 12.4886 13.6465 12.3536C13.55 12.2571 13.2677 12.029 12.8604 11.7175C12.4658 11.4158 11.9845 11.0587 11.5168 10.7157C11.0495 10.373 10.5976 10.0457 10.2623 9.80403L10.0535 9.65366Z"
                        fill="var(--vscode-editor-foreground)"
                    />
                </svg>
            ),
            chevronLeft: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M9.24927 13L9.99927 12.338L6.16727 7.997L9.99527 3.662L9.24527 3L5.12527 7.666C4.95827 7.855 4.95827 8.139 5.12527 8.328L9.24927 13Z"
                        fill="var(--vscode-editor-foreground)"
                    />
                </svg>
            )
        }
    });
}
