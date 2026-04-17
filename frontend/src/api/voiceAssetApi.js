const API_BASE_URL = "http://127.0.0.1:8000";

export async function generateVoiceAsset(payload) {
  const response = await fetch(`${API_BASE_URL}/voice-assets/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`音声生成に失敗しました: ${errorText}`);
  }

  return response.json();
}

export async function fetchVoiceAssets(sceneId) {
  const response = await fetch(`${API_BASE_URL}/voice-assets/scene/${sceneId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`音声一覧の取得に失敗しました: ${errorText}`);
  }

  return response.json();
}

export async function selectVoiceAsset(voiceAssetId) {
  const response = await fetch(`${API_BASE_URL}/voice-assets/${voiceAssetId}/select`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`採用設定に失敗しました: ${errorText}`);
  }

  return response.json();
}

export function getVoiceAssetAudioDownloadUrl(voiceAssetId) {
  return `${API_BASE_URL}/voice-assets/${voiceAssetId}/download/audio`;
}

export function getVoiceAssetSubtitleDownloadUrl(voiceAssetId) {
  return `${API_BASE_URL}/voice-assets/${voiceAssetId}/download/subtitle`;
}