from playwright.sync_api import sync_playwright
import os
import json

BASE_URL = 'http://localhost:5174'
SCREENSHOTS_DIR = os.path.join(os.getcwd(), 'test-screenshots')

if not os.path.exists(SCREENSHOTS_DIR):
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def screenshot(page, name):
    page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f'{name}.png'), full_page=True)

results = []

def record(name, passed, error=None, details=None):
    results.append({'name': name, 'passed': passed, 'error': error, 'details': details})
    icon = '✅' if passed else '❌'
    msg = f'{icon} {name}'
    if details:
        msg += f' - {details}'
    print(msg)
    if error:
        print(f'   Error: {error}')

def setup_workflow_data(page):
    page.evaluate('''() => {
        const PREFIX = 'story_workflow_';
        const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX) || k.startsWith('story_'));
        keys.forEach(k => localStorage.removeItem(k));

        localStorage.setItem(PREFIX + 'core', JSON.stringify({
            id: 'test-workflow-001', novelId: null, currentStage: 'chapter_execution', version: 1,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }));
        localStorage.setItem(PREFIX + 'version', '1');

        localStorage.setItem(PREFIX + 'stage_rhythm_breakdown', JSON.stringify({
            stage: 'rhythm_breakdown', status: 'completed',
            data: {
                currentVolumeId: 'vol-1',
                chapters: [
                    { chapterNumber: 1, title: '初入江湖', summary: '主角踏入江湖的第一步', keyPlotPoints: ['遭遇劫匪', '遇见恩师'], involvedCharacters: ['林风', '老者'], estimatedWordCount: 3000 },
                    { chapterNumber: 2, title: '拜师学艺', summary: '主角拜入师门学习武艺', keyPlotPoints: ['通过考验', '获得传承'], involvedCharacters: ['林风', '师父'], estimatedWordCount: 3000 },
                    { chapterNumber: 3, title: '初露锋芒', summary: '主角在比武中崭露头角', keyPlotPoints: ['比武获胜', '引起注意'], involvedCharacters: ['林风', '对手'], estimatedWordCount: 3000 },
                ],
                volumeChapters: { 'vol-1': [
                    { chapterNumber: 1, title: '初入江湖', summary: '主角踏入江湖的第一步', keyPlotPoints: ['遭遇劫匪', '遇见恩师'], involvedCharacters: ['林风', '老者'], estimatedWordCount: 3000 },
                    { chapterNumber: 2, title: '拜师学艺', summary: '主角拜入师门学习武艺', keyPlotPoints: ['通过考验', '获得传承'], involvedCharacters: ['林风', '师父'], estimatedWordCount: 3000 },
                    { chapterNumber: 3, title: '初露锋芒', summary: '主角在比武中崭露头角', keyPlotPoints: ['比武获胜', '引起注意'], involvedCharacters: ['林风', '对手'], estimatedWordCount: 3000 },
                ]}
            },
            startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        }));

        localStorage.setItem(PREFIX + 'stage_project_setting', JSON.stringify({
            stage: 'project_setting', status: 'completed',
            data: { title: '测试小说', genre: '玄幻', coreSellingPoint: '热血升级', targetReaderFeeling: '爽快', first30ChaptersPromise: '快速入戏', styleHint: '轻松幽默' },
            startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        }));

        localStorage.setItem(PREFIX + 'stage_character_preparation', JSON.stringify({
            stage: 'character_preparation', status: 'completed',
            data: {
                mainCharacters: [{ name: '林风', role: '主角', personality: '坚韧不拔', languageStyle: '直率', catchphrase: ['我命由我不由天'], dialectHint: '' }],
                supportingCharacters: [
                    { name: '老者', role: '配角', personality: '神秘莫测', languageStyle: '深沉', catchphrase: [], dialectHint: '' },
                    { name: '师父', role: '配角', personality: '严厉慈爱', languageStyle: '文言', catchphrase: [], dialectHint: '' },
                ],
            },
            startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        }));

        localStorage.setItem(PREFIX + 'stage_chapter_execution', JSON.stringify({
            stage: 'chapter_execution', status: 'in_progress',
            data: { novelId: null, generatedChapters: [] },
            startedAt: new Date().toISOString(),
        }));

        localStorage.setItem(PREFIX + 'meta', JSON.stringify({
            version: 1, timestamp: new Date().toISOString(),
            stageKeys: [PREFIX + 'stage_inspiration', PREFIX + 'stage_project_setting', PREFIX + 'stage_macro_planning', PREFIX + 'stage_character_preparation', PREFIX + 'stage_volume_strategy', PREFIX + 'stage_rhythm_breakdown', PREFIX + 'stage_chapter_execution'],
            totalSize: 5000,
        }));
    }''')

