import type { MouseEventHandler, ReactNode } from 'react'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface CardNewItemProps {
  label: string
  icon: ReactNode
  onClick: MouseEventHandler<HTMLButtonElement>
  minHeight?: number | string
}

export function CardNewItem({ label, icon, onClick, minHeight }: CardNewItemProps) {
  return (
    <ButtonBase
      type="button"
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'block',
        textAlign: 'inherit',
        borderRadius: 1,
        border: '1px dashed',
        borderColor: 'divider',
        p: 2,
        minHeight,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} component={Box}>
        {icon}
        <Typography>{label}</Typography>
      </Stack>
    </ButtonBase>
  )
}
