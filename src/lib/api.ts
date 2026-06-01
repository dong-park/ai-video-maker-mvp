import type {
  AspectRatio,
  AssetType,
  Duration,
  InputType,
  JobStatus,
  Style,
} from "./types";

// API 응답 DTO (client/server 공유).
export type AssetDTO = {
  id: string;
  type: AssetType;
  storageUrl: string;
  sortOrder: number;
  selected: boolean;
  durationSeconds: number | null;
};

export type OutputDTO = {
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
};

export type JobResponse = {
  id: string;
  inputType: InputType;
  status: JobStatus;
  progress: number;
  style: Style;
  aspectRatio: AspectRatio;
  durationSeconds: Duration;
  errorCode: string | null;
  errorMessage: string | null;
  assets: AssetDTO[];
  output: OutputDTO | null;
};
