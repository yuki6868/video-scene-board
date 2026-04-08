const ASSET_API_BASE_URL = "http://127.0.0.1:8000/assets";

export async function fetchAssets(params = {}) {
  const query = new URLSearchParams();

  if (params.videoId != null) {
    query.append("video_id", params.videoId);
  }

  if (params.sceneId != null) {
    query.append("scene_id", params.sceneId);
  }

  if (params.assetType) {
    query.append("asset_type", params.assetType);
  }

  if (params.status) {
    query.append("status", params.status);
  }

  const url = query.toString()
    ? `${ASSET_API_BASE_URL}/?${query.toString()}`
    : `${ASSET_API_BASE_URL}/`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("素材一覧の取得に失敗しました");
  }

  return response.json();
}

export async function fetchAsset(assetId) {
  const response = await fetch(`${ASSET_API_BASE_URL}/${assetId}`);

  if (!response.ok) {
    throw new Error("素材詳細の取得に失敗しました");
  }

  return response.json();
}

export async function createAsset(asset) {
  const response = await fetch(`${ASSET_API_BASE_URL}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(asset),
  });

  if (!response.ok) {
    throw new Error("素材の作成に失敗しました");
  }

  return response.json();
}

export async function updateAsset(assetId, asset) {
  const response = await fetch(`${ASSET_API_BASE_URL}/${assetId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(asset),
  });

  if (!response.ok) {
    throw new Error("素材の更新に失敗しました");
  }

  return response.json();
}

export async function deleteAsset(assetId) {
  const response = await fetch(`${ASSET_API_BASE_URL}/${assetId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("素材の削除に失敗しました");
  }

  return;
}

export async function generateTaskFromAsset(assetId) {
  const response = await fetch(`${ASSET_API_BASE_URL}/${assetId}/generate-task`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("素材からタスクを生成できませんでした");
  }

  return response.json();
}