# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.ts >> Novel Generation Flow
- Location: tests\flow.spec.ts:3:5

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.outline-content, textarea[placeholder*="大纲"]') to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - link "全自动小说生成器" [ref=e7] [cursor=pointer]:
        - /url: /
        - img [ref=e9]
        - generic [ref=e12]: 全自动小说生成器
      - navigation [ref=e13]:
        - link "首页" [ref=e14] [cursor=pointer]:
          - /url: /
          - img [ref=e15]
          - generic [ref=e18]: 首页
        - link "故事规划" [ref=e19] [cursor=pointer]:
          - /url: /story-plan
          - img [ref=e20]
          - generic [ref=e24]: 故事规划
        - link "生成小说" [ref=e25] [cursor=pointer]:
          - /url: /generate
          - img [ref=e26]
          - generic [ref=e28]: 生成小说
        - link "我的小说" [ref=e29] [cursor=pointer]:
          - /url: /novels
          - img [ref=e30]
          - generic [ref=e32]: 我的小说
        - link "任务中心" [ref=e33] [cursor=pointer]:
          - /url: /tasks
          - img [ref=e34]
          - generic [ref=e37]: 任务中心
        - link "设置" [ref=e38] [cursor=pointer]:
          - /url: /settings
          - img [ref=e39]
          - generic [ref=e42]: 设置
  - main [ref=e43]:
    - generic [ref=e44]:
      - generic [ref=e45]:
        - heading "创作新小说" [level=1] [ref=e46]
        - paragraph [ref=e47]: 填写以下信息，让AI为您创作精彩小说
      - generic [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]:
            - img [ref=e51]
            - heading "基本信息" [level=2] [ref=e54]
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]: 小说标题 *
              - textbox "小说标题 *" [ref=e58]:
                - /placeholder: 请输入小说标题
                - text: Robot Love
            - generic [ref=e59]:
              - generic [ref=e60]: 创作提示 *
              - textbox "创作提示 *" [ref=e61]:
                - /placeholder: 请输入一句话描述您的小说创意，例如：一个普通少年意外获得神秘力量，踏上修仙之路...
                - text: A story about a robot learning to love
              - paragraph [ref=e62]: 提示越详细，生成的小说内容越符合您的期望
        - generic [ref=e63]:
          - generic [ref=e64]:
            - img [ref=e65]
            - heading "写作模板" [level=2] [ref=e68]
          - generic [ref=e69]:
            - heading "选择写作模板" [level=3] [ref=e70]
            - generic [ref=e71]:
              - button "小说基础模板 适合新手的小说基础结构模板 默认" [ref=e72] [cursor=pointer]:
                - generic [ref=e73]: 小说基础模板
                - generic [ref=e74]: 适合新手的小说基础结构模板
                - generic [ref=e75]: 默认
              - button "玄幻小说模板 专为玄幻小说设计的写作模板 默认" [ref=e76] [cursor=pointer]:
                - generic [ref=e77]: 玄幻小说模板
                - generic [ref=e78]: 专为玄幻小说设计的写作模板
                - generic [ref=e79]: 默认
              - button "言情小说模板 专为言情小说设计的写作模板 默认" [ref=e80] [cursor=pointer]:
                - generic [ref=e81]: 言情小说模板
                - generic [ref=e82]: 专为言情小说设计的写作模板
                - generic [ref=e83]: 默认
              - button "短篇小说模板 适合短篇小说创作的模板 默认" [ref=e84] [cursor=pointer]:
                - generic [ref=e85]: 短篇小说模板
                - generic [ref=e86]: 适合短篇小说创作的模板
                - generic [ref=e87]: 默认
        - generic [ref=e88]:
          - generic [ref=e89]:
            - img [ref=e90]
            - heading "风格设置" [level=2] [ref=e93]
          - generic [ref=e94]:
            - generic [ref=e95]:
              - button "预设风格" [ref=e96] [cursor=pointer]
              - button "自定义配置" [ref=e97] [cursor=pointer]
            - generic [ref=e98]:
              - generic [ref=e99]:
                - heading "我的风格" [level=4] [ref=e100]
                - generic [ref=e101]:
                  - button "悬疑风格 适合悬疑小说，细节丰富，节奏变化 默认" [ref=e102] [cursor=pointer]:
                    - generic [ref=e103]: 悬疑风格
                    - generic [ref=e104]: 适合悬疑小说，细节丰富，节奏变化
                    - generic [ref=e105]: 默认
                  - button "科幻风格 适合科幻小说，逻辑严密，简洁准确 默认" [ref=e106] [cursor=pointer]:
                    - generic [ref=e107]: 科幻风格
                    - generic [ref=e108]: 适合科幻小说，逻辑严密，简洁准确
                    - generic [ref=e109]: 默认
                  - button "言情风格 适合言情小说，情感细腻，第一人称 默认" [ref=e110] [cursor=pointer]:
                    - generic [ref=e111]: 言情风格
                    - generic [ref=e112]: 适合言情小说，情感细腻，第一人称
                    - generic [ref=e113]: 默认
                  - button "玄幻风格 适合玄幻小说，节奏快，场面宏大 默认" [ref=e114] [cursor=pointer]:
                    - generic [ref=e115]: 玄幻风格
                    - generic [ref=e116]: 适合玄幻小说，节奏快，场面宏大
                    - generic [ref=e117]: 默认
                  - button "默认风格 通用默认风格，适合大多数小说类型 默认" [ref=e118] [cursor=pointer]:
                    - generic [ref=e119]: 默认风格
                    - generic [ref=e120]: 通用默认风格，适合大多数小说类型
                    - generic [ref=e121]: 默认
              - generic [ref=e122]:
                - heading "风格模板" [level=4] [ref=e123]
                - generic [ref=e124]:
                  - button "经典玄幻 传统玄幻风格，注重修炼体系和战斗场面" [ref=e125] [cursor=pointer]:
                    - generic [ref=e126]: 经典玄幻
                    - generic [ref=e127]: 传统玄幻风格，注重修炼体系和战斗场面
                  - button "史诗玄幻 宏大史诗风格，世界观广阔，人物众多" [ref=e128] [cursor=pointer]:
                    - generic [ref=e129]: 史诗玄幻
                    - generic [ref=e130]: 宏大史诗风格，世界观广阔，人物众多
                  - button "传统武侠 经典武侠风格，注重门派恩怨和武功招式" [ref=e131] [cursor=pointer]:
                    - generic [ref=e132]: 传统武侠
                    - generic [ref=e133]: 经典武侠风格，注重门派恩怨和武功招式
                  - button "修仙问道 仙侠风格，注重修炼境界和仙法神通" [ref=e134] [cursor=pointer]:
                    - generic [ref=e135]: 修仙问道
                    - generic [ref=e136]: 仙侠风格，注重修炼境界和仙法神通
                  - button "现代言情 现代都市言情风格，注重情感描写和人物关系" [ref=e137] [cursor=pointer]:
                    - generic [ref=e138]: 现代言情
                    - generic [ref=e139]: 现代都市言情风格，注重情感描写和人物关系
                  - button "硬科幻 硬科幻风格，注重科学原理和技术细节" [ref=e140] [cursor=pointer]:
                    - generic [ref=e141]: 硬科幻
                    - generic [ref=e142]: 硬科幻风格，注重科学原理和技术细节
                  - button "侦探悬疑 侦探悬疑风格，注重推理和线索铺垫" [ref=e143] [cursor=pointer]:
                    - generic [ref=e144]: 侦探悬疑
                    - generic [ref=e145]: 侦探悬疑风格，注重推理和线索铺垫
                  - button "历史史诗 历史题材风格，注重历史细节和时代背景" [ref=e146] [cursor=pointer]:
                    - generic [ref=e147]: 历史史诗
                    - generic [ref=e148]: 历史题材风格，注重历史细节和时代背景
                  - button "现代都市 现代都市风格，注重职场生活和情感故事" [ref=e149] [cursor=pointer]:
                    - generic [ref=e150]: 现代都市
                    - generic [ref=e151]: 现代都市风格，注重职场生活和情感故事
            - generic [ref=e152]:
              - heading "风格预览" [level=4] [ref=e153]
              - paragraph [ref=e154]: 请以一般风格创作小说。风格要求：小说类型一般，叙事视角第三人称，语言风格现代，描写风格生动，节奏风格适中，对话风格自然。
          - generic [ref=e155]:
            - generic [ref=e156]: 目标字数
            - generic [ref=e157]:
              - button "5千字短篇" [ref=e158] [cursor=pointer]
              - button "1万字中篇" [ref=e159] [cursor=pointer]
              - button "5万字长篇" [ref=e160] [cursor=pointer]
              - button "10万字长篇" [ref=e161] [cursor=pointer]
              - button "50万字巨著" [ref=e162] [cursor=pointer]
              - button "100万字巨著" [ref=e163] [cursor=pointer]
        - generic [ref=e164]:
          - generic [ref=e165]:
            - img [ref=e166]
            - heading "图片上传" [level=2] [ref=e170]
          - generic [ref=e171]:
            - generic [ref=e172]: 上传图片（可选）
            - generic [ref=e175] [cursor=pointer]:
              - img [ref=e176]
              - paragraph [ref=e179]: 点击上传
              - paragraph [ref=e180]: 最多上传 5 张图片
          - paragraph [ref=e181]: 上传图片可以帮助AI更好地理解您的创意场景，生成更符合您期望的内容
        - generic [ref=e183]:
          - generic [ref=e184]:
            - img [ref=e185]
            - heading "大纲设置（可选）" [level=2] [ref=e188]
          - generic [ref=e189]:
            - button "生成中..." [disabled] [ref=e190]:
              - img [ref=e191]
              - generic [ref=e193]: 生成中...
            - generic [ref=e194] [cursor=pointer]:
              - radio "文本大纲" [ref=e195]
              - generic [ref=e196]: 文本大纲
            - generic [ref=e197] [cursor=pointer]:
              - radio "结构化大纲" [ref=e198]
              - generic [ref=e199]: 结构化大纲
        - generic [ref=e200]:
          - generic [ref=e201]:
            - img [ref=e202]
            - heading "逻辑要求（可选）" [level=2] [ref=e205]
          - generic [ref=e206]:
            - generic [ref=e207]: 逻辑限制条件
            - textbox "逻辑限制条件" [ref=e208]:
              - /placeholder: "请输入小说的逻辑限制条件，例如：\n- 1943年当兵没有火车\n- 主角不能使用现代科技\n- 历史事件必须符合真实历史\n- 人物行为要符合当时的社会背景\n..."
            - paragraph [ref=e209]: 输入逻辑要求可以帮助AI生成更符合现实逻辑的内容，避免出现不合理的情节
        - generic [ref=e210]:
          - button "填充示例数据" [ref=e211] [cursor=pointer]:
            - img [ref=e212]
            - generic [ref=e214]: 填充示例数据
          - button "开始生成" [ref=e215] [cursor=pointer]:
            - img [ref=e216]
            - generic [ref=e219]: 开始生成
  - contentinfo [ref=e220]:
    - generic [ref=e222]:
      - generic [ref=e223]: © 2026 全自动小说生成器. 保留所有权利.
      - generic [ref=e224]:
        - link [ref=e225] [cursor=pointer]:
          - /url: https://github.com
          - img [ref=e226]
        - generic [ref=e229]:
          - text: 用
          - img [ref=e230]
          - text: 打造
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Novel Generation Flow', async ({ page }) => {
  4  |   console.log('Navigating to Home...');
  5  |   await page.goto('http://localhost:5173/');
  6  |   await expect(page).toHaveTitle(/小说生成器/);
  7  | 
  8  |   console.log('Clicking Start Creating...');
  9  |   await page.click('text=开始创作');
  10 |   await page.waitForURL('**/generate');
  11 | 
  12 |   console.log('Filling form...');
  13 |   await page.fill('textarea[placeholder*="一句话"]', 'A story about a robot learning to love');
  14 |   await page.fill('input[placeholder*="小说标题"]', 'Robot Love');
  15 |   
  16 |   // Click Generate Outline Auto
  17 |   console.log('Clicking Auto Generate Outline...');
  18 |   // The button text is "AI 自动生成大纲" or similar
  19 |   await page.click('button:has-text("自动生成")');
  20 | 
  21 |   // Wait for outline to appear
  22 |   console.log('Waiting for outline...');
> 23 |   await page.waitForSelector('.outline-content, textarea[placeholder*="大纲"]', { timeout: 10000 });
     |              ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  24 | 
  25 |   console.log('Clicking Generate Novel...');
  26 |   // Wait a bit to ensure everything is settled
  27 |   await page.waitForTimeout(1000);
  28 |   
  29 |   // Click "生成小说"
  30 |   await page.click('button:has-text("生成小说")');
  31 |   
  32 |   // Should redirect to /novels/:id
  33 |   console.log('Waiting for redirection to novel page...');
  34 |   await page.waitForURL('**/novels/*', { timeout: 15000 });
  35 |   
  36 |   console.log('Checking generation status...');
  37 |   // Wait for the status to show generating or completed
  38 |   await expect(page.locator('text=生成中').or(page.locator('text=已完成'))).toBeVisible({ timeout: 15000 });
  39 |   
  40 |   console.log('Flow test completed successfully!');
  41 | });
```