import { useEffect, useState } from "react";
import {
  fetchAssets,
  updateAsset,
  deleteAsset,
  generateTaskFromAsset,
} from "../../api/assetApi";
import AssetEditModal from "./AssetEditModal";

const initialAssetForm = {
  title: "",
  asset_type: "material",
  status: "idea",
  location_type: "none",
  path_or_url: "",
  memo: "",
  file: null,
};

function getAssetStatusLabel(status) {
  switch (status) {
    case "idea":
      return "未着手";
    case "searching":
      return "探し中";
    case "creating":
      return "作成中";
    case "ready":
      return "準備済み";
    case "missing":
      return "不足";
    default:
      return status;
  }
}

function getAssetTypeLabel(type) {
  switch (type) {
    case "material":
      return "素材";
    case "audio":
      return "音声";
    case "background":
      return "背景";
    case "se":
      return "効果音";
    case "bgm":
      return "BGM";
    default:
      return type;
  }
}

function getTaskStatusClassName(status) {
  switch (status) {
    case "未着手":
      return "task-badge task-status-todo";
    case "作業中":
      return "task-badge task-status-doing";
    case "完了":
      return "task-badge task-status-done";
    default:
      return "task-badge";
  }
}

export default function SceneModal({
  isOpen,
  form,
  videoId,
  editingSceneId,
  onChange,
  onSubmit,
  onClose,
  loadTasks,
  tasks,
  handleUpdateTaskStatus,
}) {
  const [assets, setAssets] = useState([]);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  async function loadAssets() {
    if (!editingSceneId) {
      setAssets([]);
      return;
    }

    try {
      const data = await fetchAssets({ sceneId: editingSceneId });
      setAssets(data);
    } catch (err) {
      console.error(err);
      setAssets([]);
    }
  }

  const sceneTasks = (tasks ?? []).filter(
    (task) => task.scene_id === editingSceneId
  );

  useEffect(() => {
    if (!isOpen || !editingSceneId) {
      setAssets([]);
      setEditingAssetId(null);
      setAssetForm(initialAssetForm);
      return;
    }

    loadAssets();
  }, [isOpen, editingSceneId]);

  async function handleAssetSubmit() {
    if (!editingSceneId) {
      alert("先にシーンを保存してください");
      return;
    }

    if (!assetForm.title.trim()) {
      alert("素材タイトルを入力してください");
      return;
    }

    const formData = new FormData();

    formData.append("video_id", videoId);
    formData.append("scene_id", editingSceneId);
    formData.append("title", assetForm.title);
    formData.append("asset_type", assetForm.asset_type);
    formData.append("status", assetForm.status);
    formData.append("location_type", assetForm.location_type);
    formData.append("memo", assetForm.memo || "");

    if (assetForm.file) {
      formData.append("file", assetForm.file);
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/assets/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("失敗");
      }

      await loadAssets();
      setAssetForm(initialAssetForm);
    } catch (err) {
      console.error(err);
      alert(
        editingAssetId === null
          ? "素材の作成に失敗しました"
          : "素材の更新に失敗しました"
      );
    }
  }

  function handleAssetEditCancel() {
    setEditingAssetId(null);
    setAssetForm(initialAssetForm);
  }

  async function handleAssetDelete(assetId) {
    const ok = window.confirm("この素材を削除しますか？");
    if (!ok) return;

    try {
      await deleteAsset(assetId);
      await loadAssets();

      if (editingAssetId === assetId) {
        setEditingAssetId(null);
        setAssetForm(initialAssetForm);
      }
    } catch (err) {
      console.error(err);
      alert("素材の削除に失敗しました");
    }
  }

  async function handleGenerateTaskFromAsset(asset) {
    try {
      await generateTaskFromAsset(asset.id);
      await loadTasks();
      alert(`「${asset.title}」からタスクを生成しました`);
    } catch (err) {
      console.error(err);
      alert("素材からタスクを生成できませんでした");
    }
  }

  async function handleAssetUpdate(updated) {
    if (!editingAsset) return;

    try {
      await updateAsset(editingAsset.id, updated);
      setIsAssetModalOpen(false);
      setEditingAsset(null);
      await loadAssets();
    } catch (err) {
      console.error(err);
      alert("素材の更新に失敗しました");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingSceneId ? "シーン編集" : "シーン追加"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="scene-form modal-form" onSubmit={onSubmit}>
          <input
            name="title"
            placeholder="タイトル"
            value={form.title}
            onChange={onChange}
            required
          />

          <textarea
            name="script"
            placeholder="台本"
            value={form.script}
            onChange={onChange}
            rows={8}
          />

          <textarea
            name="materials"
            placeholder="素材"
            value={form.materials}
            onChange={onChange}
            rows={6}
          />

          <select
            name="section_type"
            value={form.section_type || ""}
            onChange={onChange}
          >
            <option value="">選択</option>
            <option value="導入">導入</option>
            <option value="展開">展開</option>
            <option value="対立">対立</option>
            <option value="オチ">オチ</option>
          </select>

          <select name="status" value={form.status} onChange={onChange}>
            <option value="未着手">未着手</option>
            <option value="作業中">作業中</option>
            <option value="完了">完了</option>
          </select>

          <input
            name="duration_seconds"
            type="number"
            placeholder="秒数"
            value={form.duration_seconds || ""}
            onChange={onChange}
          />

          <input
            name="character_name"
            placeholder="キャラ名"
            value={form.character_name || ""}
            onChange={onChange}
          />
          <input
            name="character_expression"
            placeholder="表情"
            value={form.character_expression || ""}
            onChange={onChange}
          />

          <input
            name="audio_path"
            placeholder="音声パス"
            value={form.audio_path || ""}
            onChange={onChange}
          />
          <input
            name="background_path"
            placeholder="背景パス"
            value={form.background_path || ""}
            onChange={onChange}
          />
          <input
            name="se_path"
            placeholder="SEパス"
            value={form.se_path || ""}
            onChange={onChange}
          />

          <textarea
            name="telop"
            placeholder="テロップ"
            value={form.telop || ""}
            onChange={onChange}
          />
          <textarea
            name="direction"
            placeholder="演出指示"
            value={form.direction || ""}
            onChange={onChange}
          />
          <textarea
            name="edit_note"
            placeholder="編集メモ"
            value={form.edit_note || ""}
            onChange={onChange}
          />

          <div className="asset-section">
            <h3>素材一覧</h3>

            {editingSceneId && (
              <div className="asset-create-form">
                <input
                  type="text"
                  placeholder="素材タイトル"
                  value={assetForm.title}
                  onChange={(e) =>
                    setAssetForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                />

                <select
                  value={assetForm.asset_type}
                  onChange={(e) =>
                    setAssetForm((prev) => ({ ...prev, asset_type: e.target.value }))
                  }
                >
                  <option value="material">素材</option>
                  <option value="audio">音声</option>
                  <option value="background">背景</option>
                  <option value="se">SE</option>
                  <option value="bgm">BGM</option>
                </select>

                <select
                  value={assetForm.status}
                  onChange={(e) =>
                    setAssetForm((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  <option value="idea">未着手</option>
                  <option value="searching">探し中</option>
                  <option value="creating">作成中</option>
                  <option value="ready">準備済み</option>
                  <option value="missing">不足</option>
                </select>

                {assetForm.location_type === "local" && (
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setAssetForm((prev) => ({
                        ...prev,
                        file,
                        path_or_url: file?.name || "",
                      }));
                    }}
                  />
                )}

                {assetForm.location_type === "url" && (
                  <input
                    type="text"
                    placeholder="URL"
                    value={assetForm.path_or_url}
                    onChange={(e) =>
                      setAssetForm((prev) => ({
                        ...prev,
                        path_or_url: e.target.value,
                      }))
                    }
                  />
                )}

                <select
                  value={assetForm.location_type}
                  onChange={(e) =>
                    setAssetForm((prev) => ({
                      ...prev,
                      location_type: e.target.value,
                    }))
                  }
                >
                  <option value="none">未作成</option>
                  <option value="local">ファイル</option>
                  <option value="url">URL</option>
                </select>

                <textarea
                  placeholder="メモ"
                  value={assetForm.memo}
                  onChange={(e) =>
                    setAssetForm((prev) => ({ ...prev, memo: e.target.value }))
                  }
                  rows={3}
                />

                <div className="asset-form-actions">
                  <button
                    type="button"
                    className="submit-button"
                    onClick={handleAssetSubmit}
                  >
                    {editingAssetId === null ? "素材追加" : "素材更新"}
                  </button>

                  {editingAssetId !== null && (
                    <button
                      type="button"
                      className="cancel-button"
                      onClick={handleAssetEditCancel}
                    >
                      編集キャンセル
                    </button>
                  )}
                </div>
              </div>
            )}

            {!editingSceneId ? (
              <p>シーン追加後に素材を紐づけられます</p>
            ) : (
              <>
                {assets.length === 0 ? (
                  <p>素材はまだありません</p>
                ) : (
                  <ul className="asset-list">
                    {assets.map((asset) => (
                      <li key={asset.id} className="asset-item">
                        <div><strong>{asset.title}</strong></div>
                        <div className={`asset-type type-${asset.asset_type}`}>
                          種別: {getAssetTypeLabel(asset.asset_type)}
                        </div>
                        <div className={`asset-status status-${asset.status}`}>
                          状態: {getAssetStatusLabel(asset.status)}
                        </div>
                        {asset.path_or_url && <div>パス: {asset.path_or_url}</div>}
                        {asset.memo && <div>メモ: {asset.memo}</div>}

                        <div className="asset-item-actions">
                          <button
                            type="button"
                            className="submit-button"
                            onClick={() => handleGenerateTaskFromAsset(asset)}
                          >
                            タスク化
                          </button>
                          <button
                            type="button"
                            className="submit-button"
                            onClick={() => {
                              setEditingAsset(asset);
                              setIsAssetModalOpen(true);
                            }}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => handleAssetDelete(asset.id)}
                          >
                            削除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <h3>タスク</h3>

                {sceneTasks.length === 0 ? (
                  <p>タスクはありません</p>
                ) : (
                  <ul className="scene-task-list">
                    {sceneTasks.map((task) => (
                      <li key={task.id} className="scene-task-item">
                        <div className="scene-task-header">
                          <strong>{task.title}</strong>
                          <span className={getTaskStatusClassName(task.status)}>
                            {task.status}
                          </span>
                        </div>

                        {task.detail ? (
                          <p className="scene-task-detail">{task.detail}</p>
                        ) : null}

                        <div className="scene-task-actions">
                          <button
                            type="button"
                            className="submit-button"
                            onClick={() =>
                              handleUpdateTaskStatus(
                                task,
                                task.status === "完了" ? "未着手" : "完了"
                              )
                            }
                          >
                            {task.status === "完了" ? "未着手に戻す" : "完了にする"}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button">
              {editingSceneId ? "更新" : "追加"}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </form>

        <AssetEditModal
          isOpen={isAssetModalOpen}
          asset={editingAsset}
          onClose={() => {
            setIsAssetModalOpen(false);
            setEditingAsset(null);
          }}
          onSave={handleAssetUpdate}
        />
      </div>
    </div>
  );
}