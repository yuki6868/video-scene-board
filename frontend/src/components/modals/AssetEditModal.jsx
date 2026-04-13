import { useEffect, useState } from "react";
import { fetchCreditSources, deleteCreditSource } from "../../api/assetApi";

export default function AssetEditModal({
  isOpen,
  asset,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(null);
  const [creditSourceOptions, setCreditSourceOptions] = useState([]);

  useEffect(() => {
    if (asset) {
        setForm({
          title: asset.title || "",
          asset_type: asset.asset_type || "material",
          status: asset.status || "idea",
          location_type: asset.location_type || "none",
          path_or_url: asset.path_or_url || "",
          source_note: asset.source_note || "",
          memo: asset.memo || "",
          file: null,
          video_id: asset.video_id,
          scene_id: asset.scene_id,
        });
        loadCreditSourceOptions(asset.video_id, asset.asset_type || "material");
      }
    }, [asset]);

  if (!isOpen || !form) return null;

  async function loadCreditSourceOptions(videoId, assetType) {
    if (!videoId) {
      setCreditSourceOptions([]);
      return;
    }

    try {
      const data = await fetchCreditSources({
        videoId,
        assetType,
      });
      setCreditSourceOptions(data);
    } catch (err) {
      console.error(err);
      setCreditSourceOptions([]);
    }
  }

  async function handleDeleteCreditSource(sourceNote) {
    if (!form?.video_id) return;

    const ok = window.confirm("この過去クレジット候補を削除しますか？");
    if (!ok) return;

    try {
      await deleteCreditSource({
        videoId: form.video_id,
        assetType: form.asset_type,
        sourceNote,
      });

      if (form.source_note === sourceNote) {
        setForm((prev) => ({
          ...prev,
          source_note: "",
        }));
      }

      await loadCreditSourceOptions(form.video_id, form.asset_type);
    } catch (err) {
      console.error(err);
      alert("クレジット候補の削除に失敗しました");
    }
  }

  function handleChange(e) {
    const { name, value, files } = e.target;

    if (name === "file") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        file,
        path_or_url: file ? file.name : prev.path_or_url,
      }));
      return;
    }

    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "asset_type") {
        loadCreditSourceOptions(next.video_id, value);
      }

      return next;
    });
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content asset-edit-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>素材編集</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="asset-edit-form">
          <div className="asset-edit-grid">
            <div className="form-field">
              <label htmlFor="asset-title">タイトル</label>
              <input
                id="asset-title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="タイトル"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="asset-type">種別</label>
              <select
                id="asset-type"
                name="asset_type"
                value={form.asset_type}
                onChange={handleChange}
              >
                <option value="material">素材</option>
                <option value="audio">音声</option>
                <option value="background">背景</option>
                <option value="se">SE</option>
                <option value="bgm">BGM</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="asset-status">状態</label>
              <select
                id="asset-status"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="idea">未着手</option>
                <option value="searching">探し中</option>
                <option value="creating">作成中</option>
                <option value="ready">準備済み</option>
                <option value="missing">不足</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="asset-location-type">保存場所</label>
              <select
                id="asset-location-type"
                name="location_type"
                value={form.location_type}
                onChange={handleChange}
              >
                <option value="none">未作成</option>
                <option value="local">ファイル</option>
                <option value="url">URL</option>
              </select>
            </div>

            {form.location_type === "url" && (
              <div className="form-field form-field-full">
                <label htmlFor="asset-path">URL</label>
                <input
                  id="asset-path"
                  name="path_or_url"
                  value={form.path_or_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            )}

            {form.location_type === "local" && (
                <div className="form-field form-field-full">
                    <label htmlFor="asset-file">ファイル</label>
                    <input
                    id="asset-file"
                    name="file"
                    type="file"
                    onChange={handleChange}
                    />
                    {form.path_or_url && (
                    <small>現在のファイル: {form.path_or_url}</small>
                    )}
                </div>
            )}

            <div className="form-field form-field-full">
              <label htmlFor="asset-source-note">クレジット表記</label>
              <textarea
                id="asset-source-note"
                name="source_note"
                value={form.source_note}
                onChange={handleChange}
                placeholder={`例:
              BGM: DOVA-SYNDROME https://dova-s.jp/
              効果音: OtoLogic https://otologic.jp/
              音声: VOICEVOX ずんだもん https://voicevox.hiroshiba.jp/`}
                rows={4}
              />
            </div>

            <div className="form-field form-field-full">
              <label>過去に使ったクレジット候補</label>

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
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            source_note: option.source_note,
                          }))
                        }
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

            <div className="form-field form-field-full">
              <label htmlFor="asset-memo">メモ</label>
              <textarea
                id="asset-memo"
                name="memo"
                value={form.memo}
                onChange={handleChange}
                placeholder="補足メモ"
                rows={5}
              />
            </div>
          </div>

          <div className="asset-edit-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button type="button" className="submit-button" onClick={handleSubmit}>
                保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}