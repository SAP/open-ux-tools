export const enum DeviceType {
    Desktop = 'desktop',
    Tablet = 'tablet',
    Phone = 'phone'
}

export const DEVICE_TYPES = [DeviceType.Desktop, DeviceType.Tablet, DeviceType.Phone];

/**
 * Device screen width in pixels
 */
export const DEVICE_WIDTH_MAP = new Map<DeviceType, number>([
    [DeviceType.Desktop, 1200],
    [DeviceType.Tablet, 720],
    [DeviceType.Phone, 480]
]);

export const DEFAULT_DEVICE_WIDTH = 1200;
