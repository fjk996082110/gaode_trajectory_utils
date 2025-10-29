import { ref, onUnmounted } from 'vue'
import { EventSourcePolyfill } from 'event-source-polyfill'

interface UseSSEOptions {
  withCredentials?: boolean
  retryInterval?: number // 初始重试间隔 ms，默认 3000
  maxRetryInterval?: number // 最大重试间隔 ms，默认 30000
}

const getToken = () => {
  return localStorage.getItem('token')
}

export function useSSE(url: string, options?: UseSSEOptions, msgCallback?: (data: any) => void) {
  const data = ref<string | null>(null)
  const error = ref<string | null>(null)

  let eventSource: InstanceType<typeof EventSourcePolyfill> | null = null
  let retryInterval = options?.retryInterval ?? 3000
  const maxRetryInterval = options?.maxRetryInterval ?? 30000
  let reconnectTimer: number | null = null

  const connect = () => {
    const token = getToken()
    eventSource = new EventSourcePolyfill(url, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      withCredentials: options?.withCredentials ?? false,
    })

    eventSource.addEventListener('notice', (event: any) => {
      if (event.type === 'notice') {
        data.value = event.data
        msgCallback && msgCallback(event.data)
      }
    })

    eventSource.onmessage = (event: MessageEvent) => {
      if (event.type === 'message') {
        try {
          const str = event.data.replace(/\s+/g, '')
          data.value = JSON.parse(str)
        } catch (error) {
          console.error('sse message JSON 解析错误', error)
        }
      }
    }

    eventSource.onerror = (err: any) => {
      error.value = 'SSE 连接出错'
      console.error('SSE error:', err)

      // 主动关闭，避免 polyfill 自己重连造成干扰
      close()

      // 失败后重试
      scheduleReconnect()
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) return // 防止重复定时
    reconnectTimer = window.setTimeout(() => {
      console.log(`SSE 正在尝试重连... (间隔 ${retryInterval / 1000}s)`)
      connect()
      reconnectTimer = null

      // 退避策略，逐步增加间隔，直到最大值
      retryInterval = Math.min(retryInterval * 2, maxRetryInterval)
    }, retryInterval)
  }

  const close = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    retryInterval = options?.retryInterval ?? 3000 // 重置回初始值
  }

  onUnmounted(() => {
    close()
  })

  return {
    data,
    error,
    connect,
    close,
  }
}
