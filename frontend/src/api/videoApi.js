const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchVideos() {
  const response = await fetch(`${API_BASE_URL}/videos/`);

  if (!response.ok) {
    throw new Error("動画一覧の取得に失敗しました");
  }

  return response.json();
}

export async function createVideo(video) {
  const response = await fetch(`${API_BASE_URL}/videos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(video),
  });

  if (!response.ok) {
    throw new Error("動画作成に失敗しました");
  }

  return response.json();
}

export async function updateVideo(videoId, video) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(video),
  });

  if (!response.ok) {
    throw new Error("動画更新に失敗しました");
  }

  return response.json();
}

export async function deleteVideo(videoId) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("動画削除に失敗しました");
  }

  return response.json();
}

export async function duplicateVideo(videoId) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/duplicate`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("動画複製に失敗しました");
  }

  return response.json();
}

export async function exportVideoDavinci(videoId) {
  const res = await fetch(`http://127.0.0.1:8000/videos/${videoId}/export/davinci`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("DaVinci出力に失敗しました");
  }

  return await res.json();
}

export function getDavinciExportDownloadUrl(videoId) {
  return `http://127.0.0.1:8000/videos/${videoId}/export/davinci/download`;
}