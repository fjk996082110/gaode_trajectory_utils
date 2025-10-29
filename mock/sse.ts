import type { Plugin } from 'vite'
import CarListJSON from './carList.json'

export default function sseMockPlugin(): Plugin {
  return {
    name: 'mock-sse-plugin',
    configureServer(server) {
      server.middlewares.use('/api/sse/stream', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })

        // 每隔 5 秒推送一条消息
        const timer = setInterval(() => {
          res.write(`data: ${JSON.stringify({ time: new Date(), list: CarListJSON })}\n\n`)
        }, 5000)

        // 断开连接时清理
        req.on('close', () => {
          clearInterval(timer)
          res.end()
        })
      })
    },
  }
}
