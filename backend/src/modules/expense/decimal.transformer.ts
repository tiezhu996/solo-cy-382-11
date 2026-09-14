import { ValueTransformer } from 'typeorm';

/**
 * MySQL DECIMAL 经 mysql2 驱动读取后是字符串。
 * 统一转成 number，写入时也保证按数字落库，避免业务层拿到字符串。
 */
export class DecimalColumnTransformer implements ValueTransformer {
  to(value: number | null | undefined): number | null {
    return value === null || value === undefined ? null : Number(value);
  }

  from(value: string | number | null): number | null {
    return value === null ? null : Number(value);
  }
}
