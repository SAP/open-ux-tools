import React from 'react';

export interface AlertOutlineIconProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    height?: number;
}

// MDI alert-outline icon component
export const AlertOutlineIcon: React.FC<AlertOutlineIconProps> = ({
    className = 'alert-outline-icon',
    style = {},
    width = 14,
    height = 14
}) => (
    <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={width}
        height={height}
        style={style}>
        <title>alert-outline</title>
        <path d="M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16" fill="currentColor" />
    </svg>
);

export default AlertOutlineIcon;
