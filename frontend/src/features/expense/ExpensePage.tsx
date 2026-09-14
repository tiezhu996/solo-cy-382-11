import { Button, Card, Col, Empty, Layout, Result, Row, Select, Space, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { tripApi } from '../../services/trip.api';
import { expenseApi } from '../../services/expense.api';
import type { AuthUser, ExpenseView, SettlementView, TripItem, TripMemberView } from '../../types';
import AuthPanel from '../account/AuthPanel';
import { sessionStore } from '../../services/session';
import { authApi } from '../../services/auth.api';
import TripCreateModal from '../trip/TripCreateModal';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import SettlementPanel from './SettlementPanel';

const { Text } = Typography;

/**
 * 行程共同支出分账页：
 * 登录 → 选择/创建行程 → 加入成为成员 → 新增支出 / 查看明细与结算。
 * 所有数据按行程隔离，非成员无法读取或修改。
 */
export default function ExpensePage() {
  const [user, setUser] = useState<AuthUser | null>(() => sessionStore.get());
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [members, setMembers] = useState<TripMemberView[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoadingTrips(true);
    try {
      const list = await tripApi.list();
      setTrips(list);
      setTripId(current => current ?? list[0]?.id ?? null);
    } finally {
      setLoadingTrips(false);
    }
  }, []);

  useEffect(() => {
    if (user) void loadTrips();
  }, [user, loadTrips]);

  // 切换行程后尝试读取成员：成功即成员，403 表示尚未加入。
  useEffect(() => {
    if (!user || tripId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await tripApi.members(tripId);
        if (cancelled) return;
        setMembers(list);
        setIsMember(list.some(member => member.userId === user.id));
      } catch {
        if (cancelled) return;
        setMembers([]);
        setIsMember(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tripId]);

  const loadExpenseData = useCallback(async () => {
    if (tripId === null || !isMember) return;
    try {
      const [list, result] = await Promise.all([expenseApi.list(tripId), expenseApi.settlement(tripId)]);
      setExpenses(list);
      setSettlement(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载支出失败');
    }
  }, [tripId, isMember]);

  useEffect(() => {
    setExpenses([]);
    setSettlement(null);
    if (isMember) void loadExpenseData();
  }, [isMember, loadExpenseData]);

  const handleJoin = async () => {
    if (tripId === null) return;
    try {
      await tripApi.join(tripId);
      message.success('已加入行程');
      const list = await tripApi.members(tripId);
      setMembers(list);
      setIsMember(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加入失败');
    }
  };

  const handleLogout = () => {
    authApi.logout();
    sessionStore.clear();
    setUser(null);
    setTripId(null);
    setMembers([]);
    setIsMember(false);
  };

  if (!user) {
    return (
      <Layout className="expense-page">
        <AuthPanel onAuthed={setUser} />
      </Layout>
    );
  }

  return (
    <Layout className="expense-page">
      <div className="expense-header">
        <Space wrap>
          <Text strong>当前用户：{user.nickname}</Text>
          <Button size="small" onClick={handleLogout}>退出登录</Button>
        </Space>
      </div>

      <Card
        className="trip-picker"
        title="选择行程"
        extra={
          <Space>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadTrips()}>刷新行程</Button>
            <Button size="small" type="primary" onClick={() => setCreateOpen(true)}>新建行程</Button>
          </Space>
        }
      >
        {trips.length === 0 && !loadingTrips ? (
          <Empty description="暂无行程，点击右上角新建" />
        ) : (
          <Space wrap>
            <Select
              style={{ minWidth: 280 }}
              placeholder="选择行程"
              loading={loadingTrips}
              value={tripId}
              onChange={setTripId}
              options={trips.map(trip => ({ value: trip.id, label: `${trip.destination} · ${trip.departDate} · ${trip.days}天 (#${trip.id})` }))}
            />
            {tripId !== null && <Tag color={isMember ? 'green' : 'orange'}>{isMember ? '已是成员' : '尚未加入'}</Tag>}
          </Space>
        )}
      </Card>

      {tripId !== null && !isMember && (
        <Result
          className="member-gate"
          status="403"
          title="你还不是该行程成员"
          subTitle="共同支出仅行程成员可查看与操作，加入后即可记账和结算。"
          extra={<Button type="primary" onClick={() => void handleJoin()}>加入此行程</Button>}
        />
      )}

      {tripId !== null && isMember && (
        <Row gutter={16} className="expense-body">
          <Col xs={24} lg={9}>
            <Card title="新增共同支出">
              <ExpenseForm tripId={tripId} members={members} onCreated={() => void loadExpenseData()} />
            </Card>
          </Col>
          <Col xs={24} lg={7}>
            <Card title={`支出明细（${expenses.length}）`} extra={<Button size="small" onClick={() => void loadExpenseData()}>刷新</Button>}>
              <ExpenseList expenses={expenses} members={members} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="分账结算">
              {settlement && <SettlementPanel settlement={settlement} />}
            </Card>
          </Col>
        </Row>
      )}

      <TripCreateModal
        open={createOpen}
        user={user}
        onClose={() => setCreateOpen(false)}
        onCreated={async trip => {
          setCreateOpen(false);
          await loadTrips();
          setTripId(trip.id);
        }}
      />
    </Layout>
  );
}
