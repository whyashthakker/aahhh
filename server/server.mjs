import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = join(ROOT, 'dist')
const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '0.0.0.0'
const DEV = process.argv.includes('--dev')
const MAX_ROOM_PLAYERS = 4
const rooms = new Map()

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.task': 'application/octet-stream',
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ ok: true, rooms: rooms.size }))
    return
  }
  if (DEV) {
    response.writeHead(200, { 'Content-Type': 'text/plain' })
    response.end('Ragdoll Room multiplayer server')
    return
  }
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0])
  const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(DIST, safePath === '/' ? 'index.html' : safePath)
  if (!filePath.startsWith(DIST) || !existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(DIST, 'index.html')
  if (!existsSync(filePath)) {
    response.writeHead(503, { 'Content-Type': 'text/plain' })
    response.end('Build missing. Run npm run build first.')
    return
  }
  response.writeHead(200, {
    'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=()',
  })
  createReadStream(filePath).pipe(response)
})

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 })
server.on('upgrade', (request, socket, head) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/ws') {
    socket.destroy()
    return
  }
  websocketServer.handleUpgrade(request, socket, head, (websocket) => websocketServer.emit('connection', websocket))
})

websocketServer.on('connection', (socket) => {
  const client = { id: randomUUID(), socket, roomCode: null, name: 'Player', color: randomColor(), lastImpactAt: 0, alive: true }
  socket.on('pong', () => { client.alive = true })
  send(socket, { type: 'connected', playerId: client.id })

  socket.on('message', (raw) => {
    let message
    try { message = JSON.parse(raw.toString()) } catch { return }
    if (!message || typeof message.type !== 'string') return
    if (message.type === 'create') joinRoom(client, createCode(), message.name, message.mode)
    if (message.type === 'join') joinRoom(client, cleanCode(message.code), message.name)
    if (message.type === 'impact') relayImpact(client, message.payload)
    if (message.type === 'mode') updateMode(client, message.mode)
    if (message.type === 'ping') send(socket, { type: 'pong', at: Date.now() })
  })
  socket.on('close', () => leaveRoom(client))
  socket.on('error', () => leaveRoom(client))
})

function joinRoom(client, code, requestedName, requestedMode = 'chaos') {
  if (!code) return send(client.socket, { type: 'error', message: 'Invalid room code.' })
  leaveRoom(client)
  let room = rooms.get(code)
  if (!room) {
    room = { code, clients: [], mode: requestedMode === 'pass' ? 'pass' : 'chaos', turnIndex: 0, turnStartedAt: Date.now() }
    rooms.set(code, room)
  }
  if (room.clients.length >= MAX_ROOM_PLAYERS) return send(client.socket, { type: 'error', message: 'That room is full.' })
  client.roomCode = code
  client.name = cleanName(requestedName)
  room.clients.push(client)
  send(client.socket, { type: 'joined', room: publicRoom(room), playerId: client.id })
  broadcastRoom(room, { type: 'presence', room: publicRoom(room) })
}

function leaveRoom(client) {
  if (!client.roomCode) return
  const room = rooms.get(client.roomCode)
  client.roomCode = null
  if (!room) return
  room.clients = room.clients.filter((member) => member.id !== client.id)
  room.turnIndex = room.clients.length ? room.turnIndex % room.clients.length : 0
  if (!room.clients.length) rooms.delete(room.code)
  else broadcastRoom(room, { type: 'presence', room: publicRoom(room) })
}

function relayImpact(client, payload) {
  const room = rooms.get(client.roomCode)
  if (!room || !payload || Date.now() - client.lastImpactAt < 70) return
  if (room.mode === 'pass' && room.clients[room.turnIndex]?.id !== client.id) return
  const part = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].includes(payload.part) ? payload.part : 'torso'
  const side = payload.side === -1 ? -1 : 1
  const power = Math.min(3.2, Math.max(0.3, Number(payload.power) || 1))
  client.lastImpactAt = Date.now()
  broadcastRoom(room, {
    type: 'impact',
    payload: { part, side, power, moveType: cleanText(payload.moveType, 20), propId: cleanText(payload.propId, 24) },
    player: publicPlayer(client),
    at: Date.now(),
  }, client.id)
}

function updateMode(client, requestedMode) {
  const room = rooms.get(client.roomCode)
  if (!room || room.clients[0]?.id !== client.id) return
  room.mode = requestedMode === 'pass' ? 'pass' : 'chaos'
  room.turnIndex = 0
  room.turnStartedAt = Date.now()
  broadcastRoom(room, { type: 'presence', room: publicRoom(room) })
}

setInterval(() => {
  rooms.forEach((room) => {
    if (room.mode !== 'pass' || room.clients.length < 2 || Date.now() - room.turnStartedAt < 5000) return
    room.turnIndex = (room.turnIndex + 1) % room.clients.length
    room.turnStartedAt = Date.now()
    broadcastRoom(room, { type: 'turn', room: publicRoom(room) })
  })
  websocketServer.clients.forEach((socket) => {
    const client = [...rooms.values()].flatMap((room) => room.clients).find((entry) => entry.socket === socket)
    if (client && !client.alive) return socket.terminate()
    if (client) client.alive = false
    if (socket.readyState === WebSocket.OPEN) socket.ping()
  })
}, 2500).unref()

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode,
    players: room.clients.map(publicPlayer),
    turnPlayerId: room.clients[room.turnIndex]?.id ?? null,
    turnEndsAt: room.mode === 'pass' ? room.turnStartedAt + 5000 : null,
  }
}
function publicPlayer(client) { return { id: client.id, name: client.name, color: client.color } }
function broadcastRoom(room, message, exceptId = null) { room.clients.forEach((client) => { if (client.id !== exceptId) send(client.socket, message) }) }
function send(socket, message) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)) }
function cleanName(value) { return cleanText(value, 18) || 'Player' }
function cleanText(value, max) { return typeof value === 'string' ? value.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, max) : '' }
function cleanCode(value) { const code = cleanText(value, 6).toUpperCase(); return /^[A-Z0-9]{4,6}$/.test(code) ? code : null }
function createCode() { let code; do { code = Math.random().toString(36).slice(2, 7).toUpperCase() } while (rooms.has(code)); return code }
function randomColor() { return ['#d9ff61', '#ff7f9b', '#83d8ff', '#b693ff'][Math.floor(Math.random() * 4)] }

server.listen(PORT, HOST, () => console.log(`Aahhh Arcade server listening on http://${HOST}:${PORT}`))
