import * as React from 'react'

import { STORAGE_KEYS } from '@/constants/storage'

/** Menu lateral recolhido pra ícones só, com a preferência lembrada entre visitas. */
export function useSidebarColapsada() {
  const [colapsada, setColapsada] = React.useState(() => localStorage.getItem(STORAGE_KEYS.sidebarColapsada) === '1')

  const alternar = React.useCallback(() => {
    setColapsada((atual) => {
      const novo = !atual
      localStorage.setItem(STORAGE_KEYS.sidebarColapsada, novo ? '1' : '0')
      return novo
    })
  }, [])

  return { colapsada, alternar }
}
