import Parameters, { Value } from 'sap/ui/core/theming/Parameters';

/**
 * Fetches legend color values from SAP UI theming parameters.
 *
 * @param legendNames - A legend name or array of legend names to fetch color values for.
 * @returns {Promise<Value>} Promise resolving to the legend color values.
 */
function fetchLegendColor(legendNames: string | string[]): Promise<Value> {
    return new Promise((resolve) => {
        let param = Parameters.get({
            name: Array.isArray(legendNames) ? legendNames : [legendNames],
            callback: resolve
        });

        if (param) {
            resolve(param);
        }
    });
}

/**
 * Generates the SVG markup string for the left anvil background.
 * @param colors - An object containing color values used in the SVG fills.
 * @returns {string} SVG markup string for the left anvil.
 */
function getLeftAnvilSVG(colors: Record<string, string>): string {
    return `<svg width="340" height="214" viewBox="43 13 340 214" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity="0.2" filter="url(#filter0_d_1262_17135)">
            <path opacity="0.4" d="M159.502 140.863L47.0926 131.028L43.2209 119.479L75.3734 25.4827L292.633 33.2161L296.507 44.8294L159.502 140.863Z" fill="${colors.sapContent_Illustrative_Color13}"/>
            <path d="M43.2212 119.414L71.502 13.8689L292.636 33.2156L155.631 129.249L43.2212 119.414Z" fill="${colors.sapContent_Illustrative_Color2}"/>
            <path d="M292.628 33.2325L155.634 129.255L151.191 128.81L290.341 33.9103L71.1123 13.4668L292.628 33.2325Z" fill="${colors.sapContent_Illustrative_Color7}"/>
        </g>
        <defs>
            <filter id="filter0_d_1262_17135" x="0.207756" y="-10.0332" width="339.312" height="223.687" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="29.7782"/>
                <feGaussianBlur stdDeviation="21.5065"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.0784314 0 0 0 0 0.290196 0 0 0 1 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1262_17135"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1262_17135" result="shape"/>
            </filter>
        </defs>
    </svg>`;
}

/**
 * Generates the SVG markup string for the right anvil background.
 * @param colors - An object containing color values used in the SVG fills.
 * @returns {string} SVG markup string for the right anvil.
 */
function getRightAnvilSVG(colors: Record<string, string>): string {
    return `<svg width="330" height="214" viewBox="0 10 330 214" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_d_1262_17169)">
            <path d="M191.301 139.688L77.8977 131.95L73.7757 120.393L104.346 25.1038L323.309 28.7048L327.436 40.3266L191.301 139.688Z" fill="${colors.sapContent_Illustrative_Color22}"/>
            <path d="M73.7749 120.326L100.224 13.48L323.313 28.7027L187.179 128.064L73.7749 120.326Z" fill="${colors.sapContent_Illustrative_Color13}"/>
            <path d="M187.178 128.064L73.775 120.325L100.224 13.48L323.313 28.7028L187.178 128.064ZM75.0129 119.423L187.006 127.065L320.665 29.5092L100.981 14.5188L75.0129 119.423Z" fill="url(#paint0_linear_1262_17169)"/>
        </g>
        <g filter="url(#filter1_d_1262_17169)">
            <path opacity="0.4" d="M96.9832 112.065L19.8089 105.313L14.207 97.0861L33.6331 24.6364L185.433 37.9512L191.043 46.1338L96.9832 112.065Z" fill="${colors.sapContent_Illustrative_Color2}"/>
            <path opacity="0.4" d="M184.11 38.2953L91.3032 103.347L14.8336 96.657L33.9908 25.1616L184.11 38.2953Z" fill="${colors.sapContent_Illustrative_Color2}" stroke="url(#paint1_linear_1262_17169)"/>
            <path opacity="0.3" d="M37.0138 99.1021L126.91 34.2785L115.504 33.271L24.1765 97.991L37.0138 99.1021Z" fill="${colors.sapContent_Illustrative_Color2}"/>
        </g>
        <defs>
            <filter id="filter0_d_1262_17169" x="30.4457" y="0.148073" width="340.319" height="212.865" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="29.9968"/>
                <feGaussianBlur stdDeviation="21.6643"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.0784314 0 0 0 0 0.290196 0 0 0 1 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1262_17169"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1262_17169" result="shape"/>
            </filter>
            <filter id="filter1_d_1262_17169" x="0.594014" y="13.7454" width="204.061" height="114.654" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="2.72241"/>
                <feGaussianBlur stdDeviation="6.80602"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.0784314 0 0 0 0 0.290196 0 0 0 1 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1262_17169"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1262_17169" result="shape"/>
            </filter>
            <linearGradient id="paint0_linear_1262_17169" x1="211.768" y1="21.0914" x2="204.389" y2="129.238" gradientUnits="userSpaceOnUse">
                <stop stop-color="${colors.sapContent_Illustrative_Color2}"/>
                <stop offset="1" stop-color="${colors.sapContent_Illustrative_Color2}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="paint1_linear_1262_17169" x1="109.531" y1="31.2762" x2="103.092" y2="104.873" gradientUnits="userSpaceOnUse">
                <stop stop-color="${colors.sapContent_Illustrative_Color7}"/>
                <stop offset="1" stop-color="${colors.sapContent_Illustrative_Color7}" stop-opacity="0"/>
            </linearGradient>
        </defs>
    </svg>`;
}

