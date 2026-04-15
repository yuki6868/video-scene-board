import { useEffect, useState } from "react";
import {
  fetchAssets,
  deleteAsset,
  generateTaskFromAsset,
  updateAsset,
  fetchCreditSources,
  deleteCreditSource,
} from "../../api/assetApi";
import AssetEditModal from "../modals/AssetEditModal";

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
}

function buildAssetFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/uploads/${path}`;
}

function isImagePath(path) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(path || "");
}

const initialAssetForm = {
  title: "",
  asset_type: "material",
  status: "idea",
  location_type: "none",
  path_or_url: "",
  source_note: "",
  memo: "",
  file: null,
  binding_scope: "scene",
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

export default function SceneAssetSection({
  editingSceneId,
  videoId,
  loadTasks,
  onAssetUpdated,
}) {
  const [sceneAssets, setSceneAssets] = useState([]);
  const [sharedAssets, setSharedAssets] = useState([]);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [creditSourceOptions, setCreditSourceOptions] = useState([]);

  async function loadAssets() {
    if (!videoId) {
      setSceneAssets([]);
      setSharedAssets([]);
      return;
    }

    try {
      const requests = [
        fetchAssets({ videoId, globalOnly: true }),
      ];

      if (editingSceneId) {
        requests.unshift(fetchAssets({ sceneId: editingSceneId }));
      }

      const results = await Promise.all(requests);

      if (editingSceneId) {
        setSceneAssets(results[0] || []);
        setSharedAssets(results[1] || []);
      } else {
        setSceneAssets([]);
        setSharedAssets(results[0] || []);
      }
    } catch (err) {
      console.error(err);
      setSceneAssets([]);
      setSharedAssets([]);
    }
  }

  async function loadCreditSourceOptions(nextAssetType = assetForm.asset_type) {
    if (!videoId) {
      setCreditSourceOptions([]);
      return;
    }

    try {
      const data = await fetchCreditSources({
        videoId,
        assetType: nextAssetType,
      });
      setCreditSourceOptions(data);
    } catch (err) {
      console.error(err);
      setCreditSourceOptions([]);
    }
  }

  useEffect(() => {
    if (!videoId) {
      setSceneAssets([]);
      setSharedAssets([]);
      setEditingAssetId(null);
      setAssetForm(initialAssetForm);
      return;
    }

    loadAssets();
    loadCreditSourceOptions(initialAssetForm.asset_type);
  }, [editingSceneId, videoId]);

  async function handleAssetSubmit() {
    if (!videoId) {
      alert("先に動画を保存してください");
      return;
    }

    if (assetForm.binding_scope === "scene" && !editingSceneId) {
      alert("先にシーンを保存してください");
      return;
    }

    if (!assetForm.title.trim()) {
      alert("素材タイトルを入力してください");
      return;
    }

    const formData = new FormData();

    formData.append("video_id", videoId);

    if (assetForm.binding_scope === "scene" && editingSceneId) {
      formData.append("scene_id", editingSceneId);
    }

    formData.append("title", assetForm.title);
    formData.append("asset_type", assetForm.asset_type);
    formData.append("status", assetForm.status);
    formData.append("location_type", assetForm.location_type);
    formData.append("path_or_url", assetForm.path_or_url || "");
    formData.append("source_note", assetForm.source_note || "");
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
      setEditingAssetId(null);
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

  function applyCreditSource(sourceNote) {
    setAssetForm((prev) => ({
      ...prev,
      source_note: sourceNote,
    }));
  }

  async function handleDeleteCreditSource(sourceNote) {
    if (!videoId) return;

    const ok = window.confirm("この過去クレジット候補を削除しますか？");
    if (!ok) return;

    try {
      await deleteCreditSource({
        videoId,
        assetType: assetForm.asset_type,
        sourceNote,
      });

      setAssetForm((prev) => ({
        ...prev,
        source_note: prev.source_note === sourceNote ? "" : prev.source_note,
      }));

      await loadCreditSourceOptions(assetForm.asset_type);
    } catch (err) {
      console.error(err);
      alert("クレジット候補の削除に失敗しました");
    }
  }

  async function handleAssetUpdate(updated) {
    if (!editingAsset) return;

    try {
        await updateAsset(editingAsset.id, updated);
        setIsAssetModalOpen(false);
        setEditingAsset(null);

        await loadAssets();
        await loadTasks();

        if (onAssetUpdated) {
        await onAssetUpdated();
        }
    } catch (err) {
        console.error(err);
        alert("素材の更新に失敗しました");
    }
  }

    function renderAssetList(items, emptyMessage) {
    if (items.length === 0) {
      return <p>{emptyMessage}</p>;
    }

    return (
      <ul className="asset-list">
        {items.map((asset) => (
          <li key={asset.id} className="asset-item">
            <div><strong>{asset.title}</strong></div>

            <div>
              紐づけ先: {asset.scene_id == null ? "動画共通" : "このシーン"}
            </div>

            <div className={`asset-type type-${asset.asset_type}`}>
              種別: {getAssetTypeLabel(asset.asset_type)}
            </div>

            <div className={`asset-status status-${asset.status}`}>
              状態: {getAssetStatusLabel(asset.status)}
            </div>

            {asset.path_or_url && <div>パス: {asset.path_or_url}</div>}

            {asset.path_or_url && isImagePath(asset.path_or_url) && (
              <div className="scene-image-preview">
                <p className="scene-image-preview-label">素材プレビュー</p>
                <img
                  src={buildFileUrl(asset.path_or_url)}
                  alt={asset.title}
                  className="scene-preview-image"
                />
              </div>
            )}

            {asset.source_note && <div>クレジット: {asset.source_note}</div>}
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
    );
  } 

  return (
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
            value={assetForm.binding_scope}
            onChange={(e) =>
              setAssetForm((prev) => ({
                ...prev,
                binding_scope: e.target.value,
              }))
            }
          >
            <option value="scene">このシーン専用</option>
            <option value="global">動画共通</option>
          </select>

          <select
            value={assetForm.asset_type}
            onChange={async (e) => {
              const nextType = e.target.value;
              setAssetForm((prev) => ({ ...prev, asset_type: nextType }));
              await loadCreditSourceOptions(nextType);
            }}
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
            placeholder={`クレジット表記
          例:
          BGM: DOVA-SYNDROME https://dova-s.jp/
          効果音: OtoLogic https://otologic.jp/
          音声: VOICEVOX ずんだもん https://voicevox.hiroshiba.jp/`}
            value={assetForm.source_note}
            onChange={(e) =>
              setAssetForm((prev) => ({ ...prev, source_note: e.target.value }))
            }
            rows={4}
          />

          <div className="asset-credit-source-panel">
            <div className="asset-credit-source-header">
              <strong>過去に使ったクレジット候補</strong>
            </div>

            {creditSourceOptions.length === 0 ? (
              <p className="asset-credit-source-empty">
                この種別ではまだ候補がありません
              </p>
            ) : (
              <div className="asset-credit-source-list">
                {creditSourceOptions.map((option) => (
                  <div
                    key={`${option.asset_id}-${option.asset_type}`}
                    className="asset-credit-source-item"
                  >
                    <button
                      type="button"
                      className="asset-credit-source-chip"
                      onClick={() => applyCreditSource(option.source_note)}
                    >
                      {option.asset_title}
                    </button>
                    <button
                      type="button"
                      className="asset-credit-source-delete"
                      onClick={() => handleDeleteCreditSource(option.source_note)}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        <>
          <h4>動画共通素材</h4>
          {renderAssetList(sharedAssets, "動画共通素材はまだありません")}
          <p>シーン保存後、このシーン専用素材も追加できます</p>
        </>
      ) : (
        <>
          <h4>このシーンの素材</h4>
          {renderAssetList(sceneAssets, "このシーンの素材はまだありません")}

          <h4 style={{ marginTop: "16px" }}>動画共通素材</h4>
          {renderAssetList(sharedAssets, "動画共通素材はまだありません")}
        </>
      )}

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
  );
}