import { useEffect, useState, useCallback } from 'react'
import { FloatSnapshot, WorkerSnapshot, mapStateToAnimationType, ANIMATION_LABELS, MAX_VISIBLE_WORKERS } from '@app-types/float.types'
import { getUiIconAssetPath } from '@data/assets/artAssets'
import './FloatWindow.css'

interface FloatWindowProps {
  initialSnapshot?: FloatSnapshot | null
}

function ProfessionIcon({ profession }: { profession: string }) {
  const professionToAsset: Record<string, string> = {
    'farmer': 'character_portrait_farmer',
    'warrior': 'character_portrait_warrior',
    'scholar': 'character_portrait_scholar',
    'hunter': 'character_portrait_hunter',
    'engineer': 'character_portrait_engineer',
    'cook': 'character_portrait_cook',
    'doctor': 'character_portrait_doctor',
  }
  
  const assetId = professionToAsset[profession]
  if (assetId) {
    const assetPath = getUiIconAssetPath(assetId, '32')
    if (assetPath) return <img src={assetPath} alt={profession} className="profession-icon-img" />
  }
  
  const fallbackMap: Record<string, string> = {
    'farmer': '🌾',
    'hunter': '🏹',
    'warrior': '⚔️',
    'engineer': '🔧',
    'cook': '🍳',
    'doctor': '💊',
    'scholar': '📚',
  }
  
  return <span>{fallbackMap[profession] || '👤'}</span>
}

function formatProgress(progress?: number): string {
  if (progress === undefined || progress === null) return '--'
  return `${Math.round(Math.min(100, Math.max(0, progress)))}%`
}

function WorkerCard({ worker }: { worker: WorkerSnapshot }) {
  const animType = mapStateToAnimationType(worker.state)
  const label = ANIMATION_LABELS[animType]
  const professionIcon = <ProfessionIcon profession={worker.profession} />

  return (
    <div className={`worker-capsule worker-capsule--${animType}`} title={`${worker.name} - ${label}`}>
      <div className="worker-capsule__stage">
        <div className={`worker-anim worker-anim--${animType}`}>
          <span className="worker-anim__body">{professionIcon}</span>
          <div className={`worker-anim__fx worker-anim__fx--${animType}`} />
        </div>
      </div>
      <div className="worker-capsule__label">
        <span className="worker-capsule__state">{label}</span>
        <span className="worker-capsule__progress-text">{formatProgress(worker.progress)}</span>
      </div>
      <div className="worker-capsule__progress-bar">
        <div
          className={`worker-capsule__progress-fill worker-capsule__progress-fill--${animType}`}
          style={{ width: worker.progress !== undefined ? `${Math.min(100, Math.max(0, worker.progress))}%` : '0%' }}
        />
      </div>
      <div className="worker-capsule__name-row">
        <span className="worker-capsule__name">{worker.name}</span>
      </div>
    </div>
  )
}

export function FloatWindow({ initialSnapshot }: FloatWindowProps) {
  const [snapshot, setSnapshot] = useState<FloatSnapshot | null>(initialSnapshot ?? null)

  useEffect(() => {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI?.onFloatSnapshotUpdate) return

    return electronAPI.onFloatSnapshotUpdate((data: FloatSnapshot) => {
      if (data && data.workers) {
        setSnapshot(data)
      }
    })
  }, [])

  const handleRestore = useCallback(() => {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.toggleFloatMode) {
      electronAPI.toggleFloatMode()
    }
  }, [])

  if (!snapshot) {
    return (
      <div className="float-window">
        <div className="float-window__placeholder">等待数据同步...</div>
      </div>
    )
  }

  const visibleWorkers = snapshot.workers.slice(0, MAX_VISIBLE_WORKERS)
  const overflow = snapshot.workers.length - MAX_VISIBLE_WORKERS

  return (
    <div className="float-window">
      <div className="float-window__stats">
        <div className="float-stat">
          <span className="float-stat__icon">🏠</span>
          <span className="float-stat__label">宜居</span>
          <span className="float-stat__value">{snapshot.settlementLivability}</span>
        </div>
        <div className="float-stat">
          <span className="float-stat__icon">🌱</span>
          <span className="float-stat__label">发展</span>
          <span className="float-stat__value">{snapshot.settlementDevelopment}</span>
        </div>
        <div className="float-stat float-stat--gold">
          <span className="float-stat__icon">⭐</span>
          <span className="float-stat__label">金币</span>
          <span className="float-stat__value">{snapshot.gold}</span>
        </div>
        <div className="float-stat float-stat--expand" onClick={handleRestore} title="展开完整界面">
          <span className="float-stat__icon">↗</span>
        </div>
      </div>

      <div className="float-window__workers">
        {visibleWorkers.map((worker) => (
          <WorkerCard key={worker.id} worker={worker} />
        ))}
        {overflow > 0 && (
          <div className="worker-capsule worker-capsule--overflow">
            <span className="worker-capsule__overflow-text">+{overflow}</span>
          </div>
        )}
        {visibleWorkers.length === 0 && overflow === 0 && (
          <div className="float-window__no-workers">暂无角色</div>
        )}
      </div>
    </div>
  )
}
