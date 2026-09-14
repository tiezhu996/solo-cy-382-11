import { Button, Form, Input, InputNumber, Select, message } from 'antd';
import { useState } from 'react';
import { expenseApi } from '../../services/expense.api';
import type { TripMemberView } from '../../types';

interface ExpenseFormProps {
  tripId: number;
  members: TripMemberView[];
  onCreated: () => void;
}

interface FormValues {
  payerId: number;
  participantIds: number[];
  amount: number;
  description?: string;
}

/** 新增共同支出表单：金额必须大于 0、参与人不能为空由前后端共同保证。 */
export default function ExpenseForm({ tripId, members, onCreated }: ExpenseFormProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const options = members.map(member => ({ value: member.userId, label: member.nickname }));

  const submit = async (values: FormValues) => {
    setSaving(true);
    try {
      await expenseApi.create(tripId, {
        payerId: values.payerId,
        participantIds: values.participantIds,
        amount: Number(values.amount),
        description: values.description ?? ''
      });
      message.success('支出已记录');
      form.resetFields();
      onCreated();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '新增失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{ participantIds: members.map(member => member.userId) }}
    >
      <Form.Item
        name="amount"
        label="金额（元）"
        rules={[
          { required: true, message: '请输入金额' },
          { validator: (_rule, value) => (typeof value === 'number' && value > 0 ? Promise.resolve() : Promise.reject(new Error('金额必须大于零'))) }
        ]}
      >
        <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="例如 128.50" />
      </Form.Item>
      <Form.Item name="payerId" label="付款人" rules={[{ required: true, message: '请选择付款人' }]}>
        <Select options={options} placeholder="谁垫付的" />
      </Form.Item>
      <Form.Item
        name="participantIds"
        label="参与分摊成员"
        rules={[{ validator: (_rule, value: number[]) => (value && value.length > 0 ? Promise.resolve() : Promise.reject(new Error('参与人不能为空'))) }]}
      >
        <Select mode="multiple" options={options} placeholder="选择参与分摊的成员" />
      </Form.Item>
      <Form.Item name="description" label="说明">
        <Input.TextArea rows={2} placeholder="例如 晚餐 / 打车 / 民宿" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>新增支出</Button>
    </Form>
  );
}
