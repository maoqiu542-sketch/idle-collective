import { BuildingStatus, ProductionBuildingType } from '@app-types/production-building.types'

export interface GuideBuildingSummary {
  type: ProductionBuildingType
  status: BuildingStatus
}

export interface GuideProgressInput {
  manualHarvestCount: number
  buildings: GuideBuildingSummary[]
  characterCount: number
  coreParts: number
}

export interface GuideStep {
  id: string
  title: string
  hint: string
  completed: boolean
}

function hasOperationalBuilding(
  buildings: GuideBuildingSummary[],
  types: ProductionBuildingType[]
): boolean {
  return buildings.some(
    building => types.includes(building.type) && building.status === BuildingStatus.OPERATIONAL
  )
}

export function getGuideSteps(input: GuideProgressInput): GuideStep[] {
  const hasProductionBuilding = hasOperationalBuilding(input.buildings, [
    ProductionBuildingType.FARM,
    ProductionBuildingType.LUMBER_MILL,
    ProductionBuildingType.QUARRY,
  ])

  const hasGrowthBuilding = hasOperationalBuilding(input.buildings, [
    ProductionBuildingType.RESEARCH_DESK,
    ProductionBuildingType.RECRUITMENT_STATION,
  ])

  return [
    {
      id: 'manual_harvest',
      title: '点击资源点手动采集一次',
      hint: '地图上的树木、石头、作物和矿点都能直接点击，前期可以主动补资源。',
      completed: input.manualHarvestCount > 0,
    },
    {
      id: 'build_first',
      title: '放下第一座建筑',
      hint: '房屋、厨房、农场都适合开局，先把你的第一步规划落到地面上。',
      completed: input.buildings.length > 0,
    },
    {
      id: 'build_production',
      title: '完成第一座生产建筑',
      hint: '农场、伐木场、采石场会让你从“看角色干活”变成“拥有稳定产出”。',
      completed: hasProductionBuilding,
    },
    {
      id: 'unlock_growth',
      title: '建成研究台或招募站',
      hint: '研究台打开科技推进，招募站打开人口扩张，任意一条都会让中期更快成形。',
      completed: hasGrowthBuilding,
    },
    {
      id: 'recruit_character',
      title: '招募第 6 名成员',
      hint: '把金币转成人口后，你的规划才会真正扩散到更多岗位。',
      completed: input.characterCount > 5,
    },
    {
      id: 'defeat_boss',
      title: '拿到第一份核心零件',
      hint: '击败 Boss 后掉落核心零件，用它推动阶段突破。',
      completed: input.coreParts > 0,
    },
  ]
}

export function getCurrentGuideStep(input: GuideProgressInput): { currentStep: GuideStep | null; completedCount: number; totalCount: number } {
  const steps = getGuideSteps(input)
  const completedCount = steps.filter(step => step.completed).length
  const currentStep = steps.find(step => !step.completed) ?? null

  return {
    currentStep,
    completedCount,
    totalCount: steps.length,
  }
}
