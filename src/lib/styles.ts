import type { Style } from "./types";

// 스타일 프리셋: UI 카피(UX_FLOWS Screen 3) + 서버측 프롬프트 템플릿(README 프롬프트 초안).
// 프롬프트는 사용자에게 절대 노출하지 않는다 (PRD UX Principle 1).
export type StylePreset = {
  id: Style;
  label: string;
  copy: string;
  bestFor: string[];
  promptTemplate: string;
};

export const STYLE_PRESETS: Record<Style, StylePreset> = {
  natural_motion: {
    id: "natural_motion",
    label: "Natural Motion",
    copy: "사진이 자연스럽게 살아나는 느낌",
    bestFor: ["인물", "음식", "일상 사진"],
    promptTemplate:
      "Create a short natural motion video from the provided reference images. " +
      "Keep the subject identity and composition consistent. " +
      "Add subtle camera movement, realistic lighting, and smooth motion. " +
      "Avoid distortion, face changes, extra limbs, text artifacts, or warping.",
  },
  cinematic_zoom: {
    id: "cinematic_zoom",
    label: "Cinematic Zoom",
    copy: "천천히 줌인되는 영화 같은 무드",
    bestFor: ["여행", "공간", "프로필"],
    promptTemplate:
      "Create a cinematic short video from these references. " +
      "Use slow zoom-in, soft depth of field, realistic lighting, and smooth camera movement. " +
      "Preserve the subject, face, product shape, and original scene details.",
  },
  instagram_reel: {
    id: "instagram_reel",
    label: "Instagram Reel",
    copy: "세로 숏폼에 어울리는 감각적인 움직임",
    bestFor: ["인스타", "틱톡", "브이로그"],
    promptTemplate:
      "Create a punchy vertical short-form video from these references. " +
      "Use energetic but smooth camera movement suited for social reels, vivid lighting, and clean motion. " +
      "Preserve the subject identity and composition. Avoid distortion or warping.",
  },
  product_ad: {
    id: "product_ad",
    label: "Product Ad",
    copy: "상품을 선명하게 보여주는 광고 컷",
    bestFor: ["쇼핑몰", "스마트스토어", "브랜드 상품"],
    promptTemplate:
      "Create a polished product advertisement video from these images. " +
      "Use premium lighting, clean composition, smooth camera movement, and commercial presentation. " +
      "Preserve product shape, text, color, and material details.",
  },
  memory_montage: {
    id: "memory_montage",
    label: "Memory Montage",
    copy: "여러 장면을 감성적으로 이어주는 영상",
    bestFor: ["여행", "가족", "이벤트"],
    promptTemplate:
      "Create a warm emotional montage from these images. " +
      "Use gentle transitions, soft cinematic motion, natural depth, and nostalgic atmosphere. " +
      "Preserve the original people, places, and mood.",
  },
};

// 모든 스타일 공통 negative prompt. 입력물 보존 강조 (PRD UX Principle 4, Technical Risks).
export const SHARED_NEGATIVE_PROMPT =
  "distorted face, deformed, extra limbs, extra fingers, warping, melting, " +
  "morphing identity, text artifacts, watermark, logo, low quality, flicker, " +
  "heavy motion, unnatural movement";

export function styleList(): StylePreset[] {
  return Object.values(STYLE_PRESETS);
}
