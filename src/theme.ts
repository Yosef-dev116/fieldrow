import { useColorScheme } from "react-native";

const lightColors = {
  background: "#ffffff",
  text: "#111111",
  border: "#cccccc",
  placeholder: "#888888",
};

const darkColors = {
  background: "#111111",
  text: "#ffffff",
  border: "#444444",
  placeholder: "#888888",
};

export type ThemeColors = typeof lightColors;

/** FR-020's light/dark requirement, as one shared palette instead of a per-screen copy. */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}
