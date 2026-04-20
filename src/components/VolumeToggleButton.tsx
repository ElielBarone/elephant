import { ToggleButton } from "@mui/material";

import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';

export function VolumeToggleButton({value, onChange, children}: {value: boolean, onChange: (value: boolean) => void, children?: React.ReactNode}) {
  return (
    <ToggleButton value={value} onChange={(_, value) => onChange(!value)}>
      {children}
      {value ? <VolumeUpOutlinedIcon /> : <VolumeOffOutlinedIcon />}
    </ToggleButton>
  )
}