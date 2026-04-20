import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { mascotReactionImage } from "@/components/MascotReactions";
import { useSplashScreen } from "@/components/SplashScreen";
import { speakWithIdiom } from "@/lib/tts/speak";
import { mascotVoiceConfig } from "@/config/mascot-voice.config";
import { useCallback } from "react";

export function WelcomeSplash() {
  const [state] = useSplashScreen();
  const speak = useCallback(
    () => speakWithIdiom(state.title || "", "enUS", mascotVoiceConfig),
    [state.title],
  );

  if (!state.open) {
    return null;
  }

  
  return (
    <Box
      role="presentation"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        background:
          "radial-gradient(ellipse 120% 80% at 50% 60%, #1a1240 0%, #070510 55%, #040308 100%)",
      }}
    >
      <Stack
        spacing={2}
        alignItems="center"
        sx={{ width: "100%", maxWidth: 420 }}
      >
        {state.title ? (
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              letterSpacing: 0.02,
              color: "rgba(255, 255, 255, 0.92)",
              textAlign: "center",
            }}
          >
            {state.title}
          </Typography>
        ) : null}
        {state.message ? (
          <Typography
            variant="body1"
            sx={{ color: "rgba(230, 220, 255, 0.75)", textAlign: "center" }}
          >
            {state.message}
          </Typography>
        ) : null}

        <div onClick={() => speak()}>
          <Box
            component="img"
            src={mascotReactionImage(state.reactionType)}
            alt="Elephant mascot"
            sx={{
              width: "min(72vw, 320px)",
              height: "auto",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>
        {state.content ? (
          <Box sx={{ width: "100%" }}>{state.content}</Box>
        ) : null}
      </Stack>
    </Box>
  );
}
