# API Documentation

## Overview
This document outlines the API endpoints required to migrate the frontend from using `MOCK_FUNDS` to a backend service. The initial phase focuses on the **Fund List Page**.

## Fund List Page

### 1. Get Fund List
Retrieves a list of all available funds. Supports optional filtering by keyword and type.

- **URL:** `/api/funds`
- **Method:** `GET`
- **Description:** Returns an array of fund objects to populate the table in `FundListPage`.

#### Request Parameters (Query)
| Parameter | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `keyword` | string | No       | Search term to filter by Fund Name (`name`) or Code (`code`). |
| `type`    | string | No       | Filter by `FundType` (exact match).              |

#### Response Body
A JSON array of `Fund` objects.

```json
[
  {
    "id": "string",          // Unique Identifier (UUID)
    "code": "string",        // Fund Code (e.g., "510300")
    "name": "string",        // Fund Name (e.g., "沪深300ETF")
    "manager": "string",     // Fund Manager Name
    "type": "string",        // Enum Value (e.g., "宽基指数ETF", "行业主题ETF")
    "nav": 1.234,            // Net Asset Value (number)
    "dayChange": 0.56,       // Daily Change Percentage (number, e.g., 0.56 for 0.56%)
    "ytdReturn": 5.2,        // Year-to-Date Return Percentage (number)
    "riskLevel": 3,          // Risk Level (1-5, number)
    "inceptionDate": "2012-05-04", // YYYY-MM-DD
    "description": "string"  // Brief description of the fund
  }
]
```

#### Field Details & Mapping (Frontend `Fund` Interface)
| API Field      | TS Type  | Description/Notes |
|----------------|----------|-------------------|
| `id`           | `string` | Primary Key. |
| `code`         | `string` | Displayed in list and used for searching. |
| `name`         | `string` | Main display name. |
| `manager`      | `string` | *Not currently shown in List Table, but part of `Fund` type.* |
| `type`         | `string` | Mapped to `FundType` enum values: '宽基指数ETF', '行业主题ETF', '策略ETF', '跨境ETF', '债券ETF'. |
| `nav`          | `number` | Latest Net Asset Value. |
| `dayChange`    | `number` | Percentage change (e.g., `1.5` means +1.5%). |
| `ytdReturn`    | `number` | YTD return percentage. |
| `riskLevel`    | `number` | Numeric risk rating 1-5. |
| `inceptionDate`| `string` | ISO Date string (YYYY-MM-DD). |
| `description`  | `string` | *Used in analysis, not main table.* |

---

### Portfolio / Holdings

#### Get Client Portfolio
**GET** `/api/portfolios/{client_id}`

Fetches the complete portfolio hierarchy for a client, including accounts and holdings.

**Response**: `ClientPortfolio` structure.
```json
{
  "id": "client-001",
  "clientName": "John Doe",
  "accounts": [
    {
      "id": "acc-01",
      "name": "Personal Account",
      "type": "PERSONAL",
      "cashBalance": 50000.00,
      "holdings": [
        {
          "id": "h-01",
          "fundId": "1",
          "isExternal": false,
          "shares": 1000,
          "avgCost": 3.50,
          "redemptionRule": { "ruleType": "DAILY", "settlementDays": 1 }
        }
      ]
    }
  ]
}
```

#### Add Holding
**POST** `/api/holdings`

Adds a new holding (asset) to a specific account. Supports both system funds (via `fundId`) and external assets (via `isExternal=true`).

**Request**:
```json
{
  "id": "new-uuid",
  "accountId": "acc-01",
  "fundId": "1",  // Optional
  "isExternal": false,
  "shares": 500,
  "avgCost": 4.00,
  "redemptionRule": {
      "ruleType": "MONTHLY",
      "openDay": 15,
      "settlementDays": 3
  }
}
```

#### Delete Holding
**DELETE** `/api/holdings/{holding_id}`

Removes a holding record.
