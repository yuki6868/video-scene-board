import { useState } from "react";

function VideoModal({
  isOpen,
  onClose,
  onSubmit,
  onGenerateScenesFromScript,
  form,
  onChange,
  onThumbnailFileChange,
  editingVideoId,
  splitVideoScriptToSceneSeeds,
  inferSectionTypeFromTitle,
}) {
  const [showSceneGenerateActions, setShowSceneGenerateActions] = useState(false);
  const [previewScenes, setPreviewScenes] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  if (!isOpen) return null;

  const isUploadMode = (form.thumbnail_input_type || "upload") === "upload";

  const handleClickGenerate = () => {
    setShowSceneGenerateActions((prev) => !prev);
  };

  const handleSelectGenerateMode = (mode) => {
    setShowSceneGenerateActions(false);
    onGenerateScenesFromScript?.(mode);
  };

  const handlePreview = () => {
    if (!form.script && !form.structure) {
      alert("台本または構成を入力してください");
      return;
    }

    const seeds = splitVideoScriptToSceneSeeds(form);

    const enriched = seeds.map((seed, i) => ({
      ...seed,
      section_type: inferSectionTypeFromTitle(
        seed.title,
        i,
        seeds.length
      ),
    }));

    setPreviewScenes(enriched);
    setShowPreview(true);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content video-modal-content">
        <div className="modal-header">
          <h2>{editingVideoId !== null ? "動画を編集" : "動画を追加"}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              setShowSceneGenerateActions(false);
              onClose();
            }}
          >
            ×
          </button>
        </div>

        <div className="video-modal-form">
          <div className="video-modal-grid">
            <div className="form-group video-modal-full">
              <label>タイトル *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="動画タイトルを入力"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>サムネイル入力方式</label>
              <select
                name="thumbnail_input_type"
                value={form.thumbnail_input_type || "upload"}
                onChange={onChange}
              >
                <option value="upload">アップロード</option>
                <option value="url">URL指定</option>
              </select>
            </div>

            {isUploadMode ? (
              <div className="form-group video-modal-full">
                <label>サムネイル画像アップロード</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onThumbnailFileChange}
                />
                {form.thumbnail_url ? (
                  <p className="video-uploaded-path">
                    保存先: {form.thumbnail_url}
                  </p>
                ) : (
                  <p className="video-uploaded-path">
                    まだアップロードされていません
                  </p>
                )}
              </div>
            ) : (
              <div className="form-group video-modal-full">
                <label>サムネイルURL</label>
                <input
                  type="text"
                  name="thumbnail_url"
                  value={form.thumbnail_url}
                  onChange={onChange}
                  placeholder="https://... または uploads/..."
                />
              </div>
            )}

            <div className="form-group">
              <label>タグ</label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={onChange}
                placeholder="例: 法律, 雑学, エンタメ"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>説明文</label>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="動画の説明文を入力"
                rows="5"
              />
            </div>

            <div className="form-group">
              <label>動画ファイルパス</label>
              <input
                type="text"
                name="video_path"
                value={form.video_path}
                onChange={onChange}
                placeholder="/Users/xxx/movie.mp4"
              />
            </div>

            <div className="form-group">
              <label>YouTube URL</label>
              <input
                type="text"
                name="youtube_url"
                value={form.youtube_url}
                onChange={onChange}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="form-group">
              <label>YouTube ID</label>
              <input
                type="text"
                name="youtube_id"
                value={form.youtube_id}
                onChange={onChange}
                placeholder="abcd1234xyz"
              />
            </div>

            <div className="form-group">
              <label>分析データ取得元</label>
              <select
                name="analytics_source"
                value={form.analytics_source || "mock"}
                onChange={onChange}
              >
                <option value="mock">ダミーデータ</option>
                <option value="api">実API</option>
              </select>
            </div>

            <div className="form-group">
              <label>投稿日</label>
              <input
                type="datetime-local"
                name="published_at"
                value={form.published_at}
                onChange={onChange}
              />
            </div>

            <div className="form-group">
              <label>コンセプト</label>
              <input
                type="text"
                name="concept"
                value={form.concept}
                onChange={onChange}
                placeholder="動画のコンセプト"
              />
            </div>

            <div className="form-group">
              <label>ターゲット</label>
              <input
                type="text"
                name="target"
                value={form.target}
                onChange={onChange}
                placeholder="想定視聴者"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>ゴール</label>
              <input
                type="text"
                name="goal"
                value={form.goal}
                onChange={onChange}
                placeholder="この動画の目的"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>構成</label>
              <textarea
                name="structure"
                value={form.structure || ""}
                onChange={onChange}
                placeholder={"例:\n導入\n\n本題\n\nオチ"}
                rows="5"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>台本</label>
              <textarea
                name="script"
                value={form.script || ""}
                onChange={onChange}
                placeholder={
                  "空行ごとに1シーンになります。\n\n例:\n導入｜今日はクーリングオフの話です\nまず結論から言います\n\n本題｜全部の契約で使えるわけではありません\n訪問販売などが対象です\n\nオチ｜迷ったら契約書面を確認しましょう"
                }
                rows="10"
              />
            </div>

            <div className="form-group video-modal-full">
              <label>メモ</label>
              <textarea
                name="memo"
                value={form.memo || ""}
                onChange={onChange}
                placeholder="改善点、投稿案、注意点など"
                rows="5"
              />
            </div>

            <div className="form-group">
              <label>ステータス</label>
              <select name="status" value={form.status} onChange={onChange}>
                <option value="draft">draft</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
            </div>

            <div className="form-group">
              <label>画面比率</label>
              <select
                name="aspect_ratio"
                value={form.aspect_ratio}
                onChange={onChange}
              >
                <option value="9:16">9:16（ショート動画）</option>
                <option value="16:9">16:9（通常動画）</option>
              </select>
            </div>

            <div className="form-group">
              <label>横幅</label>
              <input
                type="number"
                name="frame_width"
                value={form.frame_width}
                onChange={onChange}
                placeholder="1080"
              />
            </div>

            <div className="form-group">
              <label>縦幅</label>
              <input
                type="number"
                name="frame_height"
                value={form.frame_height}
                onChange={onChange}
                placeholder="1920"
              />
            </div>
          </div>

          {editingVideoId !== null && showSceneGenerateActions ? (
            <div className="video-scene-generate-actions">
              <p className="video-scene-generate-title">
                台本からシーン生成の方法を選んでください
              </p>
              <div className="video-scene-generate-buttons">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleSelectGenerateMode("append")}
                >
                  追加
                </button>
                <button
                  type="button"
                  className="submit-button"
                  onClick={() => handleSelectGenerateMode("replace")}
                >
                  作り直し
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleSelectGenerateMode("cancel")}
                >
                  中止
                </button>
              </div>
            </div>
          ) : null}

          {showPreview && (
            <div className="scene-preview">
              <h3>生成プレビュー</h3>

              {previewScenes.map((scene, index) => (
                <div key={index} className="scene-preview-item">
                  <div className="scene-preview-header">
                    <strong>{scene.title}</strong>
                    <span className="scene-preview-type">
                      {scene.section_type}
                    </span>
                  </div>

                  <pre className="scene-preview-script">
                    {scene.script}
                  </pre>
                </div>
              ))}

              <div className="scene-preview-actions">
                <button
                  type="button"
                  onClick={() => onGenerateScenesFromScript("append")}
                  className="secondary-button"
                >
                  追加
                </button>

                <button
                  type="button"
                  onClick={() => onGenerateScenesFromScript("replace")}
                  className="submit-button"
                >
                  作り直し
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="secondary-button"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="secondary-button">
              キャンセル
            </button>

            {editingVideoId !== null ? (
              <button
                type="button"
                onClick={handlePreview}
                className="secondary-button"
              >
                台本分割プレビュー
              </button>
            ) : null}

            <button type="button" onClick={onSubmit} className="submit-button">
              {editingVideoId !== null ? "更新" : "作成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoModal;