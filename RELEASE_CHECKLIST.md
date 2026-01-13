# 发版检查单 (Release Checklist)

为确保每次发版时文档与代码保持一致，请按照以下清单逐项检查。

## 1. 数据库变更 (Database Changes)
如果修改了数据库结构 (如: `backend/schema.sql`)，必须同步更新以下文件：

- [ ] **[Source] `backend/schema.sql`**: 确保这是最新的数据库结构定义（Source of Truth）。
- [ ] **[Doc] `backend/DB_SCHEMA.md`**: 对比 SQL 文件，更新文档中的表结构、字段描述、新增的枚举值等。
- [ ] **[Script] `backend/apply_migration.sql`**: 如果是增量更新，确保编写了对应的 `ALTER TABLE` 或 `CREATE TABLE` 语句，供线上环境升级使用。
- [ ] **[Script] `backend/generate_seed.py`**: 如果新增了表，确保将其加入到导出列表中，以便 `seed_data.py` 能包含新表的数据。
- [ ] **[Data] `backend/seed_data.py`**: 在本地重置并验证无误后，运行 `generate_seed.py` 重新生成此文件。

## 2. API 与逻辑变更 (API & Logic)
如果修改了后端接口或核心业务逻辑：

- [ ] **[Doc] `API.md`** (如果有): 核对 `main.py` 中的路由、参数模型 (Pydantic models) 和返回字段，确保文档准确。
- [ ] **[Doc] `LIQUIDITY_README.md`**: 如果修改了流动性计算规则、赎回限制逻辑（如 T+N、锁定期优先级），必须更新此文档。

## 3. 部署与配置 (Deployment)
如果修改了依赖或部署流程：

- [ ] **[Doc] `QUICK_DEPLOY.md`**:
    - 如果新增了 Python 依赖，更新 `requirements.txt` 并检查文档中的安装步骤。
    - 如果新增了前端构建步骤，更新相关说明。
    - 检查“数据库初始化”章节是否仍然适用。

## 4. 提交前最终验证 (Final Verification)
- [ ] **清理垃圾文件**: 确认目录下没有 `temp_*.py`, `debug_*.py` 或其他临时测试脚本。
- [ ] **Mock 数据一致性**: 检查前端 Mock 数据（如有）是否与新的数据库结构冲突。

## 5. 发版报告 (Release Report)
每次发版必须创建一个 Markdown 格式的版本说明文件 (格式: `RELEASE_YYYYMMDD.vX.md`)，内容应包含：

- [ ] **[Core] 核心变更**: 一句话概括本次更新的主要目标（如：数据同步、功能增强）。
- [ ] **[Feature] 业务功能增强**: 列出前端用户可见的新特性、优化点和修复的 Bug。
- [ ] **[Backend] 后端架构升级**: 列出数据库 Schema 变更、新接口、性能优化等。
- [ ] **[Doc] 文档更新**: 确认相关技术文档 (API, Schema, Deploy) 已同步更新。
- [ ] **[Git] 代码提交与打标**: 确认所有更改已提交并推送到远程仓库，并在 GitHub 上创建对应的 Release Tag。

---

> **Agent 提示**: 在执行任务时，请主动查阅此清单，避免遗漏文档更新。
