import { ShopPanel } from './ShopPanel'

interface BuildingShopPanelProps {
  onClose: () => void
}

export function BuildingShopPanel({ onClose }: BuildingShopPanelProps) {
  return <ShopPanel onClose={onClose} />
}
