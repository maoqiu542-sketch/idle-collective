import uiTexts from '../../public/text/ui.json'
import gameTexts from '../../public/text/game.json'
import guideTexts from '../../public/text/guide.json'
import milestonesTexts from '../../public/text/milestones.json'

type TextsMap = Record<string, unknown>

class TextManager {
  private texts: Record<string, TextsMap> = {}

  constructor() {
    this.texts['ui'] = uiTexts as TextsMap
    this.texts['game'] = gameTexts as TextsMap
    this.texts['guide'] = guideTexts as TextsMap
    this.texts['milestones'] = milestonesTexts as TextsMap
  }

  get(category: string, key: string, ...args: (string | number)[]): string {
    const cat = this.texts[category]
    if (!cat) return key

    if (category === 'guide' && key === 'step_title') {
      const idx = parseInt(args[0] as string, 10)
      const steps = (cat as any)?.steps
      if (steps && steps[idx]) return steps[idx].title
      return key
    }

    if (category === 'guide' && key === 'step_hint') {
      const idx = parseInt(args[0] as string, 10)
      const steps = (cat as any)?.steps
      if (steps && steps[idx]) return steps[idx].hint
      return key
    }

    const segments = key.split('.')
    let value: unknown = cat
    for (const segment of segments) {
      if (value && typeof value === 'object' && segment in value) {
        value = (value as Record<string, unknown>)[segment]
      } else {
        return key
      }
    }

    if (typeof value !== 'string') return key

    if (args.length > 0) {
      return value.replace(/\{(\d+)\}/g, (_, idx: string) => {
        const argIdx = parseInt(idx, 10)
        return argIdx < args.length ? String(args[argIdx]) : `{${idx}}`
      })
    }

    return value
  }

  getStepTitle(index: number): string {
    return this.get('guide', 'step_title', index)
  }

  getStepHint(index: number): string {
    return this.get('guide', 'step_hint', index)
  }
}

export const textManager = new TextManager()
export default textManager
