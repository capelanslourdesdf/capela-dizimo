import { Badge, type BadgeProps } from '@/components/ui/badge'

interface StatusBadgeProps {
  label: string
  variant: BadgeProps['variant']
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>
}
