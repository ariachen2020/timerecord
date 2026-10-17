# 更新紀錄

## 2026-10-17

系統遷移至 Railway（Zeabur 停運）

- Zeabur 官方宣布 2026 年底結束營運，本系統已完整遷移至 Railway，新網址：https://bztimerecord.up.railway.app
- 資料庫（4 位員工、13 筆補休記錄、5 筆扣除對應）全數還原並核對；照片存於資料庫內，隨資料一併遷移
- 登入帳密維持不變（企發室 bz），但安全金鑰已更換，所有人需重新登入一次
- 接通 GitHub 自動部署：push 到 main 即自動更新網站
- 修正部署設定：.gitignore 的 *.sql 規則會漏掉啟動必需的 database/schema.sql，已在 .railwayignore 加入例外
- 備份機制：Railway 線上連續備份（PITR）＋ 本機每週自動備份（~/railway-backups，launchd 排程取代舊 cron，電腦睡著醒來會補跑）；舊的 Zeabur 每週備份 cron 保留至正式切換日
- 待辦：正式公告切換前，需先將 Zeabur 端最新資料重新同步到 Railway

（2025-12-26 以前的紀錄見 CHANGELOG_2025-12-26.md）
