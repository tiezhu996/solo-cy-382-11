# 共同支出分账 · 自动化测试

可重复运行的后端自动化测试，**无需 MySQL 或任何外部服务**：使用内存 SQLite
（`better-sqlite3`）启动真实的 Nest 应用，经过真实的控制器、JWT 守卫、全局异常过滤器、
服务与 TypeORM，再用 supertest 发起 HTTP 请求。

> `better-sqlite3` 声明在 `optionalDependencies`：`npm install` 默认会安装它（测试可用）；
> 生产镜像构建用 `npm install --omit=optional` 跳过这个仅测试用的原生模块。

## 运行

```bash
cd backend
npm install
npm test          # 运行全部测试
npm run test:watch
npm run test:cov  # 生成覆盖率报告（coverage/）
```

## 目录结构

```
test/
├── setup.ts                       # 全局初始化：reflect-metadata、固定测试环境变量
├── helpers/
│   ├── app-factory.ts             # 内存 SQLite 应用工厂 + 清库/重置自增序列 + 表行数统计
│   ├── harness.ts                 # HTTP 请求与注册/建行程/加入/记账等高频操作封装
│   └── scenario.ts                # 标准场景：三名成员 + 一名外部成员的两个独立行程
├── unit/
│   ├── split-money.spec.ts        # 均分与余数按分补齐
│   └── transfer.spec.ts           # 净额结算与最简收付款路径
└── e2e/
    ├── auth.spec.ts               # 登录失败 401、注册不回密码散列
    ├── expense-happy-path.spec.ts # 正常记账、多人分摊余数、回读、结算
    ├── expense-access-control.spec.ts # 无效令牌、非成员、跨行程隔离
    └── expense-validation.spec.ts # 零/负、亚分、超上限、参与人/说明类型错误
```

## 数据隔离与可重复性

- 每个用例执行前 `resetDatabase` 清空全部业务表并重置 SQLite 自增序列，
  用例之间互不影响，行程/用户 id 每次从 1 开始，连续运行结果一致。
- 数据库为 `:memory:`，进程结束即消失，不产生任何文件。
- 所有“非法请求”用例都断言 `expenses` 与 `expense_shares` 两张表的行数前后不变，
  确保失败请求不会留下支出或分摊记录。

## 与生产数据库的差异

测试用 SQLite 仅用于驱动同一份 TypeORM 实体与业务逻辑；生产环境仍使用 MySQL 8.0
（见 `src/config/typeorm.config.ts`）。金额相关的取值范围（最小 0.01、上限
99,999,999.99）由服务层常量 `src/constants/expense.ts` 统一约束，不依赖具体数据库。
