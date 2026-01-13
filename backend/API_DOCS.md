# WMS Protocol Backend API 文档

本文档详细描述了后端服务提供的 API 接口、数据模型及调用逻辑。

## 1. 基金管理 (Funds)

> **Version History**:
> - v20260108.v1: 新增 `PUT /api/funds/{id}` 配置流动性
> - v20260108.v2: `PUT /api/holdings/{id}` 支持清除规则
> - v20260108.v1: 新增 `PUT /api/funds/{id}` 配置流动性
> - v20260108.v2: `PUT /api/holdings/{id}` 支持清除规则
> - v20260111.v1: 完善外部产品 (External Products) 与现金流 (Cash Flows) 接口定义
> - v20260112.v1: 新增客户管理 (Clients) 接口及现金流 Client ID 过滤
> - v20260113.v1: 修复路由遮挡导致 API 404 的问题；修复持仓数据刷新问题；更新 `accounts` 表结构。

### 1.1 获取基金列表
*   **Method**: `GET`
*   **URL**: `/api/funds`
*   **描述**: 获取系统内部的所有基金列表。支持通过名称或代码进行模糊搜索，以及按类型过滤。
*   **参数**:
    *   `keyword` (Query, Optional): 搜索关键词（匹配名称或代码）。
    *   `type` (Query, Optional): 基金类型筛选。
*   **响应**: `List[Fund]`
    ```json
    [
      {
        "id": "uuid",
        "code": "510300",
        "name": "沪深300ETF",
        "liquidityRuleType": "DAILY", // 流动性规则类型
        "settlementDays": 1,          // 赎回到账时间 (T+N)
        ...
      }
    ]
    ```

### 1.2 获取基金详情
*   **Method**: `GET`
*   **URL**: `/api/funds/{fund_id}`
*   **描述**: 获取单个基金的详细信息，包含完整的流动性规则属性。
*   **响应**: `Fund`

### 1.3 更新基金信息 (配置流动性)
*   **Method**: `PUT`
*   **URL**: `/api/funds/{fund_id}`
*   **描述**: 更新基金的属性。目前主要用于配置基金级别的流动性规则。
*   **调用逻辑**: 当用户在“基金详情页”点击配置流动性并保存时调用。
*   **请求体**: `FundUpdate`
    ```json
    {
      "liquidityRuleType": "MONTHLY",
      "settlementDays": 5,
      "openDay": 15,         // 每月15号开放
      "hasLockup": false,
      "maturityDate": "2025-12-31" 
    }
    ```
*   **响应**: `{"message": "Fund updated successfully"}`

### 1.4 获取基金净值历史
*   **Method**: `GET`
*   **URL**: `/api/funds/{fund_id}/history`
*   **参数**: `days` (Optional) - 限制返回最近 N 天的数据。
*   **描述**: 获取基金的历史净值走势。如果该基金应用了“数据拼接规则”，返回的数据将包含拼接后的模拟历史数据。

### 1.5 添加数据拼接规则 (Patch Rule)
*   **Method**: `POST`
*   **URL**: `/api/patch-rules`
*   **描述**: 为某个新发行的基金（Target）拼接一段历史数据（Proxy），用于回测或展示长期业绩。系统会自动处理拼接点的数据平滑（Backward/Forward Calculation）。
*   **请求体**: `PatchRule`
    ```json
    {
      "id": "uuid",
      "target_fund_id": "fund_uuid",
      "proxy_fund_id": "proxy_uuid",
      "start_date": "2023-01-01",
      "end_date": "2023-12-31"
    }
    ```

---

## 2. 持仓与投资组合 (Holdings & Portfolios)

### 2.1 获取客户投资组合
*   **Method**: `GET`
*   **URL**: `/api/portfolios/{client_id}`
*   **描述**: 获取指定客户的所有账户及持仓信息。这是前端核心数据接口。
*   **响应**: `ClientPortfolio` (包含 Accounts -> Holdings)

### 2.2 添加持仓
*   **Method**: `POST`
*   **URL**: `/api/holdings`
*   **描述**: 在指定账户下添加一笔新的持仓。

### 2.3 更新持仓 (关联产品/配置规则)
*   **Method**: `PUT`
*   **URL**: `/api/holdings/{holding_id}`
*   **描述**: 更新持仓的配置。
*   **主要场景**:
    1.  **关联外部产品**: `externalProductId` 不为空时，持仓将自动继承该产品的净值和流动性规则。
    2.  **自定义规则**: 更新 `redemptionConfig` 字段，为该持仓单独设置流动性。
*   **请求体**: `HoldingUpdate`
    ```json
    {
      "externalProductId": "product_uuid", // 可选：关联产品库，设为 null 也可以解除关联
      "purchaseDate": "2024-01-01",        // 可选：用于计算锁定期
      "redemptionConfig": null             // [v20260108.v2] 可选：设置为 null 可清除个性化规则（恢复默认）
    }
    ```

### 2.4 获取持仓有效流动性信息 (核心逻辑)
*   **Method**: `GET`
*   **URL**: `/api/holdings/{holding_id}/liquidity-info`
*   **Version**: `v20260108.v1`
*   **描述**: 计算并返回该持仓当前生效的流动性规则。
*   **调用逻辑 (优先级解析)**:
    1.  **外部产品 (External Product)**: 如果持仓关联了外部产品 (`external_product_id`)，系统优先使用该产品的规则。
    2.  **系统基金 (Fund)**: 如果持仓是系统内部基金 (`fund_id`)，使用该基金配置的规则。
    3.  **持仓配置 (Holding Config)**: 如果上述均无，或持仓有特定的覆盖配置 (`redemption_config`)，则使用持仓自身的配置。
    4.  **默认值**: 默认为 T+1 日常赎回。
