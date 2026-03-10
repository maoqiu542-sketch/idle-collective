import { useEffect, useState } from 'react'
import { CharacterState } from '@app-types/character.types'
import { STATE_DISPLAY_NAMES, STATE_ICONS, STATE_COLORS } from '@app-types/state-machine.types'
import './FloatingText.css'

export interface FloatingTextData {
  id: string
  text: string
  x: number
  y: number
  type: 'status' | 'resource' | 'damage' | 'special'
  color?: string
  icon?: string
  createdAt: number
}

interface FloatingTextProps {
  data: FloatingTextData
  tileSize?: number
}

export function FloatingText({ data, tileSize = 32 }: FloatingTextProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isFading, setIsFading] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    const fadeTimer = setTimeout(() => setIsFading(true), 1200)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(fadeTimer)
    }
  }, [])

  const getStyleByType = () => {
    switch (data.type) {
      case 'resource':
        return { color: data.color || '#4ADE80', fontWeight: 'bold' }
      case 'damage':
        return { color: data.color || '#EF4444', fontWeight: 'bold' }
      case 'special':
        return { color: data.color || '#FFD700', fontWeight: 'bold' }
      default:
        return { color: data.color || '#FFFFFF' }
    }
  }

  return (
    <div
      className={`floating-text ${isVisible ? 'visible' : ''} ${isFading ? 'fading' : ''} ${data.type}`}
      style={{
        left: data.x * tileSize + tileSize / 2,
        top: data.y * tileSize - 10,
        ...getStyleByType(),
      }}
    >
      {data.icon && <span className="floating-icon">{data.icon}</span>}
      <span className="floating-content">{data.text}</span>
    </div>
  )
}

export function createStateFloatingText(
  state: CharacterState,
  x: number,
  y: number
): FloatingTextData {
  return {
    id: `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text: STATE_DISPLAY_NAMES[state],
    x,
    y,
    type: 'status',
    color: STATE_COLORS[state],
    icon: STATE_ICONS[state],
    createdAt: Date.now(),
  }
}

export function createResourceFloatingText(
  resourceName: string,
  amount: number,
  x: number,
  y: number,
  icon?: string
): FloatingTextData {
  return {
    id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text: `${amount > 0 ? '+' : ''}${amount} ${resourceName}`,
    x,
    y,
    type: 'resource',
    color: amount > 0 ? '#4ADE80' : '#EF4444',
    icon,
    createdAt: Date.now(),
  }
}

export function createDamageFloatingText(
  damage: number,
  x: number,
  y: number
): FloatingTextData {
  return {
    id: `damage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text: `-${damage}`,
    x,
    y,
    type: 'damage',
    color: '#EF4444',
    createdAt: Date.now(),
  }
}

export function createSpecialFloatingText(
  text: string,
  x: number,
  y: number,
  icon?: string
): FloatingTextData {
  return {
    id: `special_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    x,
    y,
    type: 'special',
    color: '#FFD700',
    icon,
    createdAt: Date.now(),
  }
}
