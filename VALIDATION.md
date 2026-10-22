# 有数本地验证记录

日期：2026-09-08  
范围：仅 `budget-planner/` 与本地预览；未发布、未托管、未连接支付账户，未修改真实账本内容。

## 自动化验证

- `node --check budget-planner/app.js`：通过。
- `node --check budget-planner/core.js`：通过。
- `node --test budget-planner/tests/core.test.mjs`：8/8 通过。
- `http://127.0.0.1:4173/`：HTTP 200，页面标题正确。
- 覆盖：3500 元模板、替代成本、计划/实际分离、退款/收入/转账、跨月日期、CSV/TSV 解析、编码方向、去重、分类记忆、备份校验和退款订单号边界。

## 浏览器操作验证

- 省钱实验室：把“打车出行”替代成本从 6 改为 10，输入时立即显示月净省 173.33 元、年估算 2079.96 元、2000 元心愿约 12 个月；卡片公式、桌面汇总和手机吸顶汇总同步更新。
- 手机 390 × 844：实验输入、吸顶汇总和底部导航可见，汇总未挡住正在编辑的输入框。
- 手机 360 × 800：页面 `scrollWidth` 与 `clientWidth` 同为 345 CSS 像素，无页面级横向溢出；吸顶汇总位于顶部，底部导航位于视口底部。
- 桌面 1365 × 850：预算页双栏正常；在演示账本中完成预算新增、金额/周频率编辑和保留标记，月折算正确。
- 月份筛选：从 2026-09 切到 2026-08 后显示 0 笔和 0 元，再切回可恢复当月演示流水。
- 流水编辑：把“城市小店”从“其他”改为“购物”后，列表分类即时更新，待确认从 1 变为 0。
- 真实流水复盘：演示首页显示“居住 3200 元”为本月已记录支出最多分类，并明确不含收入、退款和转账。
- 恢复预检：选择合成 JSON 后正确显示“恢复测试账本：1 项预算、1 笔流水”；在最终替换前取消，真实账本保持不变。
- 新手文案：健身通勤模板已改为“5 项健身、通勤与日常开销……可自由调整”，不再把模板说成用户既有预算。

## 限制与未执行项

- 本地浏览器的 Blob 下载未返回可观察的下载事件，因此只执行了“导出备份”入口，未把“文件确已落盘”记为通过；导出实现仍为本地 Blob 下载。
- 为保护已有真实账本，未点击恢复流程的最终“确认恢复”。恢复文件格式校验、摘要确认页及核心 `validateState` 已验证。
- 独立的新用户来源测试受限：现有服务只绑定 `127.0.0.1`，`localhost` 在浏览器中拒绝连接，`file://` 又被浏览器安全策略阻止。未启动第二个服务或绕过限制；空白状态与模板生成仍由核心测试和代码检查覆盖。

## 测试数据

- `tests/import-fixture.csv`：合成账单导入数据。
- `tests/restore-fixture.json`：合成备份恢复数据。
- 两者均不含用户真实流水，仅用于本地验证。

## Android APK（2026-09-07）

- `assembleDebug`：通过。
- `lintDebug`：通过，无阻断问题。
- 包名 `com.youshu.budget`，版本 `1.0.0`，最低 API 24，目标 API 36。
- APK v2 调试签名验证通过；证书为 Android Debug，仅用于本地安装测试。
- `aapt` 权限清单未发现应用权限；工程未声明 `INTERNET`、相机或存储权限。
- 已核对 APK 内含 `assets/www/index.html`、`app.js`、`core.js`、`styles.css`、`favicon.svg`。
- SHA-256：`85F31DF9923140ED2CA9F07FE036B16B28841105A2AC580211A32938268E03C3`。
- 未连接或安装到实体 Android 设备，因此文件选择器、WebView 持久化和真机视觉效果尚未做设备端运行验证。

## V2 信息架构与响应式验证（2026-09-08）

- 设计依据：按 `APP_LAYOUT_V2.md` 重构，仅改 `budget-planner/`；未修改设计源文件、`core.js` 算法、存储键 `youshu-book-v4` 或真实账本。
- `node --check budget-planner/app.js`：通过；`node --test budget-planner/tests/core.test.mjs`：8/8 通过。
- 手机 390 × 844：页面级 `clientWidth = scrollWidth = 375`，无横向溢出；首页汇总区 y=131–308，操作区 y=318–380，最近明细 y=390 起，底栏 y=774–844。
- 手机 360 × 740：页面级 `clientWidth = scrollWidth = 345`，无横向溢出；最近两笔的下边界分别为 y=540、604，均完整位于底栏 y=670 之上；第三笔在首屏仅部分出现。
- 首页待确认入口可直接进入“明细 / 待确认”，演示数据仅显示 1 笔待确认记录。
- 在首页、明细、计划、我的四个页面分别点击一次底部“记账”，均打开同一底部操作抽屉，包含一句话记账、手动记账和导入账单。
- 手动记账表单在 360 × 740 下使用底部抽屉；“确认并保存”按钮 y=686–730，位于视口内且不被底部导航遮挡。
- 计划页默认显示“固定预算”，演示账本 6 项；切换“省钱试算”时 0 个实验默认展开，点击后仅 1 个展开，试算数值可随输入即时更新。
- 桌面 1280 × 900：侧栏宽 208、主区无横向溢出；底部导航隐藏。明细使用桌面表格，演示账本 13 行，手机分组列表隐藏。
- 页面控制台无 error 或 warning。上述浏览器测试仅使用合成演示账本，未修改真实账本。

## Android APK V2（2026-09-08）

