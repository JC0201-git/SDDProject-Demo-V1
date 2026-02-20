import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始執行種子資料...');

  // 清空現有資料（開發環境專用）
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  清空現有資料...');
    await prisma.controlCommand.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.telemetryData.deleteMany();
    await prisma.component.deleteMany();
    await prisma.heatPumpDevice.deleteMany();
    await prisma.safetyThreshold.deleteMany();
    await prisma.user.deleteMany();
  }

  // 1. 建立管理員帳號
  console.log('👤 建立管理員帳號...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      displayName: '系統管理員',
      passwordHash: hashedPassword,
      loginFailedCount: 0,
    },
  });

  console.log(`✅ 建立管理員帳號: ${admin.username}`);

  // 2. 建立安全閾值配置
  console.log('⚙️  建立安全閾值配置...');

  const thresholds = [
    {
      parameter: 'EXHAUST_TEMPERATURE' as const,
      upperLimit: 120.0,
      lowerLimit: 30.0,
      unit: '°C',
      severity: 'WARNING' as const,
    },
    {
      parameter: 'WATER_TANK_TEMPERATURE' as const,
      upperLimit: 75.0,
      lowerLimit: 15.0,
      unit: '°C',
      severity: 'WARNING' as const,
    },
    {
      parameter: 'HIGH_PRESSURE' as const,
      upperLimit: 3.5,
      lowerLimit: 1.0,
      unit: 'MPa',
      severity: 'ERROR' as const,
    },
    {
      parameter: 'LOW_PRESSURE' as const,
      upperLimit: 1.0,
      lowerLimit: 0.2,
      unit: 'MPa',
      severity: 'ERROR' as const,
    },
    {
      parameter: 'COMPRESSOR_FREQUENCY' as const,
      upperLimit: 120.0,
      lowerLimit: 20.0,
      unit: 'Hz',
      severity: 'WARNING' as const,
    },
  ];

  for (const threshold of thresholds) {
    await prisma.safetyThreshold.create({ data: threshold });
  }

  console.log(`✅ 建立 ${thresholds.length} 個安全閾值配置`);

  // 3. 建立測試設備
  console.log('🔧 建立測試設備...');

  const devices = [
    {
      deviceCode: 'HP-001',
      deviceName: '熱泵設備 001（北廠）',
      status: 'NORMAL' as const,
      operationMode: 'AUTO' as const,
      waterInTemperature: 25.5,
      waterOutTemperature: 55.0,
      waterTankTemperature: 52.0,
      highPressure: 2.8,
      lowPressure: 0.5,
      compressorFrequency: 80.0,
      instantPowerConsumption: 12.5,
      instantHeatOutput: 52.0,
      currentCOP: 4.16,
      targetWaterTemperature: 55.0,
      lastDataReceivedAt: new Date(),
    },
    {
      deviceCode: 'HP-002',
      deviceName: '熱泵設備 002（中廠）',
      status: 'NORMAL' as const,
      operationMode: 'MANUAL' as const,
      waterInTemperature: 28.0,
      waterOutTemperature: 58.5,
      waterTankTemperature: 56.0,
      highPressure: 3.0,
      lowPressure: 0.6,
      compressorFrequency: 90.0,
      instantPowerConsumption: 15.2,
      instantHeatOutput: 63.0,
      currentCOP: 4.14,
      targetWaterTemperature: 60.0,
      lastDataReceivedAt: new Date(),
    },
    {
      deviceCode: 'HP-003',
      deviceName: '熱泵設備 003（南廠）',
      status: 'OFFLINE' as const,
      operationMode: 'AUTO' as const,
      waterInTemperature: 0.0,
      waterOutTemperature: 0.0,
      waterTankTemperature: 0.0,
      highPressure: 0.0,
      lowPressure: 0.0,
      compressorFrequency: 0.0,
      instantPowerConsumption: 0.0,
      instantHeatOutput: 0.0,
      currentCOP: 0.0,
      targetWaterTemperature: 55.0,
      lastDataReceivedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    },
  ];

  const createdDevices: { id: number; deviceName: string; deviceCode: string; status: string }[] = [];

  for (const device of devices) {
    const createdDevice = await prisma.heatPumpDevice.create({ data: device });
    console.log(`✅ 建立設備: ${createdDevice.deviceName}`);
    createdDevices.push({
      id: createdDevice.id,
      deviceName: createdDevice.deviceName,
      deviceCode: createdDevice.deviceCode,
      status: createdDevice.status,
    });

    // 為每個設備建立零件
    const components = [
      {
        deviceId: createdDevice.id,
        componentCode: `${createdDevice.deviceCode}-COMPRESSOR`,
        componentName: '壓縮機',
        componentType: 'COMPRESSOR' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentCode: `${createdDevice.deviceCode}-FAN`,
        componentName: '風扇',
        componentType: 'FAN' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentCode: `${createdDevice.deviceCode}-PUMP`,
        componentName: '循環幫浦',
        componentType: 'CIRCULATION_PUMP' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentCode: `${createdDevice.deviceCode}-VALVE`,
        componentName: '膨脹閥',
        componentType: 'EXPANSION_VALVE' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentCode: `${createdDevice.deviceCode}-TANK`,
        componentName: '水箱',
        componentType: 'WATER_TANK' as const,
        status: 'RUNNING' as const,
      },
    ];

    await prisma.component.createMany({ data: components });
    console.log(`  └─ 建立 ${components.length} 個零件`);
  }

  // 4. 建立測試通知
  console.log('📬 建立測試通知...');

  const offlineDevice = createdDevices.find(d => d.status === 'OFFLINE');
  if (offlineDevice) {
    await prisma.notification.create({
      data: {
        deviceId: offlineDevice.id,
        eventType: 'DEVICE_OFFLINE' as const,
        severity: 'ERROR' as const,
        title: `設備離線警告：${offlineDevice.deviceName}`,
        description: `設備 ${offlineDevice.deviceCode} 已離線，請檢查網路連線及設備電源狀態`,
        isRead: false,
      },
    });
    console.log('✅ 建立 1 則測試通知');
  }

  console.log('');
  console.log('✨ 種子資料執行完成！');
  console.log('');
  console.log('📝 測試帳號資訊：');
  console.log('   帳號: admin');
  console.log('   密碼: admin123');
  console.log('');
  console.log(`📊 已建立：`);
  console.log(`   - ${createdDevices.length} 台測試設備`);
  console.log(`   - ${createdDevices.length * 5} 個零件`);
  console.log(`   - ${thresholds.length} 個安全閾值配置`);
  console.log(`   - 1 則測試通知`);
}

main()
  .catch((e) => {
    console.error('❌ 種子資料執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