def click_gen_tab(page):
    page.locator('.flex.border-b button:has-text("生成")').first.click()

def click_audit_tab(page):
    page.locator('.flex.border-b button:has-text("审计与修复")').first.click()

def run_tests():
    print('\n🚀 开始测试章节执行页面功能\n')
    print('=' * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        console_errors = []
        page.on('console', lambda msg: console_errors.append(f'[{msg.type}] {msg.text}') if msg.type == 'error' else None)

        try:
            page.goto(f'{BASE_URL}/', wait_until='networkidle', timeout=30000)
            setup_workflow_data(page)

            # ===== 测试1: 页面加载 =====
            print('\n📋 测试1: 页面加载与初始化')
            page.goto(f'{BASE_URL}/chapter-execution', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000)
            screenshot(page, '01-page-load')

            h1 = page.locator('h1').first
            page_title = h1.text_content() if h1.count() > 0 else ''
            record('页面标题显示', '章节执行' in page_title if page_title else False, details=f'标题: {page_title}')

            workflow_text = page.locator('text=工作流').first
            has_workflow = workflow_text.count() > 0 and workflow_text.is_visible()
            record('工作流ID显示', has_workflow)

            # ===== 测试2: 章节导航列表 =====
            print('\n📋 测试2: 章节导航列表')
            chapter_count = page.locator('button:has-text("初入江湖"), button:has-text("拜师学艺"), button:has-text("初露锋芒")').count()
            record('章节列表加载', chapter_count > 0, details=f'找到 {chapter_count} 个章节')

            progress_section = page.locator('text=章节进度').count()
            record('进度统计显示', progress_section > 0)

            completion_rate = page.locator('text=完成率').count()
            record('完成率显示', completion_rate > 0)

            # ===== 测试3: 章节选择 =====
            print('\n📋 测试3: 章节选择功能')
            first_chapter = page.locator('button:has-text("初入江湖")').first
            if first_chapter.count() > 0:
                first_chapter.click()
                page.wait_for_timeout(1000)
                screenshot(page, '03-chapter-selected')

                h2 = page.locator('h2').first
                chapter_title = h2.text_content() if h2.count() > 0 else ''
                record('选择章节后标题更新', '初入江湖' in chapter_title if chapter_title else False, details=f'标题: {chapter_title}')
            else:
                record('选择章节后标题更新', False, '未找到章节按钮')

            # ===== 测试4: 编辑器区域 =====
            print('\n📋 测试4: 编辑器区域')
            editor = page.locator('.ql-editor').count()
            record('富文本编辑器加载', editor > 0)

            if editor > 0:
                editor_area = page.locator('.ql-editor').first
                editor_area.click()
                page.wait_for_timeout(300)
                page.keyboard.type('这是测试输入的章节内容，用于验证编辑器功能是否正常工作。')
                page.wait_for_timeout(1500)
                screenshot(page, '04-editor-input')

                editor_content = editor_area.inner_text()
                record('编辑器输入内容', '测试输入' in editor_content, details=f'内容: {editor_content[:50]}')

                word_display = page.locator('text=字数').first
                word_text = word_display.text_content() if word_display.count() > 0 else ''
                record('字数统计更新', word_text is not None and len(word_text) > 0, details=f'字数显示: {word_text}')

            # ===== 测试5: 右侧面板 - 生成面板 =====
            print('\n📋 测试5: 右侧面板 - 生成面板')
            click_gen_tab(page)
            page.wait_for_timeout(500)

            target_word_count = page.locator('text=目标字数').count()
            record('生成参数 - 目标字数', target_word_count > 0)

            perspective = page.locator('text=写作视角').count()
            record('生成参数 - 写作视角', perspective > 0)

            rhythm = page.locator('text=节奏类型').count()
            record('生成参数 - 节奏类型', rhythm > 0)

            gen_button = page.locator('button:has-text("生成章节")').count()
            record('生成按钮存在', gen_button > 0)

            # ===== 测试6: 高级设置展开 =====
            print('\n📋 测试6: 高级设置')
            adv_btn = page.locator('button:has-text("高级设置")').first
            if adv_btn.count() > 0 and adv_btn.is_visible():
                adv_btn.click()
                page.wait_for_timeout(500)
                screenshot(page, '06-advanced-settings')

                writing_style = page.locator('text=写作风格').count()
                record('高级设置 - 写作风格', writing_style > 0)

                emotional_tone = page.locator('text=情感基调').count()
                record('高级设置 - 情感基调', emotional_tone > 0)

                special_reqs = page.locator('text=特殊要求').count()
                record('高级设置 - 特殊要求', special_reqs > 0)
            else:
                record('高级设置展开', False, '未找到高级设置按钮')

            # ===== 测试7: 润色设置 =====
            print('\n📋 测试7: 润色设置')
            auto_polish = page.locator('text=自动润色').count()
            record('润色设置 - 自动润色开关', auto_polish > 0)

            # ===== 测试8: 审计与修复面板 =====
            print('\n📋 测试8: 审计与修复面板')
            click_audit_tab(page)
            page.wait_for_timeout(500)
            screenshot(page, '08-audit-panel')

            audit_button = page.locator('button:has-text("开始审计")').count()
            record('审计按钮存在', audit_button > 0)

            polish_button = page.locator('button:has-text("润色章节")').count()
            record('润色按钮存在', polish_button > 0)

            # ===== 测试9: 面板切换 =====
            print('\n📋 测试9: 面板切换')
            left_toggle = page.locator('button[title="隐藏章节列表"]').first
            if left_toggle.count() > 0:
                left_toggle.click()
                page.wait_for_timeout(500)
                screenshot(page, '09a-left-panel-hidden')

                chapter_nav = page.locator('text=章节进度').first
                chapter_nav_visible = chapter_nav.is_visible() if chapter_nav.count() > 0 else False
                record('左面板隐藏', not chapter_nav_visible, details=f'章节进度可见: {chapter_nav_visible}')

                left_show = page.locator('button[title="显示章节列表"]').first
                if left_show.count() > 0:
                    left_show.click()
                page.wait_for_timeout(500)

                chapter_nav_restored = page.locator('text=章节进度').first
                chapter_nav_restored_visible = chapter_nav_restored.is_visible() if chapter_nav_restored.count() > 0 else False
                record('左面板恢复', chapter_nav_restored_visible)
            else:
                record('左面板切换', False, '未找到左面板切换按钮')

            right_toggle = page.locator('button[title="隐藏工具面板"]').first
            if right_toggle.count() > 0:
                right_toggle.click()
                page.wait_for_timeout(500)
                screenshot(page, '09b-right-panel-hidden')

                right_panel = page.locator('.w-96.border-l').first
                right_panel_visible = right_panel.is_visible() if right_panel.count() > 0 else False
                record('右面板隐藏', not right_panel_visible)

                right_show = page.locator('button[title="显示工具面板"]').first
                if right_show.count() > 0:
                    right_show.click()
                page.wait_for_timeout(500)

                right_panel_restored = page.locator('.w-96.border-l').first
                right_panel_restored_visible = right_panel_restored.is_visible() if right_panel_restored.count() > 0 else False
                record('右面板恢复', right_panel_restored_visible)
            else:
                record('右面板切换', False, '未找到右面板切换按钮')

            # ===== 测试10: 保存按钮 =====
            print('\n📋 测试10: 保存功能')
            save_button = page.locator('button:has-text("保存")').count()
            record('保存按钮存在', save_button > 0)

            # ===== 测试11: 导出小说按钮 =====
            print('\n📋 测试11: 导出小说功能')
            export_button = page.locator('button:has-text("导出小说")').count()
            record('导出小说按钮存在', export_button > 0)

            # ===== 测试12: 一键生成按钮 =====
            print('\n📋 测试12: 一键生成功能')
            # Use header-specific selector to avoid matching other "生成" buttons
            auto_gen = page.locator('header button:has-text("一键生成")').count()
            record('一键生成按钮存在', auto_gen > 0)

            # ===== 测试13: 章节筛选功能 =====
            print('\n📋 测试13: 章节筛选功能')
            search_input = page.locator('input[placeholder*="搜索"]').count()
            record('搜索框存在', search_input > 0)

            filter_buttons = page.locator('button:has-text("全部"), button:has-text("待写"), button:has-text("写作中"), button:has-text("已完成"), button:has-text("需修复")').count()
            record('状态筛选按钮', filter_buttons > 0, details=f'找到 {filter_buttons} 个筛选按钮')

            # ===== 测试14: 章节切换持久化 =====
            print('\n📋 测试14: 章节切换与内容保持')
            first_ch = page.locator('button:has-text("初入江湖")').first
            if first_ch.count() > 0:
                first_ch.click()
                page.wait_for_timeout(800)

            editor_area = page.locator('.ql-editor').first
            if editor_area.count() > 0:
                editor_area.click()
                page.wait_for_timeout(200)
                page.keyboard.type('持久化测试内容')
                page.wait_for_timeout(5000)

            second_chapter = page.locator('button:has-text("拜师学艺")').first
            if second_chapter.count() > 0:
                second_chapter.click()
                page.wait_for_timeout(2000)
                screenshot(page, '14a-switch-chapter')

                h2 = page.locator('h2').first
                title2 = h2.text_content() if h2.count() > 0 else ''
                record('切换到第二章', '拜师学艺' in title2 if title2 else False, details=f'标题: {title2}')

                first_chapter_again = page.locator('button:has-text("初入江湖")').first
                if first_chapter_again.count() > 0:
                    first_chapter_again.click()
                    page.wait_for_timeout(2000)

                    editor_after = page.locator('.ql-editor').first
                    content_after = editor_after.inner_text() if editor_after.count() > 0 else ''
                    record('切回第一章内容保持', '持久化测试' in content_after, details=f'内容: {content_after[:50]}')

            # ===== 测试15: localStorage 持久化 =====
            print('\n📋 测试15: localStorage 持久化')
            workflow_core = page.evaluate('() => localStorage.getItem("story_workflow_core")')
            record('工作流核心数据持久化', workflow_core is not None, details='存在' if workflow_core else '不存在')

            chapter_exec = page.evaluate('() => localStorage.getItem("story_workflow_stage_chapter_execution")')
            record('章节执行阶段数据持久化', chapter_exec is not None, details='存在' if chapter_exec else '不存在')

            exec_data = json.loads(chapter_exec) if chapter_exec else {}
            generated_chapters = exec_data.get('data', {}).get('generatedChapters', [])
            ch1_data = next((ch for ch in generated_chapters if ch.get('chapterNumber') == 1), None)
            # Note: stripChapterContent removes content from localStorage, so we check if the chapter exists
            record('章节元数据持久化到store', ch1_data is not None, details=f'generatedChapters数量: {len(generated_chapters)}')

            # ===== 测试16: 页面刷新后数据恢复 =====
            print('\n📋 测试16: 页面刷新后数据恢复')
            page.reload(wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(3000)
            screenshot(page, '16-after-refresh')

            chapters_after = page.locator('button:has-text("初入江湖"), button:has-text("拜师学艺"), button:has-text("初露锋芒")').count()
            record('刷新后章节列表恢复', chapters_after > 0, details=f'找到 {chapters_after} 个章节')

            progress_after = page.locator('text=章节进度').count()
            record('刷新后进度统计恢复', progress_after > 0)

            # ===== 测试17: 批量生成面板 =====
            print('\n📋 测试17: 批量生成面板')
            first_ch = page.locator('button:has-text("初入江湖")').first
            if first_ch.count() > 0:
                first_ch.click()
                page.wait_for_timeout(800)

            click_gen_tab(page)
            page.wait_for_timeout(500)

            batch_btn = page.locator('button:has-text("批量生成")').first
            if batch_btn.count() > 0 and batch_btn.is_visible():
                batch_btn.click()
                page.wait_for_timeout(500)
                screenshot(page, '17-batch-panel')

                start_ch = page.locator('text=起始章节').count()
                record('批量生成 - 起始章节', start_ch > 0)

                end_ch = page.locator('text=结束章节').count()
                record('批量生成 - 结束章节', end_ch > 0)

                auto_audit = page.locator('text=自动审计').count()
                record('批量生成 - 自动审计选项', auto_audit > 0)
            else:
                record('批量生成面板', False, '未找到批量生成按钮')

            # ===== 测试18: 后端API连通性 =====
            print('\n📋 测试18: 后端API连通性')
            api_response = page.evaluate('''async () => {
                try {
                    const res = await fetch('/api/health');
                    const data = await res.json();
                    return { ok: res.ok, status: data.status };
                } catch (e) {
                    return { ok: false, error: String(e) };
                }
            }''')
            record('后端健康检查', api_response.get('ok', False), api_response.get('error'), details=f"状态: {api_response.get('status')}")

            # ===== 测试19: 章节内容保存到后端 =====
            print('\n📋 测试19: 章节内容保存到后端')
            save_result = page.evaluate('''async () => {
                try {
                    const res = await fetch('/api/chapter-execution/chapter/test-chapter-save/content', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: '<p>测试保存内容</p>' }),
                    });
                    const data = await res.json();
                    return { ok: res.ok, success: data.success };
                } catch (e) {
                    return { ok: false, error: String(e) };
                }
            }''')
            record('章节内容保存API', save_result.get('ok', False), save_result.get('error'), details=f"成功: {save_result.get('success')}")

            # ===== 测试20: 获取章节内容 =====
            print('\n📋 测试20: 获取章节内容')
            get_result = page.evaluate('''async () => {
                try {
                    const res = await fetch('/api/chapter-execution/chapter/test-chapter-save/content');
                    const data = await res.json();
                    return { ok: res.ok, hasContent: !!(data.data && data.data.content) };
                } catch (e) {
                    return { ok: false, error: String(e) };
                }
            }''')
            record('获取章节内容API', get_result.get('ok', False), get_result.get('error'), details=f"有内容: {get_result.get('hasContent')}")

            # ===== 测试21: 清空编辑器内容 =====
            print('\n📋 测试21: 清空编辑器内容')
            first_ch = page.locator('button:has-text("初入江湖")').first
            if first_ch.count() > 0:
                first_ch.click()
                page.wait_for_timeout(800)

            clear_btn = page.locator('button:has-text("清空")').first
            if clear_btn.count() > 0 and clear_btn.is_visible():
                page.on('dialog', lambda dialog: dialog.accept())
                clear_btn.click()
                page.wait_for_timeout(1000)
                screenshot(page, '21-cleared-content')

                editor_cleared = page.locator('.ql-editor').first
                content_cleared = editor_cleared.inner_text() if editor_cleared.count() > 0 else 'NOT_EMPTY'
                record('清空编辑器', content_cleared.strip() == '', details=f'内容: "{content_cleared[:30]}"')
            else:
                record('清空编辑器', False, '未找到清空按钮')

            # ===== 测试22: 审计面板完整性 =====
            print('\n📋 测试22: 审计面板完整性检查')
            click_audit_tab(page)
            page.wait_for_timeout(500)

            audit_btn = page.locator('button:has-text("开始审计")').count()
            record('审计面板 - 审计按钮', audit_btn > 0)

            polish_btn = page.locator('button:has-text("润色章节")').count()
            record('审计面板 - 润色按钮', polish_btn > 0)

            # ===== 测试23: 排序功能 =====
            print('\n📋 测试23: 排序功能')
            sort_select = page.locator('select').first
            if sort_select.count() > 0 and sort_select.is_visible():
                sort_options = sort_select.locator('option').count()
                record('排序选择器', sort_options > 0, details=f'{sort_options} 个排序选项')
            else:
                record('排序选择器', False, '未找到排序选择器')

            # ===== 测试24: Console 错误检查 =====
            print('\n📋 测试24: Console 错误检查')
            critical_errors = [e for e in console_errors if 'Uncaught' in e or 'TypeError' in e or 'ReferenceError' in e]
            record('无严重 Console 错误', len(critical_errors) == 0, details=f'发现 {len(critical_errors)} 个严重错误')
            if critical_errors:
                for err in critical_errors[:5]:
                    print(f'   ⚠️ {err[:100]}')

        except Exception as error:
            print(f'\n💥 测试执行出错: {error}')
            try:
                screenshot(page, 'error-state')
            except:
                pass
        finally:
            browser.close()

    print('\n' + '=' * 60)
    print('📊 测试结果汇总')
    print('=' * 60)

    passed = sum(1 for r in results if r['passed'])
    failed = sum(1 for r in results if not r['passed'])
    total = len(results)

    print(f'\n总计: {total} 项测试')
    print(f'通过: {passed} ✅')
    print(f'失败: {failed} ❌')
    print(f'通过率: {((passed / total) * 100):.1f}%')

    if failed > 0:
        print('\n❌ 失败项:')
        for r in results:
            if not r['passed']:
                error_msg = f": {r['error']}" if r['error'] else ''
                print(f"  - {r['name']}{error_msg}")

    print(f'\n截图保存在: {SCREENSHOTS_DIR}')
    print('测试完成!\n')

    return failed

if __name__ == '__main__':
    exit_code = run_tests()
    exit(1 if exit_code > 0 else 0)
