import { useState } from 'react'
import { useOnlineStore } from '@ui/stores/onlineStore'
import type { OnlineConnectionStatus, OnlineSpeedState } from '@app-types/online.types'
import './OnlinePanel.css'

interface OnlinePanelProps {
  onClose: () => void
  displaySpeed?: OnlineSpeedState
}

const STATUS_LABELS: Record<OnlineConnectionStatus, string> = {
  idle: '未连接',
  connecting: '连接中',
  connected: '已连接',
  reconnecting: '重连中',
  disconnected: '已断开',
}

export function OnlinePanel({ onClose, displaySpeed }: OnlinePanelProps) {
  const {
    mode,
    connectionStatus,
    serverUrl,
    roomCode,
    displayName,
    error,
    players,
    speed,
    inviteCode,
    setServerUrl,
    connectCreateRoom,
    connectJoinInvite,
    connectJoinRoom,
    resumeLastRoom,
    disconnect,
  } = useOnlineStore()
  const [nameInput, setNameInput] = useState(displayName)
  const [inviteInput, setInviteInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [serverInput, setServerInput] = useState(serverUrl)
  const [roomInput, setRoomInput] = useState('')
  const [copied, setCopied] = useState(false)

  const isOnline = mode === 'online'
  const isConnecting = mode === 'connecting'
  const visibleSpeed = displaySpeed ?? speed
  const statusLabel = STATUS_LABELS[connectionStatus] ?? connectionStatus

  const copyInvite = async () => {
    if (!inviteCode) return
    await navigator.clipboard?.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateRoom = async () => {
    await connectCreateRoom(nameInput.trim() || '玩家')
  }

  const handleJoinInvite = async () => {
    if (!inviteInput.trim()) return
    await connectJoinInvite(inviteInput.trim(), nameInput.trim() || '玩家')
  }

  const handleJoinRoom = async () => {
    if (roomInput.trim().length < 1) return
    setServerUrl(serverInput)
    await connectJoinRoom(roomInput, nameInput.trim() || '玩家')
  }

  const handleResumeRoom = async () => {
    setServerUrl(serverInput)
    await resumeLastRoom()
  }

  return (
    <aside className="online-panel">
      <div className="online-panel__header">
        <div>
          <h2>联机房间</h2>
        </div>
        <button className="online-panel__icon-btn" onClick={onClose} title="关闭联机面板">&times;</button>
      </div>

      <div className="online-panel__status">
        <span className={`online-panel__dot online-panel__dot--${connectionStatus}`} />
        <span>{statusLabel}</span>
        {isOnline && <strong>&times;{visibleSpeed.multiplier.toFixed(2)}</strong>}
      </div>

      <div className="online-panel__form">
        {!isOnline && (
          <>
            <label>
              昵称
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                placeholder="输入你的昵称"
                disabled={isConnecting}
              />
            </label>

            <button
              onClick={() => void handleCreateRoom()}
              disabled={isConnecting || !nameInput.trim()}
              className="online-panel__primary-btn"
            >
              {isConnecting ? '正在创建...' : '创建房间'}
            </button>

            <div className="online-panel__divider">
              <span>或加入已有房间</span>
            </div>

            <label>
              邀请口令
              <input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="粘贴好友发来的邀请口令"
                disabled={isConnecting}
              />
            </label>
            <button
              onClick={() => void handleJoinInvite()}
              disabled={isConnecting || !inviteInput.trim()}
              className="online-panel__primary-btn"
            >
              加入邀请
            </button>

            <div className="online-panel__advanced-toggle">
              <button
                className="online-panel__link-btn"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? '收起高级设置 ▲' : '高级设置 ▼'}
              </button>
            </div>

            {showAdvanced && (
              <div className="online-panel__advanced">
                <label>
                  服务器地址
                  <input
                    value={serverInput}
                    onChange={(e) => setServerInput(e.target.value)}
                    disabled={isConnecting}
                    placeholder="ws://192.168.1.23:8787"
                  />
                </label>
                <div className="online-panel__actions">
                  <button onClick={() => void handleResumeRoom()}>
                    重连上次
                  </button>
                </div>
                <label>
                  房间码
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="房间码"
                  />
                </label>
                <button
                  onClick={() => void handleJoinRoom()}
                  disabled={roomInput.trim().length < 1}
                >
                  加入房间
                </button>
              </div>
            )}
          </>
        )}

        {isOnline && inviteCode && (
          <div className="online-panel__invite-card">
            <span className="online-panel__invite-label">邀请口令（发给朋友即可加入）</span>
            <div className="online-panel__invite-row">
              <strong className="online-panel__invite-code">{inviteCode}</strong>
              <button
                className={`online-panel__copy-btn ${copied ? 'online-panel__copy-btn--copied' : ''}`}
                onClick={() => void copyInvite()}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        )}

        {isOnline && roomCode && (
          <div className="online-panel__room-code">
            <span>房间码</span>
            <strong>{roomCode}</strong>
            <span className="online-panel__room-code-hint">口令已包含此信息</span>
          </div>
        )}
      </div>

      {isOnline && (
        <div className="online-panel__players">
          {players.length === 0 && (
            <p className="online-panel__no-players">等待其他玩家加入...</p>
          )}
          {players.map((player) => (
            <div className="online-player-row" key={player.playerId}>
              <span>{player.displayName}</span>
              <span>发展 {player.settlementDevelopment}</span>
              <span>金币 {player.resources.gold ?? 0}</span>
            </div>
          ))}
          <button className="online-panel__disconnect" onClick={disconnect}>断开联机</button>
        </div>
      )}

      {error && <p className="online-panel__error">{error}</p>}
    </aside>
  )
}
