# WMS Protocol Database Schema Documentation

本文档详细描述了后端 MySQL 数据库的表结构。

## 1. 核心资产表

### 1.1 funds (系统内公募基金)
存储系统内部管理的基金（公募）基础信息及流动性规则。

| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | 主键 (UUID) | |
| `code` | VARCHAR(10) | 基金代码 | 如 510300 |
| `name` | VARCHAR(100) | 基金名称 | |
| `type` | VARCHAR(20) | 基金类型 | 股票型, 债券型等 |
| `nav` | DECIMAL(10, 4) | 最新净值 | |
| `created_at` | TIMESTAMP | 创建时间 | |
| **流动性规则 (v20260108)** | | | |
| `liquidity_rule_type` | ENUM | 规则类型 | DAILY, MONTHLY, FIXED_TERM, CUSTOM |
| `settlement_days` | INT | 到账天数 | T+N (默认1) |
| `open_day` | INT | 开放日 | 仅 MONTHLY 类型有效 (1-31) |
| `has_lockup` | BOOLEAN | 是否有锁定期 | |
| `lockup_days` | INT | 锁定期天数 | 申购后锁定 N 天 |
| `maturity_date` | DATE | 到期日 | 仅 FIXED_TERM 类型有效 |
| `liquidity_notes` | TEXT | 规则备注 | |

### 1.2 external_products (外部产品库)
存储非公募类的外部产品（如信托、私募、资管计划），作为产品库供不同客户持仓引用。

| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | 主键 (UUID) | |
| `product_name` | VARCHAR(200) | 产品名称 | |
| `product_type` | VARCHAR(50) | 产品类型 | 信托, 私募等 |
| `status` | ENUM | 状态 | 募集中, 运行中, 已到期等 |
| `latest_nav` | DECIMAL(10, 4) | 最新净值 | |
| `liquidity_rule_type` | ENUM | 规则类型 | 默认为 MONTHLY |
| `advanced_config` | JSON | 高级配置 | 预留扩字段 |

### 1.3 holdings (客户持仓)
连接账户与资产（基金或外部产品）的关联表。

| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(36) | 主键 | |
| `account_id` | VARCHAR(36) | 所属账户ID | 外键 |
| `fund_id` | VARCHAR(36) | 关联公募基金ID | 可空 (互斥) |
| `external_product_id` | VARCHAR(36) | 关联外部产品ID | 可空 (互斥) |
| `shares` | DECIMAL(15, 2) | 持有份额 | |
| `avg_cost` | DECIMAL(10, 4) | 持仓成本 | |
| `purchase_date` | DATE | 申购日期 | 用于计算锁定期 |
| `redemption_config` | JSON | 个性化规则覆盖 | 若设置，优先级高于产品默认规则 |

---

## 2. 净值与历史数据

### 2.1 fund_nav_history (公募净值历史)
| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | INT | 自增主键 | |
| `fund_id` | VARCHAR(36) | 基金ID | |
| `date` | DATE | 净值日期 | |
| `nav` | DECIMAL(10, 4) | 单位净值 | |
| `change_percent` | DECIMAL(5, 2) | 日涨跌幅 | |
| `is_patched` | BOOLEAN | 是否为拼接数据 | 标识是否由 Patch Rule 生成 |
| `patch_fund_id` | VARCHAR(36) | 拼接源ID | 记录数据来源基金 |

### 2.2 fund_patch_rules (数据拼接规则)
定义新基金如何引用旧基金的历史数据进行业绩回溯。

| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(255) | 规则ID | |
| `target_fund_id` | VARCHAR(36) | 目标基金 (新) | |
| `proxy_fund_id` | VARCHAR(36) | 代理基金 (旧) | 被借用数据的基金 |
| `start_date` | DATE | 借用开始日期 | |
| `end_date` | DATE | 借用结束日期 | |

---

## 3. 客户与账户体系

### 3.1 clients (客户)
| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | VARCHAR(36) | 客户ID |
| `name` | VARCHAR(100) | 客户姓名 |

### 3.2 accounts (账户)
| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | VARCHAR(36) | 账户ID |
| `client_id` | VARCHAR(36) | 所属客户 |
| `type` | VARCHAR(50) | 账户类型 | PERSONAL, FAMILY_TRUST |
| `cash_balance` | DECIMAL | 现金余额 | |

---

## 4. 现金流管理

### 4.1 cash_flows (现金流明细)
| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | 主键 | |
| `amount` | DECIMAL | 金额 | |
| `type` | VARCHAR(10) | 类型 | INFLOW / OUTFLOW |
| `recurring_rule_id` | VARCHAR(50) | 关联规则ID | 可空 |

### 4.2 recurring_rules (重复规则)
| 字段名 | 类型 | 描述 | 备注 |
| :--- | :--- | :--- | :--- |
| `id` | VARCHAR(50) | 主键 | |
| `frequency` | VARCHAR(20) | 频率 | MONTHLY, QUARTERLY, YEARLY |
| `count` | INT | 总次数 | |
