export const mqttConfig = {
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  clientId: process.env.MQTT_CLIENT_ID || 'heat-pump-backend',
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  qos: parseInt(process.env.MQTT_QOS || '1', 10) as 0 | 1 | 2,

  // Topic patterns
  topics: {
    telemetry: 'devices/+/telemetry',
    commandAck: 'devices/+/command-ack',
    status: 'devices/+/status',
    command: (deviceCode: string) => `devices/${deviceCode}/commands`,
  },

  // Connection options
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  keepalive: 60,
  clean: true,

  // Will message (Last Will and Testament)
  will: {
    topic: 'server/status',
    payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
    qos: 1 as 0 | 1 | 2,
    retain: true,
  },
};

export type MqttConfig = typeof mqttConfig;
