import {
  ASPECT_RATIOS,
  DURATIONS,
  STYLES,
  type AspectRatio,
  type Duration,
  type Style,
} from "./types";

export function parseStyle(value: unknown): Style | undefined {
  return STYLES.includes(value as Style) ? (value as Style) : undefined;
}

export function parseAspectRatio(value: unknown): AspectRatio | undefined {
  return ASPECT_RATIOS.includes(value as AspectRatio)
    ? (value as AspectRatio)
    : undefined;
}

export function parseDuration(value: unknown): Duration | undefined {
  return DURATIONS.includes(value as Duration) ? (value as Duration) : undefined;
}
