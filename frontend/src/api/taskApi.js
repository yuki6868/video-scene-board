const TASK_API_BASE_URL = "http://127.0.0.1:8000/tasks";

export async function fetchTasks(params = {}) {
  const query = new URLSearchParams();

  if (params.videoId != null) {
    query.append("video_id", params.videoId);
  }

  if (params.sceneId != null) {
    query.append("scene_id", params.sceneId);
  }

  if (params.status) {
    query.append("status", params.status);
  }

  const url = query.toString()
    ? `${TASK_API_BASE_URL}/?${query.toString()}`
    : `${TASK_API_BASE_URL}/`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("タスク一覧の取得に失敗しました");
  }

  return response.json();
}