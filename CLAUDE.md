# 補休登錄系統（timerecord）

React + Vite 前端、Express API、PostgreSQL，公司內部系統。

## 部署（2026-10-17 起在 Railway，Zeabur 已停運遷出）

- 正式網址：https://bztimerecord.up.railway.app
- 部署方式：push 到 GitHub main 分支即自動部署（Railway 專案 timerecord，帳號 airblue2002@gmail.com）
- 舊的 Zeabur 網址（timerecord.zeabur.app）只營運到正式切換日，Zeabur 平台 2026 年底全面關閉，不要再部署到那邊
- 部署注意：.gitignore 有 *.sql 規則，啟動必需的 database/schema.sql 靠 .railwayignore 的例外才會進部署，不要移除那條例外

## 資料庫與備份

- 正式資料庫是 Railway Postgres（連線資訊在 Railway 後台，或 /Users/aria/railway-backups/databases.env）
- 備份雙保險：Railway PITR 連續備份（已啟用）＋ 本機每週自動備份（launchd，存 /Users/aria/railway-backups/timerecord/）
- 改動資料庫前先確認最近一次備份存在，並主動告知備份狀態

## 其他

- 登入部門帳號設定在 Railway 的 DEPARTMENTS 環境變數（JSON）
- 遷移細節與切換待辦記錄在 meetingroom 專案的對話記憶與本專案 CHANGELOG.md