*   **响应**: `LiquidityInfo`
    ```json
    {
      "ruleType": "MONTHLY",
      "source": "external_product", // 规则来源：用于前端展示“继承自xxx”
      ...
    }
    ```

### 2.5 删除持仓
*   **Method**: `DELETE`
*   **URL**: `/api/holdings/{holding_id}`

### 2.6 创建账户
*   **Method**: `POST`
*   **URL**: `/api/accounts`
*   **描述**: 为客户创建一个新的子账户（如家族信托账户）。
*   **请求体**: `AccountCreate`
    ```json
    {
      "clientId": "client-uuid",
      "name": "张氏家族信托一号",
      "type": "家族信托账户", // 个人自有账户, 家族信托账户
      "cashBalance": 1000000
    }
    ```
*   **响应**: `{"id": "acc-uuid", "message": "Account created"}`

### 2.7 删除账户
*   **Method**: `DELETE`
*   **URL**: `/api/accounts/{account_id}`
*   **描述**: 删除账户及其下属所有持仓。

---

## 3. 外部产品库 (External Products)

### 3.1 获取产品列表
*   **Method**: `GET`
*   **URL**: `/api/external-products`
*   **描述**: 获取所有“运行中”的外部产品（非系统内部基金，如信托、私募等）。

### 3.2 创建外部产品
*   **Method**: `POST`
*   **URL**: `/api/external-products`
*   **描述**: 录入一个新的外部产品及其标准流动性条款。
*   **请求体**: `ExternalProductCreate`
    ```json
    {
      "productName": "阿尔法私募一期",
      "productCode": "PE-001",
      "productType": "PRIVATE_EQUITY", // Enum: PRIVATE_EQUITY, TRUST, OFFSHORE, OTHER
      "issuer": "阿尔法资产",
      "latestNav": 1.05,
      "navDate": "2024-01-01",
      "liquidityRuleType": "QUARTERLY",
      "openDay": 1,          // 季度首月1号开放
      "settlementDays": 10,  // T+10
      "hasLockup": true,
      "lockupDays": 180,
      "description": "备注说明..."
    }
    ```
*   **响应**: `{"id": "uuid", "message": "Product created successfully"}`

---
 
 ## 4. 客户管理 (Clients)
 
 ### 4.1 获取客户列表
 *   **Method**: `GET`
 *   **URL**: `/api/clients`
 *   **描述**: 获取所有客户列表。支持通过关键词搜索（匹配姓名、电话或 ID）。
 *   **参数**:
     *   `keyword` (Query, Optional): 搜索关键词。
 *   **响应**: `List[ClientResponse]`
    ```json
     [
       {
         "id": "client-uuid",
         "name": "王先生",
         "phone": "13800138000",
         "gender": "M",
         "status": "VIP",
         "riskLevel": "C3-平衡型",
         "tags": [{"id": "t1", "label": "高净值", "color": "blue"}],
         "totalAum": 5000000 
       }
     ]
     ```
 
 ### 4.2 创建新客户
 *   **Method**: `POST`
 *   **URL**: `/api/clients`
 *   **请求体**: `ClientCreate`
     ```json
     {
       "name": "李女士",
       "phone": "13912345678",
       "gender": "F",
       "status": "POTENTIAL",
       "riskLevel": "C2-稳健型",
       "tags": []
     }
     ```
 *   **响应**: `{"id": "uuid", "message": "Client created successfully"}`
 
 ---
 
 ## 5. 现金流管理 (Cash Flows)

### 5.1 获取现金流列表
*   **Method**: `GET`
*   **URL**: `/api/cash-flows`
*   **参数**: 无
*   **响应**: `List[CashFlowItem]`
    ```json
    [
      {
        "id": "uuid",
        "date": "2025-01-15",
        "amount": 50000,
        "type": "INFLOW", // INFLOW or OUTFLOW
        "type": "INFLOW", // INFLOW or OUTFLOW
        "description": "分红收入",
        "recurringRuleId": "rule-uuid", // 如果关联了周期规则
        "relatedHoldingKey": "fund-uuid" // 关联的持仓/基金
      }
    ]
    ```

### 5.2 批量添加现金流
*   **Method**: `POST`
*   **URL**: `/api/cash-flows/batch`
*   **描述**: 批量录入现金流，常用于生成周期性计划（如“每月定投”）。
*   **请求体**: `BatchCashFlowRequest`
    ```json
    {
      "flows": [
          { "id": "1", "date": "2025-01-01", "amount": 10000, "type": "INFLOW", ... }
      ],
      "rule": { // 可选：定义周期规则元数据
        "id": "r1", 
        "frequency": "MONTHLY", 
        "count": 12 
      }
    }
    ```
*   **响应**: `{"message": "Batch save successful", "count": 12}`

### 5.3 删除现金流
*   **Method**: `DELETE`
*   **URL**: `/api/cash-flows/{flow_id}`

## 数据模型说明 (Type Definitions)

### LiquidityRuleType (Enum)
*   `DAILY`: 每日开放 (如货币基金)
*   `MONTHLY`: 每月特定日开放 (如 `openDay=15` 表示每月15号)
*   `FIXED_TERM`: 封闭期固定 (有固定 `maturityDate`)
*   `CUSTOM`: 自定义/其他

### SettlementDays (Integer)
*   赎回指令发出后，资金回到账户所需的交易日天数 (T+N)。
