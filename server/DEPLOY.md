# Mac mini 部署指南

## 前置要求

- Mac mini 已安装 Node.js (v20+)
- Mac mini 已安装 Tailscale 并连接
- Obsidian Vault 在 Mac mini 本地路径：`/Users/yezi/Obsidian Vault`

## 一键部署

### 方法1：Git clone

```bash
# 1. Clone 项目到 Mac mini
git clone <repo-url> diary-post
cd diary-post/server

# 2. 执行部署脚本
./deploy.sh
```

### 方法2：手动部署

```bash
cd diary-post/server

# 1. 安装依赖
npm install

# 2. 构建 TypeScript
npm run build

# 3. 创建日志目录
mkdir -p logs

# 4. 启动服务
npm run pm2:start

# 5. 查看状态
pm2 status
```

## 验证部署

```bash
# 测试 Health endpoint
curl http://localhost:4001/health

# 查看日志
pm2 logs diary-api
```

## 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
npm run pm2:logs
pm2 logs diary-api --lines 100

# 重启服务
npm run pm2:restart

# 停止服务
npm run pm2:stop

# 删除服务
pm2 delete diary-api
```

## 开机自启

```bash
# 生成 startup 脚本
pm2 startup

# 保存当前 pm2 进程列表
pm2 save
```

执行 `pm2 startup` 后会输出一条命令，复制执行即可。

## 日志管理

日志文件位置：
- 输出日志：`logs/out-0.log`
- 错误日志：`logs/error-0.log`

日志格式：
```
2026-05-12 10:29:58 +08:00: Diary API Server running on port 4001
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新部署
cd server
npm run build
npm run pm2:restart
```

## 监控

### pm2 监控面板

```bash
pm2 monit
```

### API 监控

```bash
# Health check
curl http://localhost:4001/health

# 日记接口测试
curl http://localhost:4001/api/v1/diary/2026-05-12 \
  -H "Authorization: Token diary-app-secret-token-2026"
```

## 故障排查

### 1. 服务未启动

```bash
# 检查进程
pm2 status

# 查看错误日志
pm2 logs diary-api --err
```

### 2. 端口被占用

```bash
# 检查端口
lsof -i :4001

# 停止占用进程
pm2 stop diary-api
```

### 3. Token 无效

检查 `config.json` 中的 apiToken 配置。

## 手机端配置

手机浏览器访问：
- PWA：`http://100.127.58.104:4000`（Mac mini Tailscale）
- API：`http://100.127.58.104:4001`

设置页面：
- 启用远程模式
- API地址：`http://100.127.58.104:4001`
- Token：`diary-app-secret-token-2026`

## 配置文件

`server/config.json`：
```json
{
  "vaultPath": "/Users/yezi/Obsidian Vault",
  "apiToken": "diary-app-secret-token-2026",
  "port": 4001
}
```

**注意**：Mac mini 的 vaultPath 可能与 MacBook 不同，需要修改。