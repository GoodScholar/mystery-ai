export const generateScenarioPrompt = (req) => {
  const { theme, description, style, era, difficulty, targetNpcs, specialElement } = req

  return `请你扮演一个专业的剧本杀作者，基于我的设定创作一个完整的单人剧本杀推理剧本。必须返回且仅返回合法的JSON格式。

## 玩家设定要求：
1. 剧本主题: ${theme}
2. 剧情/风格偏好: ${description || '无特殊偏好，请自由发挥'}
3. 故事风格: ${style}
4. 时代背景: ${era}
5. 难度等级: ${difficulty} (1-5)
6. NPC数量: ${targetNpcs}个嫌疑人
7. 附加特殊元素: ${specialElement || '无'}

## 输出格式要求：
必须是一个包含以下字段的 JSON 对象，且不能有任何额外的 Markdown 标记（例如不能有 \`\`\`json ）。

{
  "title": "剧本名称（不超过10个字）",
  "emoji": "一个最符合主题的Emoji",
  "brief": "一句话简介（吸引人的悬疑标语，15字左右）",
  "intro": "开场故事。第一人称视角，描述案发当时的场景，引出死者和疑问。200-300字。",
  "difficulty": ${difficulty},
  "playerRole": "玩家扮演的侦探身份简介（如：收到匿名信的私家侦探）",
  "cover": {
    "gradient": "一条合适的CSS linear-gradient 渐变代码，用于封面背景（例如：linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)）",
    "emoji": "一个主视觉Emoji（大图，不要和标题的一样）"
  },
  "npcs": [
    {
      "id": "简短的英文标识符（如: wife, doctor）",
      "name": "中文全名或称号",
      "emoji": "代表身份的Emoji",
      "role": "身份描述（如：死者的妻子）",
      "status": "当前状态简述（如：正在哭泣）",
      "description": "外貌、衣着或行为举止的细节（不超过30字）",
      "systemPrompt": "非常重要！给AI赋予该角色扮演的系统提示词。需要包含：1. 隐藏的秘密（是否是凶手）；2. 对死者和其他人的态度；3. 说话语气（傲慢/怯懦/冷漠等）；4. 只有在玩家问到关键点时才透露特定线索的设定。（200字左右）",
      "mockResponses": [
        "预设回复1（短句，如果不调用AI时的默认回复，语气要符合人设）",
        "预设回复2",
        "预设回复3"
      ]
    }
    // ... 必须正好 ${targetNpcs} 个 NPC，其中有1个是真凶
  ],
  "clues": [
    {
      "id": "简短英文标识符",
      "source": "提供线索的NPC对应的id",
      "title": "线索标题（如：染血的袖扣）",
      "content": "线索详情（如：在案发现场角落发现了一枚带有精致家族纹章的袖扣，似乎并不是死者的物品。）",
      "keywords": ["关键词1", "关键词2"] // 聊天中出现这两个关键词之一即可触发此线索
    }
    // ... 需要设计大约 4-${targetNpcs * 2} 条线索分散在各NPC身上
  ],
  "answer": {
    "suspect": "真凶的NPC英文标识符",
    "motive": "简述真实杀人动机（50字内）",
    "method": "简述真实的犯罪手法和核心诡计（100字内）",
    "motiveKeywords": ["动机关键词1", "动机关键词2"],
    "methodKeywords": ["手法关键词1", "手法关键词2"]
  },
  "truthReveal": "案情真相的完整复盘，Markdown格式。先按照时间线梳理案发前后的真实经过，解释核心诡计的原理，交代所有NPC的隐藏秘密，最后以侦探解开谜题的视角作为结局。结构需包含段落和小标题。（500-800字）"
}

请注意：
1. 诡计需要符合 ${style} 风格，逻辑必须严密自洽。
2. 凶手必须是 ${targetNpcs} 个NPC之一。
3. 线索不能直接指出凶手，而是要通过互相印证推断出真相。
4. json对象不要包在任何文本中，只返回合法的JSON文本！`
}
