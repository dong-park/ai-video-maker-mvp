import { describe, expect, it } from "vitest";
import { buildPrompt } from "@/lib/prompt";
import { STYLES } from "@/lib/types";

describe("buildPrompt", () => {
  it("모든 스타일에 대해 비어있지 않은 prompt + negative prompt 를 만든다", () => {
    for (const style of STYLES) {
      const { prompt, negativePrompt } = buildPrompt({ style, imageCount: 1 });
      expect(prompt.length).toBeGreaterThan(20);
      expect(negativePrompt.length).toBeGreaterThan(10);
    }
  });

  it("멀티 이미지면 hero(첫) 이미지 기준 컨텍스트 문구를 포함한다", () => {
    const { prompt } = buildPrompt({ style: "product_ad", imageCount: 3 });
    expect(prompt).toContain("first image");
    expect(prompt).toContain("2");
  });

  it("단일 이미지면 멀티 이미지 문구가 없다", () => {
    const { prompt } = buildPrompt({ style: "product_ad", imageCount: 1 });
    expect(prompt).not.toContain("remaining");
  });

  it("weakMotion 옵션이면 약한 움직임 지시를 더한다", () => {
    const { prompt } = buildPrompt({
      style: "natural_motion",
      imageCount: 1,
      weakMotion: true,
    });
    expect(prompt.toLowerCase()).toContain("subtle");
  });
});
