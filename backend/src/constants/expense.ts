/** 共同支出相关的固定取值，集中维护以便统一校验与回显。 */
export const EXPENSE_LIMITS = {
  /** 最小货币单位：金额小于 0.01 元无法入账，必须拒绝。 */
  MIN_AMOUNT: 0.01,
  /** 单笔金额上限，对应数据库 DECIMAL(10,2)：整数部分最多 8 位。 */
  MAX_AMOUNT: 99_999_999.99,
  /** 说明字段对应 VARCHAR(255) 的最大长度。 */
  MAX_DESCRIPTION_LENGTH: 255
} as const;
