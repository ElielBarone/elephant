import { IdiomFlag } from "./IdiomFlag";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Idiom } from "@/types/models";

export function IdiomInformation({ label, idiom, children }: { label: string, idiom: Idiom, children?: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
      <IdiomFlag idiom={idiom} height={32} decorative />
      {children}
      <Typography color="text.secondary">
      {label} 
      </Typography>
    </Stack>
  )
}