// File: frontend/api/voiceEmotion.ts (ĐÃ SỬA ĐỂ KHỚP VỚI BACKEND)

export interface EmotionPrediction {
  emotion: string;
  confidence: number;
}

export interface MusicSuggestion {
  title: string;
  url: string;
  video_id: string;
}

export interface VoiceEmotionResponse {
  predictions: EmotionPrediction[]; // <<< SỬA: Phải là mảng predictions
  music_suggestions: MusicSuggestion[];
  message: string; // <<< ĐÃ THÊM TRƯỜNG NÀY CHO TTS
}

export async function predictVoiceEmotion(
  audioBase64: string
): Promise<VoiceEmotionResponse> {
  const res = await fetch("http://localhost:5001/predict_voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioData: audioBase64 }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch voice prediction: ${res.statusText}`);
  }
  return res.json();
}
