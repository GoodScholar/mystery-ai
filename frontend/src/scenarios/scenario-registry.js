/**
 * 剧本注册中心 — 统一管理预设 + 自定义剧本
 */

import { midnightGallery } from './midnight-gallery.js'
import { vanishingTrain } from './vanishing-train.js'
import { poisonBanquet } from './poison-banquet.js'
import { digitalGhost } from './digital-ghost.js'
import { ancientTemple } from './ancient-temple.js'

const CUSTOM_STORAGE_KEY = 'miju-custom-scenarios'

/** 预设剧本列表 */
const builtInScenarios = [
  midnightGallery,
  vanishingTrain,
  poisonBanquet,
  digitalGhost,
  ancientTemple
]

/** 从 localStorage 加载自定义剧本 */
function loadCustomScenarios() {
  try {
    const saved = localStorage.getItem(CUSTOM_STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/** 保存自定义剧本到 localStorage */
function saveCustomScenarios(list) {
  localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list))
}

/** 获取全部剧本（预设 + 自定义） */
export function getAllScenarios() {
  return [...builtInScenarios, ...loadCustomScenarios()]
}

/** 按 ID 获取剧本 */
export function getScenario(id) {
  return getAllScenarios().find(s => s.id === id) || null
}

/** 添加自定义剧本 */
export function addCustomScenario(scenario) {
  const customs = loadCustomScenarios()
  // 确保 ID 唯一
  scenario.id = scenario.id || `custom-${Date.now()}`
  scenario.isCustom = true
  customs.push(scenario)
  saveCustomScenarios(customs)
  return scenario
}

/** 删除自定义剧本 */
export function removeCustomScenario(id) {
  const customs = loadCustomScenarios().filter(s => s.id !== id)
  saveCustomScenarios(customs)
}

/** 获取自定义剧本列表 */
export function getCustomScenarios() {
  return loadCustomScenarios()
}
