# v1.8.0 排序、结构化数据、出站与缓存

本组改动接在快照改动之后，独立迁移 [0002_outbound_clicks.sql](../drizzle/0002_outbound_clicks.sql) 只创建点击表及索引。原有 Vercel `DATABASE_URL` 需要能插入点击表，并能使用其 ID 序列。浏览器走原生链接。服务端按原样匹配 `products.external_id`，用查询得到的品牌校验官网地址。没有唯一匹配或官网校验失败时返回 404。HEAD 不产生记录。识别出的爬虫请求记 `is_bot=true`，人类点击统计使用 `WHERE NOT is_bot`。来源只记录 origin 和 path。失去点击写入能力时，已查到的品牌目标仍可跳转。

回滚时先退回 Web 代码，再在确认可丢弃新点击记录后执行 `DROP TABLE public.outbound_clicks;`。直接 DROP 不会回退 Drizzle 迁移日志。迁移和 DROP 顺序已在 Neon 测试分支验证。

品类和详情页以五分钟 ISR 生成。总目录按请求生成，带筛选的 URL 继续由浏览器处理。HTML 仅含首屏 24 张卡与筛选选项。筛选、排序和翻页按需加载缓存的精简目录 JSON。前台继续读取原有价格数据。

| 路由 | 未压缩 HTML，前 → 后 | Brotli HTML 传输，前 → 后 | 首屏 JS，前 → 后 |
| --- | ---: | ---: | ---: |
| `/products` | 1,906,204 → 225,568 B | 106,961 → 19,471 B | 666,283 → 666,519 B |
| `/products/category/hardshell-jackets` | 457,981 → 224,963 B | 30,886 → 18,646 B | 666,283 → 666,519 B |

前值来自当前公开站，后值来自使用 Neon 测试分支目录的本地生产构建。两套原始 HTML 用同一个本地 Brotli HTTP 测试服务、相同压缩质量 q=5 复测。首屏 JS 是 Chromium 390px 冷加载的 11 个同源脚本解码体积。已实测品类和详情的 ISR 响应，以及带筛选目录的动态响应。

三语详情解析出带 canonical URL 的 Offer。用本地数据库的两种变体价格做 HTTP 验证，输出 USD 550–650、offerCount 2 的 AggregateOffer，两层 URL 均为详情页 canonical。出站成功返回 302，未知 SKU 和仿冒域名返回 404。写入失败仍跳转。三语详情和对比的原生官网链接及目录搜索均通过浏览器检查。
