import { SHARED_NEGATIVE_PROMPT, STYLE_PRESETS } from "./styles";
import type { Style } from "./types";

export type PromptInput = {
  style: Style;
  imageCount: number;
  // 약한 움직임 재생성 옵션 (UX_FLOWS Regeneration: "움직임 약하게").
  weakMotion?: boolean;
};

export type BuiltPrompt = {
  prompt: string;
  negativePrompt: string;
};

// 스타일 + 입력 메타데이터로 서버측에서 프롬프트를 생성한다.
// 멀티 이미지는 hero(첫) 이미지 기준 호출 + 나머지는 컨텍스트로 안내 (IMPLEMENTATION_PLAN Technical Risks).
export function buildPrompt({ style, imageCount, weakMotion }: PromptInput): BuiltPrompt {
  const preset = STYLE_PRESETS[style];
  const parts = [preset.promptTemplate];

  if (imageCount > 1) {
    parts.push(
      `Use the first image as the primary scene and treat the remaining ${imageCount - 1} reference image(s) as additional context for style and subject consistency.`,
    );
  }

  // 입력물 보존을 항상 강조.
  parts.push(
    "Always prioritize preserving the original subject, identity, and scene over creative changes.",
  );

  if (weakMotion) {
    parts.push("Keep the motion very subtle and gentle; minimize camera movement.");
  }

  return {
    prompt: parts.join(" "),
    negativePrompt: SHARED_NEGATIVE_PROMPT,
  };
}
