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

export async function createTask(data) {
  const response = await fetch("http://127.0.0.1:8000/tasks/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("タスク作成に失敗しました");
  }

  return response.json();
}

export async function updateTask(taskId, data) {
  const response = await fetch(`http://127.0.0.1:8000/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("タスク更新に失敗しました");
  }

  return response.json();
}

export async function deleteTask(taskId) {
  const response = await fetch(`http://127.0.0.1:8000/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("タスク削除に失敗しました");
  }
}