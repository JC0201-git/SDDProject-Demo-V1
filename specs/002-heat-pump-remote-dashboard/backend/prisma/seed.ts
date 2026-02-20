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
      location: '台北工廠 A 區',
      status: 'NORMAL' as const,
      mode: 'AUTO' as const,
      currentWaterInTemp: 25.5,
      currentWaterOutTemp: 55.0,
      currentWaterTankTemp: 52.0,
      currentHighPressure: 2.8,
      currentLowPressure: 0.5,
      currentCompressorFrequency: 80.0,
      currentPowerConsumption: 12.5,
      currentHeatOutput: 52.0,
      currentCOP: 4.16,
      targetWaterTemp: 55.0,
      lastDataReceivedAt: new Date(),
    },
    {
      deviceCode: 'HP-002',
      deviceName: '熱泵設備 002（中廠）',
      location: '台中工廠 B 區',
      status: 'NORMAL' as const,
      mode: 'MANUAL' as const,
      currentWaterInTemp: 28.0,
      currentWaterOutTemp: 58.5,
      currentWaterTankTemp: 56.0,
      currentHighPressure: 3.0,
      currentLowPressure: 0.6,
      currentCompressorFrequency: 90.0,
      currentPowerConsumption: 15.2,
      currentHeatOutput: 63.0,
      currentCOP: 4.14,
      targetWaterTemp: 60.0,
      lastDataReceivedAt: new Date(),
    },
    {
      deviceCode: 'HP-003',
      deviceName: '熱泵設備 003（南廠）',
      location: '高雄工廠 C 區',
      status: 'OFFLINE' as const,
      mode: 'AUTO' as const,
      currentWaterInTemp: 0.0,
      currentWaterOutTemp: 0.0,
      currentWaterTankTemp: 0.0,
      currentHighPressure: 0.0,
      currentLowPressure: 0.0,
      currentCompressorFrequency: 0.0,
      currentPowerConsumption: 0.0,
      currentHeatOutput: 0.0,
      currentCOP: 0.0,
      targetWaterTemp: 55.0,
      lastDataReceivedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    },
  ];

  for (const device of devices) {
    const createdDevice = await prisma.heatPumpDevice.create({ data: device });
    console.log(`✅ 建立設備: ${createdDevice.deviceName}`);

    // 為每個設備建立零件
    const components = [
      {
        deviceId: createdDevice.id,
        componentName: '壓縮機',
        componentType: 'COMPRESSOR' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentName: '風扇',
        componentType: 'FAN' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentName: '循環幫浦',
        componentType: 'CIRCULATION_PUMP' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
        componentName: '膨脹閥',
        componentType: 'EXPANSION_VALVE' as const,
        status: device.status === 'OFFLINE' ? ('STOPPED' as const) : ('RUNNING' as const),
      },
      {
        deviceId: createdDevice.id,
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
  
  const notifications = [
    {
      deviceId: devices.length,
      eventType: 'DEVICE_OFFLINE' as const,
      severity: 'ERROR' as const,
      message: '設備 HP-003 已離線，請檢查網路連線',
      isRead: false,
    },
  ];

  await prisma.notification.createMany({ data: notifications });
  console.log(`✅ 建立 ${notifications.length} 則測試通知`);

  console.log('');
  console.log('✨ 種子資料執行完成！');
  console.log('');
  console.log('📝 測試帳號資訊：');
  console.log('   帳號: admin');
  console.log('   密碼: admin123');
  console.log('');
  console.log(`📊 已建立：`);
  console.log(`   - ${devices.length} 台測試設備`);
  console.log(`   - ${devices.length * 5} 個零件`);
  console.log(`   - ${thresholds.length} 個安全閾值配置`);
  console.log(`   - ${notifications.length} 則測試通知`);
}

main()
  .catch((e) => {
    console.error('❌ 種子資料執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
