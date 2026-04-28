import { ToggleButton } from "@mui/material";

import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';

type VolumeToggleButtonProps = {
  value: boolean, 
  onChange: (value: boolean) => void, 
  children?: React.ReactNode,
  selectedIcon?: React.ReactNode,
  unselectedIcon?: React.ReactNode,
}
export function VolumeToggleButton({value, onChange, children, selectedIcon, unselectedIcon}: VolumeToggleButtonProps) {
  
  return (
    <ToggleButton value={value} onChange={(_, value) => onChange(!value)}>
      {children}
      {value ? (selectedIcon || <VolumeUpOutlinedIcon />) : (unselectedIcon || <VolumeOffOutlinedIcon />)}
    </ToggleButton>
  )
}