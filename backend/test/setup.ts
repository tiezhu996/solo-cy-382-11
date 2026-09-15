// Jest 全局初始化：在任何被测模块加载前引入元数据反射，并固定测试用 JWT 密钥。
import 'reflect-metadata';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';
process.env.NODE_ENV = 'test';
