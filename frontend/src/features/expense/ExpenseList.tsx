import { Empty, List, Tag, Typography } from 'antd';
import type { ExpenseView, TripMemberView } from '../../types';

interface ExpenseListProps {
  expenses: ExpenseView[];
  members: TripMemberView[];
}

const money = (value: number): string => value.toFixed(2);

/** 行程支出明细列表：展示付款人、金额、说明与每位参与人的分摊额。 */
export default function ExpenseList({ expenses, members }: ExpenseListProps) {
  const nicknameOf = new Map(members.map(member => [member.userId, member.nickname]));
  const nameOf = (userId: number): string => nicknameOf.get(userId) ?? `用户${userId}`;

  if (expenses.length === 0) return <Empty description="还没有共同支出，先新增一笔吧" />;

  return (
    <List
      dataSource={expenses}
      renderItem={expense => (
        <List.Item>
          <List.Item.Meta
            title={
              <span>
                <Typography.Text strong>¥{money(expense.amount)}</Typography.Text>
                <Tag color="blue" className="expense-tag">{nameOf(expense.payerId)} 垫付</Tag>
                {expense.description ? <Typography.Text type="secondary">{expense.description}</Typography.Text> : null}
              </span>
            }
            description={
              <span>
                {expense.participants.map(p => `${nameOf(p.userId)} ¥${money(p.shareAmount)}`).join(' ＋ ')}
              </span>
            }
          />
        </List.Item>
      )}
    />
  );
}
