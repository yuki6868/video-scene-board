function VideoModal({
  isOpen,
  onClose,
  onSubmit,
  form,
  onChange,
  onThumbnailFileChange,
  editingVideoId,
}) {
  if (!isOpen) return null;

  const isUploadMode = (form.thumbnail_input_type || "upload") === "upload";

  return (
    <div className="modal-overlay">
      <div className="modal-content video-modal-content">
        <div className="modal-header">
          <h2>{editingVideoId !== null ? "動画を編集" : "動画を追加"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
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
              <select name="aspect_ratio" value={form.aspect_ratio} onChange={onChange}>
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

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="secondary-button">
              キャンセル
            </button>
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