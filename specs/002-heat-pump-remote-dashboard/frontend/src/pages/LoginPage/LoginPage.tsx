import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/api/auth';
import { useAuthStore } from '../../store/authStore';
import './LoginPage.css';

interface LoginFormValues {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [lockMessage, setLockMessage] = useState('');
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    setLockMessage('');

    try {
      const userData = await login(values.username, values.password);
      
      // 儲存使用者資訊到 store
      setUser({
        userId: userData.userId,
        username: userData.username,
        displayName: userData.displayName,
        sessionExpiresAt: userData.sessionExpiresAt,
      });

      message.success('登入成功！');
      
      // 導向儀表板
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || '登入失敗，請檢查帳號密碼';
      
      message.error(errorMessage);
      
      // 記錄失敗次數
      const newFailedCount = failedCount + 1;
      setFailedCount(newFailedCount);

      // 連續失敗 3 次顯示鎖定提示
      if (newFailedCount >= 3) {
        setLockMessage('連續登入失敗 3 次，帳號已鎖定 5 分鐘，請稍後再試。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card className="login-card" title="熱泵遠端監控系統" bordered={false}>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          {lockMessage && (
            <Alert
              message="帳號已鎖定"
              description={lockMessage}
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Form.Item
            name="username"
            rules={[
              { required: true, message: '請輸入使用者帳號' },
              { min: 3, message: '帳號至少需要 3 個字元' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="使用者帳號"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '請輸入密碼' },
              { min: 6, message: '密碼至少需要 6 個字元' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密碼"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              disabled={!!lockMessage}
            >
              登入
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <p>預設帳號：admin</p>
          <p>預設密碼：admin123</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
