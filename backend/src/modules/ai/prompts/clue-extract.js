export const generateClueExtractPrompt = (conversationText, remainingClues) => {
  return `你是一个游戏线索分析器。根据以下最新对话内容，判断玩家是否获得了新线索。

## 尚未触发的线索列表：
${remainingClues.map(c => `- ID: ${c.clueId || c.id} | 来源: ${c.source} | 内容: ${c.content} | 关键词: ${c.keywords?.join(', ') || '无'}`).join('\n')}

## 最新对话内容：
${conversationText}

## 判断规则：
1. NPC的回复中需要包含与线索关键词相关的实质性信息
2. 仅仅提到一个人名不算触发线索，需要有具体的信息透露
3. 一次只能触发一条最相关的线索

请返回 JSON 格式（不要包含其他内容）：
如果触发了线索：{"triggered":true,"clue_id":"线索ID","clue_summary":"简短的线索描述"}
如果没有触发：{"triggered":false}`
}
