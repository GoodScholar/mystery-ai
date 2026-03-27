/**
 * Web Crypto API 封装辅助逻辑
 * 用于对本地存储的 API Key 等敏感信息进行加密处理
 */

const ENCRYPTION_SALT = 'miju-ai-2026'

/**
 * 基于 UserAgent 和固定 Salt 生成衍生密钥
 */
export async function deriveKey() {
  const encoder = new TextEncoder()
  // 利用环境特征加上固定盐作为基础材料
  // 注意：这只是为了增加在脱离当前环境（比如直接复制 localStorage 整个数据库给别人）时的破解复杂度
  const keyMaterialText = navigator.userAgent + ENCRYPTION_SALT
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyMaterialText),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('miju-ai-key-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密字符串，返回包含 iv 和 cipher data 的 JSON 字符串
 */
export async function encryptApiKey(apiKey) {
  if (!apiKey) return ''
  
  const key = await deriveKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  )
  
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  })
}

/**
 * 解密字符串
 * 为了向后兼容，如果解密失败或格式不对，会将其作为明文返回
 */
export async function decryptApiKey(stored) {
  if (!stored) return ''
  
  try {
    const parsed = JSON.parse(stored)
    if (!parsed.iv || !parsed.data) {
      // 看起来不是新格式，降级为明文处理
      return stored
    }
    
    const key = await deriveKey()
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(parsed.iv) },
      key,
      new Uint8Array(parsed.data)
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    // 无论是 JSON.parse 还是解密错误，回退到原始字符串表示
    return stored
  }
}
