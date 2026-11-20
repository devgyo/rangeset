# Rangeset 多语言 v1 本地验收

## 路由与 SEO

英文沿用 `/`、`/products`、`/products/[slug]`、`/compare` 和 `/jackets`。中文加 `/zh`，日文加 `/ja`。页面 URL 决定语言，直接打开旧英文链接始终得到英文。页头切换器保留当前路径、查询参数和锚点，并用 `NEXT_LOCALE` cookie 记录主动选择。路由不会根据 IP、浏览器语言或 cookie 改写直接访问的路径。

原有英文 canonical 的路径、英文 SEO 标题和描述、对比页的 noindex，以及夹克详情的 308 迁移规则都保留。此前没有 canonical 的对比入口现在有 `/compare` canonical。内容页新增 `en`、`zh-Hans`、`ja`、`x-default` 的 HTML alternate。Sitemap 将原有可索引路径扩展为三个版本，保留示例和对比页的索引策略。

## 字典与缺口

| 语言 | 术语表 key | 有本语言词条 | 英文回退 | 其中 ? 说明 |
| --- | ---: | ---: | ---: | ---: |
| 英文 | 499 | 499 | 0 | 0 |
| 简体中文 | 499 | 458 | 41 | 14 |
| 日文 | 499 | 458 | 41 | 14 |

本轮补译 108 个已有键，并加入 27 个纤维、成分格式、绒种和参考口径键。135 个词条均标为 `needs_review`。现有在用界面词条已齐全。中、日文各剩 27 个已下线鞋类兼容键和 14 个未试译的 `help.*` 使用英文。开发日志按语言列出缺少的说明 key。原先批准的五条试译原样保留，品牌名、技术名和来源原文保留原样。

运行 `pnpm i18n-check` 校验 CSV、字典、风格指南试译、保护词和界面 key。术语表更新后使用 `pnpm i18n-check --write` 重新生成字典与 [审校清单](review.md)。

## 页面实查

| 页面 | 简体中文 | 日文 |
| --- | --- | --- |
| Beta AR Jacket | 面料、衣身、面料名称、克重 136 g/m²、旦数 100D、成分 100% 尼龙。显示 ● 有。 | 素材、ボディ、素材名、生地の目付 136 g/m²、デニール 100D、組成 100%ナイロン。显示 ● あり。 |
| Adze Pant – Walk Gently | 面料显示 TerraTex™、126 g/m²、95% 尼龙 · 5% 氨纶、平纹与含氨纶。 | 素材显示 TerraTex™、126 g/m²、95%ナイロン · 5%ポリウレタン、平織り、ポリウレタン混。 |
| 两款对比 | 标题是商品对比。基本信息、尺寸与版型、面料分组已本地化。 | 标题是商品を比較。基本情報、サイズ・フィット、素材分组已本地化。 |
| 目录 | 商品目录，搜索占位为搜索商品或参数。 | 商品カタログ，搜索占位为商品名・スペックで検索。 |

同样检查了上述四页的英文版。中、日文全部在 390px 实测了页面宽度，两款对比列仍可并排。切换语言保留同一款商品、锚点以及对比 ID，已检查 cookie。Beta AR 的证据与英文逐字一致，价格保留 $650 USD。中文和日文的 Denier 说明与克重说明的英文回退已在浏览器打开验证。

## 改动文件

- 路由与 SEO：`app/[locale]/` 下的布局、首页、产品目录和详情、对比页、旧夹克路由、找不到页面，另有 `app/sitemap.ts`、`proxy.ts` 和 `next.config.ts`。
- 本地化基础：`i18n/routing.ts`、`i18n/navigation.ts`、`i18n/request.ts`、`i18n/seo.ts`、`i18n/copy.ts`。
- 界面：`components/catalog/language-switcher.tsx`、`catalog-browser.tsx`、`compare-selection.tsx`、`comparison-grid.tsx`、`parameter-help.tsx`、`parameter-table.tsx`、`product-gallery.tsx`、`product-media.tsx`，以及旧夹克页的 `components/jacket-table.tsx`、`components/spec-value.tsx` 和 `lib/specs.ts`。
- 字典与检查：`messages/en.json`、`messages/zh.json`、`messages/ja.json`、`scripts/i18n-check`、`lib/tests/i18n.test.ts`、`package.json`、`pnpm-lock.yaml`，及本目录术语文档和报告。
