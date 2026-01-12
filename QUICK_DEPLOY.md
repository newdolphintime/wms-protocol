# 极速部署指南 (Quick Deploy)

不需要复杂的 Nginx 和 Systemd 配置，只需要 5 步即可完成部署。

## 原理
Python 后端 (`backend/main.py`) 已被修改为可以直接运行 React 前端页面。你只需要运行一个 Python 进程即可。

---

## 步骤 1: 准备前端文件
在服务器的项目根目录下运行：

```bash
# 1. 安装依赖
npm install

# 2. 构建前端 (生成 dist 目录)
npm run build
```
**验证**: 运行 `ls -F`，确保可以看见 `dist/` 目录。如果缺少该目录，后续访问会报 404。

## 步骤 2: 准备后端环境
进入 backend 目录：

```bash
cd backend

# 1. 安装 Python 依赖
pip install -r requirements.txt
```

## 步骤 3: 数据库初始化 (首次部署或全量重置)
**⚠️ 警告**: 此步骤会**删除所有现有数据**并完全重置数据库。
*   如果是**首次部署**，请按顺序执行。
*   如果是**版本更新**且需保留数据，请直接跳至 **步骤 3.5**。

1.  **重建数据库 & 导入表结构**:
    ```bash
    # 1. 删除并重新创建数据库 (确保使用 utf8mb4)
    mysql -u root -p -e "DROP DATABASE IF EXISTS wms; CREATE DATABASE wms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

    # 2. 导入表结构
    mysql -u root -p wms < schema.sql
    ```

## 步骤 3.5: 数据库升级 (仅限更新部署)
**注意**: 如果你已经在运行旧版本且**需要保留数据**，请不要重新运行步骤 3，而是执行以下迁移脚本：

```bash
cd backend
mysql -u root -p wms < apply_migration.sql
```
此脚本会添加 `external_products` 表并更新 `funds` 和 `holdings` 表结构，而不会删除现有数据。

3. **导入初始数据**:
   ```bash
   # 运行数据填充脚本
   python seed_data.py
   ```

## 步骤 4: 启动服务 (后台运行)
在 `backend` 目录下执行：

```bash
# 1. 如果有旧服务在运行，先杀掉
# ps -ef | grep main.py
# kill <PID>

# 2. 启动新服务 (日志输出到 ../LOG/server.log)
nohup python3 main.py > ../LOG/server.log 2>&1 &
```

> **注意**: 
> - 应用内部日志 (API请求、错误等) 会自动写入 `../LOG/backend.log` (每天滚动)。
> - 启动时的控制台输出 (Uvicorn 启动信息) 会写入 `../LOG/server.log`。

## 步骤 5: 配置防火墙/安全组
确保腾讯云控制台的安全组规则允许 **TCP 8001** 端口的入站流量。

1.  登录腾讯云控制台 > 云服务器 > 安全组。
2.  添加入站规则：
    *   **端口**: `8001`
    *   **来源**: `0.0.0.0/0`
    *   **策略**: `允许`

---

### 常用验证与维护

- **访问网站**: `http://<服务器IP>:8001`
- **查看启动日志**: `tail -f ../LOG/server.log`
- **查看应用日志**: `tail -f ../LOG/backend.log`
- **停止服务**: 
  ```bash
  ps -ef | grep main.py
  kill <PID>
  ```
