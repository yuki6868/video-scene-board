const API_BASE_URL = "http://127.0.0.1:8000";

export async function fetchVideoAnalyticsDaily(videoId) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/analytics/daily`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`分析データ取得に失敗しました: ${errorText}`);
  }

  return response.json();
}

export async function syncVideoAnalytics(videoId) {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/analytics/sync`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`分析データ同期に失敗しました: ${errorText}`);
  }

  return response.json();
}

export async function fetchVideoAnalyticsSummary(videoId) {
  const response = await fetch(
    `${API_BASE_URL}/videos/${videoId}/analytics/summary`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`サマリー取得に失敗しました: ${errorText}`);
  }

  return response.json();
}