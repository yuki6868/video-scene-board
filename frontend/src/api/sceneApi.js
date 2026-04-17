const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchScenes(videoId) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/scenes`);

  if (!response.ok) {
    throw new Error("シーン一覧の取得に失敗しました");
  }

  return response.json();
}

export async function createScene(videoId, scene) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/scenes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(scene),
  });

  if (!response.ok) {
    throw new Error("シーン作成に失敗しました");
  }

  return response.json();
}

export async function updateScene(sceneId, scene) {
  const response = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(scene),
  });

  if (!response.ok) {
    throw new Error("シーン更新に失敗しました");
  }

  return response.json();
}

export async function deleteScene(sceneId) {
  const response = await fetch(`${API_BASE_URL}/scenes/${sceneId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("シーン削除に失敗しました");
  }

  return response.json();
}

export async function reorderScenes(videoId, items) {
  const response = await fetch(
    `${API_BASE_URL}/videos/${videoId}/scenes/reorder`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(items),
    }
  );

  if (!response.ok) {
    throw new Error("シーン並び替えに失敗しました");
  }

  return response.json();
}

export async function duplicateScene(sceneId) {
  const response = await fetch(`${API_BASE_URL}/scenes/${sceneId}/duplicate`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("シーン複製に失敗しました");
  }

  return response.json();
}

export function getSceneAudioDownloadUrl(sceneId) {
  return `${API_BASE_URL}/scenes/${sceneId}/download/audio`;
}

export function getSceneSubtitleDownloadUrl(sceneId) {
  return `${API_BASE_URL}/scenes/${sceneId}/download/subtitle`;
}