- `assembleDebug` 与 `lintDebug`：通过；生成 `有数-1.1.0-debug.apk`。
- 包名仍为 `com.youshu.budget`，版本 1.1.0（versionCode 2），最低 API 24、目标 API 36；升级安装继续使用同一应用包名与 WebView 本地存储空间。
- APK Signature Scheme v2 验证通过；签名者为 Android Debug，仅适合本地安装测试。
- `aapt dump permissions` 无权限条目；未声明 `INTERNET`、相机或存储权限。
- 已核对 APK 内含 `assets/www/index.html`、`app.js`、`core.js`、`styles.css`、`favicon.svg`。
- SHA-256：`AD2C2F8070D77280A5283B614BBF1FEB77FB6D732E2C61D8C0E061526359AEF5`。
- 未安装到实体 Android 设备；系统文件选择器、软键盘、WebView 持久化和真机视觉效果仍需设备端验收。

## Netlify 智能记账与 Android 1.3.0（2026-10-09）

- `node --check` 检查 `app.js`、`ai-core.js` 和 Netlify 函数，均通过。
- `node --test tests/*.test.mjs`：16/16 通过，覆盖文字与图片请求格式、未授权拒绝、只转发主动输入、模型草稿校验及原有账本计算。
- `android/build-apk.ps1`：离线 `assembleDebug` 与 `lintDebug` 均通过，生成 `有数-1.3.0-debug.apk`。
- 函数使用 `deepseek-flash` 图片输入；DeepSeek Key 只从 Netlify 环境变量读取，App 只保存加密的访问凭据。图片先在设备上压缩为 JPEG，再生成可编辑的待确认草稿。
- 已核对 DeepSeek 当前图片输入格式、Netlify 函数自定义路径、限速配置及请求体限制；这些检查不等于线上部署或真实请求通过。
- 尚未在实体 Android 设备上验证系统图片选择器、WebView 储存和到 Netlify 的请求；尚未配置 Netlify 站点变量，因而未进行真实 DeepSeek 调用。

## 每位使用者自填 DeepSeek Key 与 Android 1.4.0（2026-10-21）

- Android 原生层改为直接请求 `https://api.deepseek.com/chat/completions`；每位使用者在 App 内填写自己的 Key，密文保存在应用私有存储，加密密钥由 Android Keystore 管理。网页层没有读取已保存 Key 的接口，旧 Netlify 配对凭据不作迁移。
- 只发送主动输入的文字或压缩后的 JPEG 图片；模型结果继续经过客户端草稿校验和人工确认，不自动入账。仓库移除了 Netlify 函数，保留空发布目录配置，避免已有 Netlify 站点误发布仓库内容。
- `node --check app.js`、`node --check ai-core.js` 与 `node --test tests/*.test.mjs`：全部通过，12/12 项测试通过。
- `android/build-apk.ps1`：离线 `assembleDebug` 和 `lintDebug` 均通过，生成 `有数-1.4.0-debug.apk`。
- APK 包名 `com.youshu.budget`，版本 1.4.0（versionCode 5），最低 API 24、目标 API 36；`INTERNET` 是唯一声明的权限。APK 包含最新网页资源。
- APK v2 调试签名验证通过，证书 SHA-256 与 1.3.0 相同：`3f3ff2a603721ad977eb8d8a7d30e7af8321b6c68853c900947a97714a6a7302`。APK SHA-256：`480FB7D1E11D860EF1160E8EE4F65A1133E2EB177B647F8284BA2C9A0F609701`。
- 未在实体 Android 设备上安装或用真实 DeepSeek Key 发起请求；Key 保存、系统图片选择器、直连 API 和旧版覆盖安装仍需手机端验证。

## 记账确认体验与 Android 1.5.0（2026-10-22）

- 草稿改为手机卡片，保留描述、金额、日期、方向和分类的编辑；编辑后及保存前检查重复，新增重复候选取消默认勾选，人工核对后仍可选入。
- 原话随输入暂存于当前会话，关闭后再打开仍可修改；保存 Key 只修改设置，不再自动发送旧描述。AI 部分识别或失败后支持返回修改、重试和本地规则。
- 图片在本机压缩后先预览，点击“开始识别”才请求；失败可重试原图，关闭后清除暂存。取消请求通过原生桥中断客户端连接并忽略迟到结果。
- Android 返回键优先交给网页关闭弹窗/返回首页；销毁 Activity 时清理网络请求、文件选择回调和 WebView。CSV/JSON 异步读取在关闭或切换窗口后忽略旧结果。
- `node --check app.js`、`node --test tests/*.test.mjs` 通过，16/16 项测试通过，新增 4 项草稿重复状态回归测试。
- 浏览器演示账本验证：关闭重开保留原话、编辑两行成为相同流水后第二行取消勾选、人工重新勾选后可确认。390 像素普通预览与 360 像素模拟桥预览均无横向溢出；未建立或覆盖真实账本。
- 本地模拟 Android 桥验证：无 Key 时进入设置；保存测试 Key 后请求数仍为 0；取消进行中请求后计数为“请求 1 / 取消 1”且原话保留；模拟失败提供恢复入口；部分识别后可补充原话；选择合成收据图片不增加请求数，点击开始识别后才增加并返回待确认草稿。这些不等于真实 API/原生端到端验证。
- 离线 `assembleDebug` 与 `lintDebug` 通过，生成 `有数-1.5.0-debug.apk`，包名 `com.youshu.budget`，版本 1.5.0（versionCode 6），仅声明 `INTERNET` 权限。调试签名证书与 1.4.0 相同；最终 APK SHA-256：`793613428FE7097612C17DE2C2CC5089FC32737A01115E544C7E4FBCDCD1DD7D`。
- 未在真实 Android 手机安装、测试系统返回手势/图片选择器/旧版覆盖安装，未使用真实 DeepSeek Key 调用。
