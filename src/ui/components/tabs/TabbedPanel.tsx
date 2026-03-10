import { useState, ReactNode } from 'react'
import './TabbedPanel.css'

export type TabId = 'resources' | 'characters' | 'buildings' | 'equipment' | 'shop' | 'settings'

export interface TabConfig {
  id: TabId
  name: string
  icon: string
  shortcut?: string
}

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'resources', name: '资源', icon: '📦', shortcut: '1' },
  { id: 'characters', name: '角色', icon: '👥', shortcut: '2' },
  { id: 'buildings', name: '建筑', icon: '🏠', shortcut: '3' },
  { id: 'equipment', name: '装备', icon: '⚔️', shortcut: '4' },
  { id: 'shop', name: '商店', icon: '🛒', shortcut: '5' },
  { id: 'settings', name: '设置', icon: '⚙️', shortcut: '6' },
]

interface TabbedPanelProps {
  children: (activeTab: TabId) => ReactNode
  onTabChange?: (tab: TabId) => void
  defaultTab?: TabId
}

export function TabbedPanel({ children, onTabChange, defaultTab = 'resources' }: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  const handleTabClick = (tabId: TabId) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId)
      onTabChange?.(tabId)
    }
  }

  return (
    <div className="tabbed-panel">
      <div className="tabs-container">
        {TAB_CONFIGS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            title={tab.shortcut ? `${tab.name} (${tab.shortcut})` : tab.name}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-name">{tab.name}</span>
          </button>
        ))}
      </div>
      <div className="tab-content">
        {children(activeTab)}
      </div>
    </div>
  )
}

export function useTabKeyboard(
  setActiveTab: (tab: TabId) => void,
  enabled: boolean = true
) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!enabled) return

    const key = event.key
    const tab = TAB_CONFIGS.find((t) => t.shortcut === key)
    if (tab) {
      setActiveTab(tab.id)
    }
  }

  return { handleKeyDown }
}
