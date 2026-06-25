import axios from 'axios'

// 开发环境通过 Vite proxy 转发，key 仅存在于服务端
// 生产环境（GitHub Pages 等静态托管）key 会暴露在客户端，请注意配额安全
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ''
const IS_DEV = import.meta.env.DEV
const DEEPSEEK_BASE = IS_DEV ? '/api/deepseek' : 'https://api.deepseek.com/v1'

const api = axios.create({
  baseURL: DEEPSEEK_BASE,
  headers: IS_DEV
    ? { 'Content-Type': 'application/json' }
    : {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
  timeout: 30000,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chatWithDeepSeek(
  messages: ChatMessage[],
  onStream?: (chunk: string) => void
) {
  if (onStream) {
    const streamUrl = IS_DEV
      ? '/api/deepseek/chat/completions'
      : `${DEEPSEEK_BASE}/chat/completions`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (!IS_DEV) {
      headers['Authorization'] = `Bearer ${DEEPSEEK_API_KEY}`
    }
    const res = await fetch(streamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        stream: true,
      }),
    })
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            full += content
            onStream(content)
          } catch {
            // ignore parse errors
          }
        }
      }
    }
    return full
  }

  const res = await api.post('/chat/completions', {
    model: 'deepseek-chat',
    messages,
  })
  return res.data.choices?.[0]?.message?.content || ''
}


export async function generatePortrait(person: any): Promise<string> {
  const prompt = `基于以下历史数据，用200字为${person.name}写一段客观的历史小传。
数据：${JSON.stringify({
  name: person.name,
  occupation: person.occupation,
  active_from: person.active_from,
  active_to: person.active_to,
  district: person.district,
  organizations: person.organizations,
  description: person.description
})}
要求：第三人称，不编造数据中没有的内容，语言流畅，
如果active_to不为null，最后一句写"此后其行踪不见于现存史料"。
只输出小传正文，不要任何前缀。`

  try {
    const res = await api.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.3,
    })
    return res.data.choices?.[0]?.message?.content || '生成失败'
  } catch {
    return 'AI小传生成失败，请检查 API Key 配置'
  }
}
