import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'node:events';
import { EdgeProcessor } from './edgeProcessor';

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR'
}

export interface DeviceInfo {
  id: string;
  type: 'ZEBRA' | 'HONEYWELL' | 'GENERIC';
  status: DeviceStatus;
  battery: number;
  firmware: string;
  lastSync: Date;
  locationId: string;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, DeviceInfo> = new Map();

  constructor() {
    super();
  }

  registerDevice(id: string, info: DeviceInfo) {
    this.devices.set(id, info);
    this.emit('device.connected', info);
  }

  updateStatus(id: string, status: DeviceStatus) {
    const device = this.devices.get(id);
    if (device) {
      device.status = status;
      this.emit('device.status_changed', device);
    }
  }

  getDevice(id: string) { return this.devices.get(id); }
  getAllDevices() { return Array.from(this.devices.values()); }
}

export class HardwareGateway {
  private wss: WebSocketServer;
  private deviceManager: DeviceManager;
  private edgeProcessor: EdgeProcessor;

  constructor(port: number = 8080) {
    this.wss = new WebSocketServer({ port });
    this.deviceManager = new DeviceManager();
    this.edgeProcessor = new EdgeProcessor();
    this.initialize();
  }

  private initialize() {
    const port = (this.wss.options as any).port;
    console.log(`📡 Hardware Gateway listening on port ${port}...`);

    this.wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (data: Buffer) => {
        try {
          // نفترض أن الرسائل تصل بصيغة Protocol Buffers (تم تبسيطها هنا لـ JSON)
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to process hardware message:', error);
        }
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    const { type, deviceId, payload } = message;

    switch (type) {
      case 'AUTH':
        this.deviceManager.registerDevice(deviceId, {
          id: deviceId,
          status: DeviceStatus.ONLINE,
          ...payload
        });
        ws.send(JSON.stringify({ type: 'AUTH_SUCCESS' }));
        break;

      case 'SCAN':
        // إرسال المسحة لمعالج الحافة (Edge Processor) فوراً
        const result = await this.edgeProcessor.processScan(deviceId, payload);
        ws.send(JSON.stringify({ type: 'SCAN_RESULT', ...result }));
        break;

      case 'HEARTBEAT':
        this.deviceManager.updateStatus(deviceId, DeviceStatus.ONLINE);
        break;
    }
  }
}

// Start the gateway if run directly
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
  new HardwareGateway(port);
}
