/**
 * 清理工作流数据的工具脚本
 * 
 * 用于修复数据格式问题或清除旧数据
 */

export function cleanWorkflowData() {
  try {
    // 检查是否在浏览器环境中
    if (typeof localStorage === 'undefined') {
      console.log('非浏览器环境，跳过工作流数据清理')
      return false
    }
    
    // 获取工作流状态
    const stored = localStorage.getItem('workflow_state')
    if (!stored) {
      console.log('没有找到工作流数据')
      return
    }

    const snapshot = JSON.parse(stored)
    console.log('当前工作流数据:', snapshot)

    // 清理宏观规划阶段的数据
    if (snapshot.state?.stages?.macro_planning?.data) {
      const macroData = snapshot.state.stages.macro_planning.data
      
      // 清理升级节点
      if (Array.isArray(macroData.upgradeNodes)) {
        macroData.upgradeNodes = macroData.upgradeNodes.map((node: Record<string, unknown>) => {
          // 确保 keyEvents 是字符串数组
          if (Array.isArray(node.keyEvents)) {
            node.keyEvents = node.keyEvents.map((event: unknown) => {
              if (typeof event === 'object' && event !== null) {
                return JSON.stringify(event)
              }
              return event
            })
          }
          
          // 确保 chapterRange 格式正确
          if (node.chapterRange && typeof node.chapterRange === 'object') {
            const range = node.chapterRange as { start?: number; end?: number }
            node.chapterRange = {
              start: typeof range.start === 'number' ? range.start : 1,
              end: typeof range.end === 'number' ? range.end : 10
            }
          }
          
          return node
        })
      }
      
      console.log('清理后的宏观规划数据:', macroData)
    }

    // 保存清理后的数据
    localStorage.setItem('workflow_state', JSON.stringify(snapshot))
    console.log('工作流数据已清理并保存')
    
    return true
  } catch (error) {
    console.error('清理工作流数据失败:', error)
    return false
  }
}

/**
 * 清除所有工作流数据
 */
export function clearAllWorkflowData() {
  try {
    // 检查是否在浏览器环境中
    if (typeof localStorage === 'undefined') {
      console.log('非浏览器环境，跳过工作流数据清除')
      return false
    }
    
    localStorage.removeItem('workflow_state')
    localStorage.removeItem('workflow_version')
    localStorage.removeItem('workflow_backup')
    console.log('所有工作流数据已清除')
    return true
  } catch (error) {
    console.error('清除工作流数据失败:', error)
    return false
  }
}

// 在浏览器控制台中可以调用这些函数（暂时禁用，避免在非浏览器环境中报错）
// try {
//   if (typeof window !== 'undefined' && window) {
//     (window as any).cleanWorkflowData = cleanWorkflowData
//     (window as any).clearAllWorkflowData = clearAllWorkflowData
//   }
// } catch (error) {
//   console.error('设置浏览器控制台函数失败:', error)
// }
