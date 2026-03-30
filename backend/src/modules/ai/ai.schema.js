import { z } from 'zod'

export const chatSchema = z.object({
  body: z.object({
    systemPrompt: z.string().min(1),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string()
    })).optional(),
    message: z.string().min(1)
  })
})

export const extractClueSchema = z.object({
  body: z.object({
    conversationText: z.string().min(1),
    remainingClues: z.array(z.object({
      id: z.string().optional(),
      clueId: z.string().optional(),
      source: z.string(),
      content: z.string(),
      keywords: z.array(z.string()).optional()
    }))
  })
})

export const generateScenarioSchema = z.object({
  body: z.object({
    theme: z.string().min(1),
    description: z.string().optional(),
    style: z.string().min(1),
    era: z.string().min(1),
    difficulty: z.number().min(1).max(5),
    targetNpcs: z.number().min(3).max(6),
    specialElement: z.string().optional()
  })
})
