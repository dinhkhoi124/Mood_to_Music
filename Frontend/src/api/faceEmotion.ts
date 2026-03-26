// File: frontend/api/faceEmotion.ts
import { api } from "@/lib/api";
export interface EmotionPrediction {
  emotion: string;
  confidence: number;
}

export interface MusicSuggestion {
  title: string;
  url: string;
  video_id?: string; // Thêm video_id (optional vì url có thể là fallback)
}

export interface FaceEmotionResponse {
  predictions: EmotionPrediction[];
  music_suggestions: MusicSuggestion[];
  message: string; // <<< ĐÃ THÊM TRƯỜNG NÀY CHO TTS
}

export async function predictFaceEmotion(
  formData: FormData
): Promise<FaceEmotionResponse> {
  const headers = api.getHeaders();
  // Remove Content-Type since FormData automatically sets it with boundary
  delete headers['Content-Type'];

  const res = await fetch("http://localhost:5001/predict_face", {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch prediction: ${res.statusText}`);
  }
  return res.json();
}
