import { PlaybackDevice } from './types';
import { eventBus } from '../events';

export class DeviceDiscoveryService {
    private static instance: DeviceDiscoveryService;
    private devices: Map<string, PlaybackDevice> = new Map();

    private constructor() {}

    public static getInstance(): DeviceDiscoveryService {
        if (!DeviceDiscoveryService.instance) {
            DeviceDiscoveryService.instance = new DeviceDiscoveryService();
        }
        return DeviceDiscoveryService.instance;
    }

    public registerDevice(device: PlaybackDevice) {
        this.devices.set(device.id, device);
        this.notifyChange();
    }

    public removeDevice(deviceId: string) {
        if (this.devices.delete(deviceId)) {
            this.notifyChange();
        }
    }

    public getDevices(): PlaybackDevice[] {
        return Array.from(this.devices.values());
    }

    private notifyChange() {
        eventBus.emit('DEVICES_CHANGED', this.getDevices());
    }

    public async connect(deviceId: string) {
        const device = this.devices.get(deviceId);
        if (!device || !device.provider) throw new Error('Device not found or has no provider');

        device.state = 'connecting';
        this.notifyChange();

        try {
            await device.provider.connect(device);
            device.state = 'connected';
            this.notifyChange();
        } catch (error) {
            device.state = 'available';
            this.notifyChange();
            throw error;
        }
    }
}

export const deviceDiscoveryService = DeviceDiscoveryService.getInstance();
