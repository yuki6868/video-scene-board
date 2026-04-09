import SceneAssetSection from "../scene/SceneAssetSection";

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
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
  onAssetUpdated,
  tasks,
  handleUpdateTaskStatus,
  voiceForm,
  voiceLoading,
  voiceError,
  voiceAssets,
  voiceStyleOptions,
  onVoiceFormChange,
  onGenerateVoice,
  onSelectVoiceAsset,
}) {

  const sceneTasks = (tasks ?? []).filter(
    (task) => task.scene_id === editingSceneId
  );

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

        <div className="scene-form modal-form">
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

          <section className="voice-panel">
            <div className="voice-panel-header">
                <h3>音声生成</h3>
                {voiceLoading && <span className="voice-status">生成中...</span>}
            </div>

            {voiceError && <p className="voice-error">{voiceError}</p>}

            <div className="voice-form-grid">
                <label className="voice-form-field voice-form-field-full">
                <span>セリフ</span>
                <textarea
                    name="text"
                    value={voiceForm.text}
                    onChange={onVoiceFormChange}
                    rows={4}
                    placeholder="読み上げるセリフを入力"
                />
                </label>

                <label className="voice-form-field">
                <span>話者</span>
                <select
                    name="style_id"
                    value={voiceForm.style_id}
                    onChange={onVoiceFormChange}
                >
                    {voiceStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                    ))}
                </select>
                </label>

                <label className="voice-form-field">
                <span>speed</span>
                <input
                    type="number"
                    step="0.1"
                    name="speed"
                    value={voiceForm.speed}
                    onChange={onVoiceFormChange}
                />
                </label>

                <label className="voice-form-field">
                <span>pitch</span>
                <input
                    type="number"
                    step="0.1"
                    name="pitch"
                    value={voiceForm.pitch}
                    onChange={onVoiceFormChange}
                />
                </label>

                <label className="voice-form-field">
                <span>intonation</span>
                <input
                    type="number"
                    step="0.1"
                    name="intonation"
                    value={voiceForm.intonation}
                    onChange={onVoiceFormChange}
                />
                </label>

                <label className="voice-form-field">
                <span>volume</span>
                <input
                    type="number"
                    step="0.1"
                    name="volume"
                    value={voiceForm.volume}
                    onChange={onVoiceFormChange}
                />
                </label>
            </div>

            <div className="voice-actions">
                <button
                type="button"
                className="primary-button"
                onClick={onGenerateVoice}
                disabled={voiceLoading}
                >
                音声を生成
                </button>
            </div>

            <div className="voice-history">
                <h4>生成済み音声</h4>

                {voiceAssets.length === 0 ? (
                <p className="voice-empty">まだ生成された音声はありません</p>
                ) : (
                <div className="voice-history-list">
                    {voiceAssets.map((asset) => (
                    <article
                        key={asset.id}
                        className={`voice-history-card ${asset.is_selected ? "selected" : ""}`}
                    >
                        <div className="voice-history-card-header">
                        <div>
                            <strong>
                            {asset.character_name} / {asset.style_name}
                            </strong>
                            <p className="voice-history-meta">
                            speed:{asset.speed} / pitch:{asset.pitch} / intonation:{asset.intonation} / volume:{asset.volume}
                            </p>
                        </div>

                        {asset.is_selected && (
                            <span className="voice-selected-badge">採用中</span>
                        )}
                        </div>

                        <p className="voice-history-text">{asset.text}</p>

                        {asset.audio_path && (
                            <audio
                                controls
                                src={buildFileUrl(asset.audio_path)}
                                style={{ width: "100%", marginTop: "8px" }}
                            >
                                お使いのブラウザはaudioタグをサポートしていません。
                            </audio>
                        )}

                        {asset.subtitle_png_path && (
                            <div className="scene-image-preview">
                              <p className="scene-image-preview-label">字幕画像プレビュー</p>
                              <img
                                src={buildFileUrl(asset.subtitle_png_path)}
                                alt="字幕画像プレビュー"
                                className="scene-preview-image"
                              />
                            </div>
                        )}
                        {form.audio_path && (
                            <div className="scene-audio-preview">
                            <p className="scene-image-preview-label">音声プレビュー</p>
                            <audio controls src={buildFileUrl(form.audio_path)} style={{ width: "100%" }}>
                                お使いのブラウザはaudioタグをサポートしていません。
                            </audio>
                            </div>
                        )}

                        <div className="voice-history-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => onSelectVoiceAsset(asset.id)}
                        >
                            採用する
                        </button>
                        </div>
                    </article>
                    ))}
                </div>
                )}
            </div>
            </section>

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
          {form.background_path && (
            <div className="scene-image-preview">
              <p className="scene-image-preview-label">背景プレビュー</p>
              <img
                src={buildFileUrl(form.background_path)}
                alt="背景プレビュー"
                className="scene-preview-image"
              />
            </div>
          )}

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

          <SceneAssetSection
            editingSceneId={editingSceneId}
            videoId={videoId}
            loadTasks={loadTasks}
            onAssetUpdated={onAssetUpdated}
          />

          <div className="form-actions">
            <button type="button" className="submit-button" onClick={onSubmit}>
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
        </div>
      </div>
    </div>
  );
}