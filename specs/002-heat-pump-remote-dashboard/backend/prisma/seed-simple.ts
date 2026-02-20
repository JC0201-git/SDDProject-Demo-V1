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
      parameter: 'EXHAUST_TEMPERATURE',
      upperLimit: 120.0,
      lowerLimit: 30.0,
      unit: '°C',
      severity: 'WARNING',
    },
    {
      parameter: 'WATER_TANK_TEMPERATURE',
      upperLimit: 75.0,
      lowerLimit: 15.0,
      unit: '°C',
      severity: 'WARNING',
    },
    {
      parameter: 'HIGH_PRESSURE',
      upperLimit: 3.5,
      lowerLimit: 1.0,
      unit: 'MPa',
      severity: 'ERROR',
    },
    {
      parameter: 'LOW_PRESSURE',
      upperLimit: 1.0,
      lowerLimit: 0.2,
      unit: 'MPa',
      severity: 'ERROR',
    },
    {
      parameter: 'COMPRESSOR_FREQUENCY',
      upperLimit: 120.0,
      lowerLimit: 20.0,
      unit: 'Hz',
      severity: 'WARNING',
    },
  ];

  for (const threshold of thresholds) {
    await prisma.safetyThreshold.create({ data: threshold as any });
  }

  console.log(`✅ 建立 ${thresholds.length} 個安全閾值配置`);

  // 3. 建立測試設備
  console.log('🔧 建立測試設備...');
  
  const device1 = await prisma.heatPumpDevice.create({
    data: {
      deviceCode: 'HP-001',
      deviceName: 'A站熱泵',
      status: 'NORMAL',
      operationMode: 'AUTO',
      compressorFrequency: 80.0,
      exhaustTemperature: 85.5,
      suctionTemperature: 15.2,
      highPressure: 2.8,
      lowPressure: 0.5,
      waterTankTemperature: 52.0,
      waterInTemperature: 25.5,
      waterOutTemperature: 55.0,
      targetWaterTemperature: 55.0,
      instantPowerConsumption: 12.5,
      instantHeatOutput: 52.0,
      currentCOP: 4.16,
      lastDataReceivedAt: new Date(),
    },
  });

  const device2 = await prisma.heatPumpDevice.create({
    data: {
      deviceCode: 'HP-002',
      deviceName: 'B站熱泵',
      status: 'NORMAL',
      operationMode: 'AUTO',
      compressorFrequency: 75.0,
      exhaustTemperature: 82.0,
      suctionTemperature: 14.5,
      highPressure: 2.6,
      lowPressure: 0.48,
      waterTankTemperature: 50.0,
      waterInTemperature: 24.0,
      waterOutTemperature: 53.0,
      targetWaterTemperature: 55.0,
      instantPowerConsumption: 11.8,
      instantHeatOutput: 49.0,
      currentCOP: 4.15,
      lastDataReceivedAt: new Date(),
    },
  });

  const device3 = await prisma.heatPumpDevice.create({
    data: {
      deviceCode: 'HP-003',
      deviceName: 'C站熱泵',
      status: 'OFFLINE',
      operationMode: 'AUTO',
    },
  });

  console.log(`✅ 建立 3 台測試設備`);

  console.log('✨ 種子資料建立完成！');
}

main()
  .catch((e) => {
    console.error('❌ 種子資料執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
