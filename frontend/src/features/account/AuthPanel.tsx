import { Button, Card, Form, Input, Tabs, message } from 'antd';
import { useState } from 'react';
import { authApi } from '../../services/auth.api';
import type { AuthUser } from '../../types';

interface AuthPanelProps {
  onAuthed: (user: AuthUser) => void;
}

/** 登录 / 注册面板：共同支出接口需要 JWT，先在此取得登录态。 */
export default function AuthPanel({ onAuthed }: AuthPanelProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await authApi.login(values.email.trim(), values.password);
      onAuthed(result.user);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { email: string; nickname: string; password: string }) => {
    setLoading(true);
    try {
      const result = await authApi.registerAndLogin(values.email.trim(), values.nickname.trim(), values.password);
      message.success('注册成功，已自动登录');
      onAuthed(result.user);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="expense-auth">
      <Tabs
        items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <Form layout="vertical" onFinish={handleLogin}>
                <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
                  <Input placeholder="you@example.com" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>登录</Button>
              </Form>
            )
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <Form layout="vertical" onFinish={handleRegister}>
                <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
                  <Input placeholder="you@example.com" />
                </Form.Item>
                <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                  <Input placeholder="旅行昵称" />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>注册并登录</Button>
              </Form>
            )
          }
        ]}
      />
    </Card>
  );
}
