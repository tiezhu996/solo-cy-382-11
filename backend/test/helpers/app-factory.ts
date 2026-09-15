import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { UserModule } from '../../src/modules/user/user.module';
import { TripModule } from '../../src/modules/trip/trip.module';
import { ExpenseModule } from '../../src/modules/expense/expense.module';
import { UserEntity } from '../../src/modules/user/user.entity';
import { TripEntity } from '../../src/modules/trip/trip.entity';
import { TripMemberEntity } from '../../src/modules/expense/trip-member.entity';
import { ExpenseEntity } from '../../src/modules/expense/expense.entity';
import { ExpenseShareEntity } from '../../src/modules/expense/expense-share.entity';

const ENTITIES = [UserEntity, TripEntity, TripMemberEntity, ExpenseEntity, ExpenseShareEntity];
const RESET_TABLES = ['expense_shares', 'expenses', 'trip_members', 'trips', 'users'];

/**
 * 创建一个挂在内存 SQLite 上的真实 Nest 应用（控制器/守卫/过滤器/服务/TypeORM 全链路）。
 * 不监听端口，配合 supertest(app.getHttpServer()) 直接发起请求。
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: ENTITIES,
        synchronize: true,
        dropSchema: true
      }),
      UserModule,
      TripModule,
      ExpenseModule
    ]
  }).compile();

  const app = moduleFixture.createNestApplication({ logger: false });
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  return app;
}

/**
 * 清空所有业务表并重置 SQLite 自增序列。
 * 每个用例前调用，保证用例间数据互不影响、自增 id 每次从 1 开始，结果可重复。
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  await dataSource.query('PRAGMA foreign_keys = OFF');
  for (const table of RESET_TABLES) {
    await dataSource.query(`DELETE FROM ${table}`);
  }
  await dataSource.query("DELETE FROM sqlite_sequence WHERE name IN ('" + RESET_TABLES.join("','") + "')");
  await dataSource.query('PRAGMA foreign_keys = ON');
}

/** 直接读取表行数，用于断言“失败请求不写入任何记录”。 */
export async function countRows(app: INestApplication, table: string): Promise<number> {
  const dataSource = app.get(DataSource);
  const rows = await dataSource.query(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(rows[0].c);
}