/**
 * Generates the SVG markup string for the overlay background.
 * @param backgroundColor - The background color used for the overlay fill and stroke.
 * @returns {string} SVG markup string for the overlay.
 */
function getOverlaySVG(backgroundColor: string): string {
    return `<svg width="720" height="126" viewBox="0 0 720 126" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.85" d="M0 0H720V126H0V0Z" fill="url(#paint0_linear_4544_80064)" stroke="${backgroundColor}"/>
        <defs>
            <linearGradient id="paint0_linear_4544_80064" x1="0" y1="63" x2="720" y2="63" gradientUnits="userSpaceOnUse">
                <stop stop-color="${backgroundColor}"/>
                <stop offset="0.75" stop-color="${backgroundColor}" stop-opacity="0.6"/>
                <stop offset="1" stop-color="${backgroundColor}"/>
            </linearGradient>
        </defs>
    </svg>`;
}

/**
 * Generates the SVG markup string for the underlay background.
 * @param color14 - The first color used in the linear gradient fill.
 * @param color19 - The second color used in the linear gradient fill.
 * @returns {string} SVG markup string for the underlay.
 */
function getUnderlaySVG(color14: string, color19: string): string {
    return `<svg width="720" height="126" viewBox="0 0 720 126" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H720V126H0V0Z" fill="url(#paint0_linear_4544_80065)"/>
        <defs>
            <linearGradient id="paint0_linear_4544_80065" x1="0" y1="63" x2="720" y2="63" gradientUnits="userSpaceOnUse">
                <stop stop-color="${color14}"/>
                <stop offset="1" stop-color="${color19}"/>
            </linearGradient>
        </defs>
    </svg>`;
}

/**
 * Encodes a SVG string to be safely used in a URL.
 * It escapes quotes and special characters as per URI encoding rules.
 *
 * @param svg - The raw SVG markup string.
 * @returns {string} The encoded SVG string ready for use in CSS URLs.
 */
function encodeSVG(svg: string): string {
    return encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
}

/**
 * Constructs and applies the background style on the `.salutationBar` element
 * using dynamically generated and encoded SVG backgrounds based on device type.
 *
 * @param hideLeftAnvil - A boolean flag indicating whether to hide the left anvil SVG.
 */
export async function getSalutationBarBackground(hideLeftAnvil: boolean) {
    const colors = (await fetchLegendColor([
        'sapShell_Category_1_Background',
        'sapContent_Illustrative_Color14',
        'sapContent_Illustrative_Color19',
        'sapContent_Illustrative_Color2',
        'sapContent_Illustrative_Color13',
        'sapContent_Illustrative_Color7',
        'sapContent_Illustrative_Color22'
    ])) as Record<string, string>;

    const leftAnvil = getLeftAnvilSVG(colors);
    const rightAnvil = getRightAnvilSVG(colors);
    const overlay = getOverlaySVG(colors.sapShell_Category_1_Background);
    const underlay = getUnderlaySVG(colors.sapContent_Illustrative_Color14, colors.sapContent_Illustrative_Color19);

    const bgCombined = !hideLeftAnvil
        ? [
              `url("data:image/svg+xml,${encodeSVG(leftAnvil)}") left -47.89px top -32.85px no-repeat`,
              `url("data:image/svg+xml,${encodeSVG(overlay)}")`,
              `url("data:image/svg+xml,${encodeSVG(rightAnvil)}") right 80px top -8px no-repeat`,
              `url("data:image/svg+xml,${encodeSVG(underlay)}")`
          ].join(', ')
        : [
              `url("data:image/svg+xml,${encodeSVG(overlay)}")`,
              `url("data:image/svg+xml,${encodeSVG(rightAnvil)}") right 22px top -5px no-repeat`,
              `url("data:image/svg+xml,${encodeSVG(underlay)}")`
          ].join(', ');
    return bgCombined;
}
