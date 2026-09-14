import { DatePicker, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { tripApi, type CreateTripPayload } from '../../services/trip.api';
import type { AuthUser, TripItem } from '../../types';

interface TripCreateModalProps {
  open: boolean;
  user: AuthUser;
  onClose: () => void;
  onCreated: (trip: TripItem) => void;
}

interface FormValues {
  destination: string;
  departDate: dayjs.Dayjs;
  days: number;
  transport: string;
  companionCount: number;
}

/** 快速新建行程，创建者即行程 owner，之后仍需“加入”成为可分摊成员。 */
export default function TripCreateModal({ open, user, onClose, onCreated }: TripCreateModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const submit = async (values: FormValues) => {
    const payload: CreateTripPayload = {
      ownerId: user.id,
      destination: values.destination.trim(),
      departDate: values.departDate.format('YYYY-MM-DD'),
      days: values.days,
      transport: values.transport,
      companionCount: values.companionCount
    };
    setSaving(true);
    try {
      const trip = await tripApi.create(payload);
      message.success('行程已创建');
      form.resetFields();
      onCreated(trip);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新建行程" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={saving} okText="创建" destroyOnClose>
      <Form form={form} layout="vertical" initialValues={{ transport: '公共交通', days: 3, companionCount: 3 }}>
        <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请输入目的地' }]}>
          <Input placeholder="例如 大理" />
        </Form.Item>
        <Form.Item name="departDate" label="出发时间" rules={[{ required: true, message: '请选择出发时间' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="days" label="行程天数" rules={[{ required: true, message: '请输入天数' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="transport" label="出行方式">
          <Select options={['自驾', '公共交通', '徒步'].map(value => ({ value, label: value }))} />
        </Form.Item>
        <Form.Item name="companionCount" label="期望旅伴人数">
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
