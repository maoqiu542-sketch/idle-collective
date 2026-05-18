import { useGameStore } from '@ui/stores/gameStore'
import { useCharacterStore } from '@ui/stores/characterStore'
import { useBuildingStore } from '@ui/stores/buildingStore'
import { useResourceStore } from '@ui/stores/resourceStore'
import { getCurrentGuideStep } from './guideProgress'
import './GuidePanel.css'

export function GuidePanel() {
  const { manualHarvestCount } = useGameStore()
  const { characters } = useCharacterStore()
  const { buildings } = useBuildingStore()
  const { coreParts } = useResourceStore()

  const { currentStep, completedCount, totalCount } = getCurrentGuideStep({
    manualHarvestCount,
    buildings: buildings.map(building => ({ type: building.type, status: building.status })),
    characterCount: characters.length,
    coreParts,
  })

  const progress = (completedCount / totalCount) * 100

  return (
    <div className="guide-panel">
      <div className="guide-header">
        <span className="guide-icon">🎯</span>
        <span className="guide-title">当前目标</span>
        <span className="guide-progress">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="guide-progress-bar">
        <div className="guide-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      {currentStep ? (
        <div className="guide-current-step">
          <div className="guide-step-label">下一步</div>
          <div className="guide-step-title">{currentStep.title}</div>
          <div className="guide-step-hint">{currentStep.hint}</div>
        </div>
      ) : (
        <div className="guide-current-step completed">
          <div className="guide-step-label">已完成</div>
          <div className="guide-step-title">主循环已建立</div>
          <div className="guide-step-hint">继续扩张聚落、推进科技并挑战更强的 Boss。</div>
        </div>
      )}
    </div>
  )
}
