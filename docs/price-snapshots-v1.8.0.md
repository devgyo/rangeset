# v1.8.0 官方价格与库存快照

[PR 1 迁移](../drizzle/0001_price_snapshots.sql)只创建两张表和索引。已有 `public.crawl_runs` 是每周抓取任务的运行记录。新增 `public.price_snapshot_crawl_runs` 专门记录快照运行，保留原表和原有行。

## GitHub Actions

唯一的 repository secret 是 `DATABASE_URL`，填 Neon direct 连接串。快照脚本会拒绝 Neon pooled 主机名。现有 Arc’teryx 定时任务也读同名 secret，配置时保留该任务所需的权限。快照任务读取 `brands`、`products`、`product_raw`、`manual_overrides`，向两个新表写入，其中运行表还需要 UPDATE。

任务每天 05:17 UTC（UTC+8 13:17）触发，沿用 Arc’teryx 爬虫的 concurrency group。商品清单来自数据库，应用前台商品可见性判断及停产状态过滤。只请求始祖鸟美国主站和 LEAF 站的公开商品页。LEAF 页面的库存记录为未知，价格沿用页面公开值。现有机器人规则、至少 1.5 秒请求间隔和防护停止行为都适用。每次 GitHub run 对应稳定的 UUID，GitHub rerun 复用同一个 UUID。手动跑脚本时可用 `SNAPSHOT_RUN_ID` 指定。已完成页不会重抓。

每个已完成商品独立提交。尺码×颜色记录优先使用厂商 SKU，只有 SKU 缺失时才用 `color|size`。颜色或尺码无展示名时可保留品牌提供的选项代码。金额用整数分存储，未知值及无法确认的零值记为 NULL。404 存一条 `missing_404`，只有商品页 HTTP 403/429 存一条 `blocked`，记录停止页序（从 1 开始）和原因后停止整个运行。商品页级状态使用预留的 `__page__` 键。机器人规则拒绝的地址不会发送商品请求。无 URL、robots 或策略拒绝、超时、解析失败各有单独的运行日志和汇总计数。这四类继续处理余下商品。汇总计数覆盖当前执行。仅呈现防护内容而未返回 403/429 的页面仍停止运行，运行日志保留原因。快照不改变前台价格或库存来源。

## 回滚

先停用快照工作流。确认可以丢弃新表的快照数据后，按依赖顺序执行以下 SQL。它只移除本次新表。直接 DROP 不会回退 Drizzle 迁移日志，如需从原迁移重新应用，应先恢复迁移前检查点，或编写新的前向迁移。

```sql
DROP TABLE public.price_snapshots;
DROP TABLE public.price_snapshot_crawl_runs;
```

## 验证

迁移已在 Neon 临时分支 `rangeset-v18-migration-qa` 验证。相同运行、商品和变体重插只留下 1 行。使用公开页面样本和模拟 HTTP 响应在本地库跑实际脚本，停产或前台隐藏的商品未请求。成功页写入 2 条变体、404 写入 1 条缺失、403 写入 1 条阻断，运行记为完成 2 页、停在第 3 页。同一 UUID 重跑后仍是 4 行。回滚脚本在测试分支事务内演练，原 `crawl_runs` 保持可见。生产未执行迁移。
