# Liquidity Measurement Module (流动性测算模块)

## 1. 核心设计原则 (Core Principles)

本模块旨在模拟**“此时此刻 (Day 0)”**开始进行资产变现时，未来 30 天内的资金到账情况。

### 1.1 前瞻性原则 (Forward-Looking Only)
*   **假设**：系统假设在 Day 0 之前（历史时间）未进行任何赎回操作。
*   **推论**：所有资产的变现动作均从 Day 0 开始发起。
*   **Day 0 状态**：由于存在结算期 (T+N)，任何 T+N > 0 的资产在 Day 0 均为 **锁定状态** (Locked)，因为资金尚未到账。

### 1.2 现金到账原则 (Cash Arrival Basis)
*   **定义**：流动性仅在**资金实际可用日** (Settlement Date) 被视为 "Liquid"。
*   **发起 vs 到账**：
    *   用户在 **开放日** (Open Day) 发起赎回。
    *   资金在 **开放日 + N天** (Arrival Day) 到账。
    *   图表上仅在 **Arrival Day** 显示为可用。

### 1.3 脉冲式流动性 (Pulse Availability)
*   对于定期开放资产（如每月开放），如果错过开放窗口，资金将重新锁定。
*   图表反映的是：如果在最近的一个开放窗口进行了赎回，资金将在哪一天到账。一旦过了那个到账点而未操作（模拟中），机会窗口即关闭。

---

## 2. 资产流动性规则 (Asset Logic)

系统根据 `Initiation Date` (发起日) 来判定某一天是否会有资金到账。
> **发起日** = **当前模拟日期** - **结算周期 (Settlement Days)**

只有当 **发起日** 是一个有效的 **开放日**，且 **发起日 >= Day 0** 时，该资产在当前模拟日期才显示为可用。

### 2.1 每日开放基金 (Daily Open Funds)
*   **规则**：每个交易日均可赎回。
*   **结算**：T+N (通常为 T+1 ~ T+3)。
*   **表现**：
    *   **Day 0 ~ Day N-1**: **锁定 (Locked)**。原因：结算进行中。
    *   **Day N**: **可用 (Liquid)**。原因：T+0 资金已到账。
    *   **Day N+**: 持续可用。

### 2.2 定期开放资产 (Periodic / Monthly Open)
*   **规则**：仅在特定日期（如每月 15 日）开放。
*   **结算**：T+N。
*   **表现**：
    *   **非到账日**: **锁定**。
    *   **到账日 (开放日+N)**: **可用 (Liquid)**。
        *   判定逻辑：`(CurrentDate - N).getDate() == OpenDay`
    *   **错过窗口**: 如果模拟日期对应的发起日不是开放日，则显示锁定。

### 2.3 固定期限资产 (Fixed Term)
*   **规则**：持有至到期 (Maturity Date) 自动赎回或开放。
*   **结算**：T+N。
*   **表现**：
    *   **Date < Maturity + N**: **锁定**。原因：持有至到期。
    *   **Date >= Maturity + N**: **可用**。原因：已到期开放。

### 2.4 锁定期 (Lockup Period)
*   **优先级**：最高。
*   **规则**：如果 `Initiation Date < Lockup End Date`，强制 **锁定**。

---

## 3. 可视化交互规范 (Visualization Rules)

### 3.1 状态文案 (Status Text)

| 状态 | 条件 | 显示文案示例 | 备注 |
| :--- | :--- | :--- | :--- |
| **可用 (Liquid)** | 每日开放基金，且 N天已过 | `每日开放` | 去除 "T+0可用" 等冗余描述 |
| **可用 (Liquid)** | 定期开放基金，且刚好在到账日 | `开放日赎回 (资金到账)` | 强调是因开放日操作而到账 |
| **可用 (Liquid)** | 现金余额 | `实时可用` | |
| **锁定 (Locked)** | 每日开放基金，倒计时中 | `赎回结算中 (T+2到账)` | **动态倒计时**：T+N 随日期推进递减 |
| **锁定 (Locked)** | 错过定期开放窗口 | `非资金到账日 (开放日:每月15日)` | |
| **锁定 (Locked)** | 处于锁定期 | `处于锁定期 (至 2026-06-01)` | |

### 3.2 图表颜色 (Chart Colors)
*   **蓝色 (Liquid)**: 实际可支配资金（现金 + 此时此刻已到账的赎回款）。
*   **灰色 (Locked)**: 资产总值，但不可变现部分。
*   **红色 (Expense)**: 规划支出。

### 3.3 交互详情 (Interaction)
*   点击图表柱状体 (Bar)，侧边栏/浮层应显示当日的资金明细。
*   明细列表按 `可用` 和 `锁定` 分组。
*   锁定列表应按金额降序排列，并显示具体的锁定原因（如上述状态文案）。

---

## 4. 现金流规划 (Cash Flow Planning)

*   **手动收支**：用户录入的未来现金流（收入/支出）会逐日累加到 `CurrentCash`。
*   **T+N 支持**：录入赎回计划时，系统也会根据资产的结算周期，将现金流的生效日期向后推迟 N 天。
*   **现金缺口**：如果某日 `CurrentCash < 0`，明细中显示 "现金缺口" 且金额为负。

---

## 5. 计算逻辑伪代码 (Logic Pseudocode)

```typescript
For Each Day (CurrentDate) in 30-Day-Projection:
    InitiationDate = CurrentDate - SettlementDays
    
    If InitiationDate < StartDate:
        Status = LOCKED
        Reason = "Settlement Pending (T+{Remaining})"
    
    Else If Fund is DAILY:
        Status = LIQUID
        Reason = "Daily Open"
        
    Else If Fund is MONTHLY:
        If InitiationDate is OpenDay:
            Status = LIQUID
            Reason = "Arrived"
        Else:
            Status = LOCKED
            Reason = "Window Closed"
            
    Else If Fund is FIXED:
        If InitiationDate >= MaturityDate:
            Status = LIQUID
        Else:
            Status = LOCKED
```

---

## 6. 规则覆盖与优先机制 (Rule Overlay & Priority)

详细描述用户定义的个性化规则如何覆盖产品库的基础规则。

### 6.1 规则层级 (Rule Hierarchy)
1.  **用户个性化规则 (User Custom Rules)**: 优先级 **最高** (Level 1)。用户针对特定账户下的特定持仓设置的规则（如“把这个特定持仓改为每月10日开放”）。
2.  **产品补丁规则 (Patch Rules)**: 优先级 **中等** (Level 2)。针对某个 Fund ID 全局生效的修正规则（如“修正基金数据源错误”）。
3.  **产品基础规则 (Product Base Rules)**: 优先级 **最低** (Level 3)。产品库 (`funds` / `external_products` 表) 中定义的原始规则 (类型、T+N等)。

### 6.2 覆盖逻辑 (Overlay Logic)
*   在计算流动性时，系统首先检查该持仓是否存在 **用户个性化规则**。
    *   若存在，直接使用该规则中的参数（开放日、结算周期、锁定期等），完全忽略产品基础信息。
*   若不存在用户规则，检查是否有 **产品补丁规则**。
*   最后回退到 **产品基础规则**。

### 6.3 典型场景示例
*   **场景**：某“每日开放”的公募基金，用户购买了其特殊的“锁定6个月”份额。
    *   **操作**：用户在持仓上添加“锁定期”规则。
    *   **结果**：虽然该基金本身是 `DAILY`，但对该用户而言，在锁定期结束前，该资产强制显示为 `LOCKED`。
