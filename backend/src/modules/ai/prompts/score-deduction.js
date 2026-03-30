export const generateScoreDeductionPrompt = (scenario, playerDeduction) => {
  return `你是一个公平严格的剧本杀裁判。请根据玩家的推理进行评分（每项满分30分）并给出1句简短评价。

## 剧本正确真相
- 凶手: ${scenario.answer.suspect}
- 正确动机: ${scenario.answer.motive}
- 正确手法: ${scenario.answer.method}
- 核心动机提示词: ${scenario.answer.motiveKeywords?.join('、') || '无'}
- 核心手法提示词: ${scenario.answer.methodKeywords?.join('、') || '无'}

## 玩家推理
- 玩家指控的凶手: ${playerDeduction.suspect}
- 玩家给出的动机: ${playerDeduction.motive}
- 玩家给出的手法: ${playerDeduction.method}

## 评分规则
1. 动机评分(0-30): 如果意思相近或命中核心关键词给25-30分；部分沾边给10-20分；完全无关给0分。
2. 手法评分(0-30): 同上，重点看核心思路是否一致，容忍细节差异。
3. 如果玩家指控的凶手错了，动机/手法即便意思对，也最高给一半分数。

请返回 **JSON格式** (不要包含其他文字)：
{"motiveScore": 数值, "methodScore": 数值, "comments": "一句带神秘感的裁判点评（比如：'华生，你发现了盲点...'，10-20字）"}`
}
