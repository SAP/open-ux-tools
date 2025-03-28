import React, { useEffect, useRef, useState } from 'react';
import styles from './GenericChange.module.scss';

interface LongTextProps {
    longText: string;
    label?: string;
}

const LongText: React.FC<LongTextProps> = ({ longText, label }) => {
    const textRef = useRef<HTMLDivElement>(null);
    const [firstLine, setFirstLine] = useState<string>('');
    const [secondLine, setSecondLine] = useState<string>('');
    const finalText = label ? `${label}: ${longText}` : longText;

    useEffect(() => {
        const applyStyles = (div: HTMLDivElement) => {
            div.classList.add(styles.genericValue);
            div.style.width = textRef.current?.offsetWidth + 'px';
            div.style.lineHeight = getComputedStyle(textRef.current!).lineHeight;
            div.style.fontSize = getComputedStyle(textRef.current!).fontSize;
            div.style.fontFamily = getComputedStyle(textRef.current!).fontFamily;
            div.style.fontWeight = getComputedStyle(textRef.current!).fontWeight;
        };
        const truncateText = (text: string) => {
            const virtualDiv1 = document.createElement('div');
            const virtualDiv2 = document.createElement('div');
            applyStyles(virtualDiv1);
            applyStyles(virtualDiv2);
            document.body.appendChild(virtualDiv2);
            document.body.appendChild(virtualDiv1);

            const lineHeight = isNaN(parseFloat(getComputedStyle(textRef.current!).lineHeight))
                ? 0
                : parseFloat(getComputedStyle(textRef.current!).lineHeight);

            const labelLength = label ? `${label}: `.length : 0;
            let totalCharInLine1 = 0;
            let totalCharInLine2 = 0;
            const midpoint = Math.floor(text.length / 2);
            // Find the number of characters that fit in the first line
            let part1done = false;
            let part2done = false;
            virtualDiv1.textContent = text;
            // If the text fits in one line, return it without ellipses
            if (virtualDiv1.scrollHeight <= lineHeight) {
                document.body.removeChild(virtualDiv1);
                document.body.removeChild(virtualDiv2);
                return { firstLine: text, secondLine: '' };
            }
            virtualDiv1.textContent = '';
            for (let i = 1, j = text.length - 1; i < midpoint || j > midpoint; i++, j--) {
                if (part1done && part2done) {
                    break;
                }
                if (i < midpoint && !part1done) {
                    virtualDiv1.textContent = text.slice(0, i);
                    if (virtualDiv1.scrollHeight > lineHeight) {
                        part1done = true;
                    }
                    totalCharInLine1 += 1;
                }
                if (j > midpoint && !part2done) {
                    virtualDiv2.textContent = text.slice(j - text.length);
                    if (virtualDiv2.scrollHeight > lineHeight) {
                        part2done = true;
                    }
                    totalCharInLine2 += 1;
                }
            }

            document.body.removeChild(virtualDiv1);
            document.body.removeChild(virtualDiv2);

            const totalTextLength = text.length - labelLength;
            const totalCharsThatFitInTwoLines = totalCharInLine1 + totalCharInLine2 - labelLength;
            const charsToTruncate = text.length - labelLength - totalCharsThatFitInTwoLines + 3 + 3; // 3 for ellipses and 3 for Math.floor

            // Calculate the center and remove characters proportionally
            const center = Math.floor(totalTextLength / 2);
            const firstPart =
                text.slice(0, labelLength) + text.slice(labelLength, center - Math.floor(charsToTruncate / 2));
            const secondPart = text.slice(center + Math.floor(charsToTruncate / 2));
            const truncatedText = firstPart + '...' + secondPart;

            return {
                firstLine: truncatedText.slice(0, totalCharInLine1 - 1).trim(),
                secondLine: truncatedText.slice(totalCharInLine1 - 1).trim()
            };
        };

        const { firstLine, secondLine } = truncateText(finalText);
        setFirstLine(firstLine);
        setSecondLine(secondLine);
    }, [longText, label]);

    return (
        <div className={styles.genericValue} title={finalText} ref={textRef}>
            <div className={styles.line}>{firstLine}</div>
            {secondLine && <div className={styles.line}>{secondLine}</div>}
        </div>
    );
};

export default LongText;
