# Telegram 色色机器人 🤖💋

一个基于 Node.js 开发的 Telegram 色情内容机器人，支持关键词触发、自动回复、频道推送、图文分发等功能，适用于成人频道或私密社群。

## 🌟 功能特点

- ✅ 关键词自动回复（支持文字、图片、视频、GIF）
- ✅ 每日定时推送内容到频道或群组
- ✅ 支持多账号 / 多管理员权限设置
- ✅ 支持本地或远程 CDN 存储内容
- ✅ 支持内容分类管理（如 COS、AI 绘图、无码、写真等）
- ✅ 可扩展的命令系统与 webhook 接口
- ✅ 可选 Web 管理界面（开发中）

## 🛠️ 技术栈

- [Node.js](https://nodejs.org/)
- [Telegraf](https://telegraf.js.org/)
- [MongoDB](https://www.mongodb.com/) / MySQL（内容与用户数据存储）
- [Express](https://expressjs.com/)（接口服务）
- [FFmpeg](https://ffmpeg.org/)（用于视频处理）

## ⚠️ 合法性与免责声明

> ⚠️ **本项目仅供学习和研究使用。严禁用于违法传播、商业牟利或违反 Telegram 使用政策的用途。开发者不对用户行为承担任何法律责任。**

请遵守您所在国家或地区的法律法规。

## 📦 快速开始

```bash
git clone https://github.com/byprogram/telegram-sese-bot.git
cd telegram-sese-bot
npm install
# 修改conf 中的 BOT_TOKEN 和其他配置项
npm start
