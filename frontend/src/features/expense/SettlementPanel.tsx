import { Alert, Card, Empty, Statistic, Table, Tag } from 'antd';
import type { SettlementView } from '../../types';

interface SettlementPanelProps {
  settlement: SettlementView;
}

const money = (value: number): string => `¥${value.toFixed(2)}`;

/** 结算结果：每人已付 / 应付 / 净额，以及最简收付款建议。 */
export default function SettlementPanel({ settlement }: SettlementPanelProps) {
  return (
    <div className="settlement">
      <Statistic title="共同支出合计" value={settlement.totalAmount} precision={2} prefix="¥" />

      <Table
        className="settlement-table"
        size="small"
        rowKey="userId"
        pagination={false}
        dataSource={settlement.perMember}
        columns={[
          { title: '成员', dataIndex: 'nickname' },
          { title: '已付', dataIndex: 'paid', align: 'right', render: (value: number) => money(value) },
          { title: '应付', dataIndex: 'owed', align: 'right', render: (value: number) => money(value) },
          {
            title: '最终收付',
            dataIndex: 'net',
            align: 'right',
            render: (value: number) =>
              value > 0 ? <Tag color="green">应收 {money(value)}</Tag> : value < 0 ? <Tag color="red">应付 {money(-value)}</Tag> : <Tag>已结清</Tag>
          }
        ]}
      />

      <Card size="small" title="建议收付款" className="settlement-transfers">
        {settlement.transfers.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="互不拖欠，已结清" />
        ) : (
          settlement.transfers.map((transfer, index) => (
            <Alert
              key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`}
              className="transfer-row"
              type="info"
              showIcon
              message={
                <span>
                  <b>{transfer.fromNickname}</b> 支付给 <b>{transfer.toNickname}</b>：<b>{money(transfer.amount)}</b>
                </span>
              }
            />
          ))
        )}
      </Card>
    </div>
  );
}
