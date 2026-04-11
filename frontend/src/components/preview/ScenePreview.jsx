import "./ScenePreview.css";

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
}

function getFitModeLabel(mode) {
  switch (mode) {
    case "blur":
      return "blur";
    case "cover":
      return "cover";
    default:
      return "未設定";
  }
}

export default function ScenePreview({ scene, video }) {
  const width = video?.frame_width || 1080;
  const height = video?.frame_height || 1920;

  const backgroundUrl = buildFileUrl(scene?.background_path);
  const fitMode = scene?.background_fit_mode || "cover";
  const hasBackground = Boolean(backgroundUrl);
  const hasTelop = Boolean(scene?.telop?.trim());
  const previewTitle = scene?.title?.trim() || "無題シーン";

  const bgStyle = (() => {
    if (!backgroundUrl) return {};

    if (fitMode === "blur") {
      return {
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        filter: "blur(20px)",
        transform: "scale(1.2)",
      };
    }

    return {
      backgroundImage: `url(${backgroundUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  })();

  return (
    <section className="scene-preview-panel">
      <div className="scene-preview-panel-header">
        <div>
          <p className="scene-preview-eyebrow">ショート動画プレビュー</p>
          <h3 className="scene-preview-title">{previewTitle}</h3>
        </div>

        <div className="scene-preview-meta">
          <span className="scene-preview-chip">
            {width} × {height}
          </span>
          <span className="scene-preview-chip">
            背景: {hasBackground ? getFitModeLabel(fitMode) : "なし"}
          </span>
          <span className={`scene-preview-chip ${hasTelop ? "is-active" : ""}`}>
            テロップ: {hasTelop ? "あり" : "なし"}
          </span>
        </div>
      </div>

      <div className="preview-container">
        <div
          className={`preview-frame ${hasBackground ? "" : "is-empty"}`}
          style={{
            aspectRatio: `${width} / ${height}`,
          }}
        >
          <div className="preview-bg" style={bgStyle} />

          {fitMode === "blur" && hasBackground && (
            <img
              src={backgroundUrl}
              alt="背景プレビュー"
              className="preview-center-image"
            />
          )}

          {!hasBackground && (
            <div className="preview-empty-state">
              <div className="preview-empty-icon">🖼️</div>
              <p className="preview-empty-title">背景が未設定です</p>
              <p className="preview-empty-text">
                背景パスを入れると、ここに縦長プレビューが表示されます
              </p>
            </div>
          )}

          {hasTelop && (
            <div className="preview-telop">
              {scene.telop}
            </div>
          )}

          <div className="safe-area top">
            <span className="safe-area-label">上部安全領域</span>
          </div>
          <div className="safe-area bottom">
            <span className="safe-area-label">下部安全領域</span>
          </div>

          <div className="preview-corner-badge">
            {fitMode === "blur" ? "BLUR" : "COVER"}
          </div>
        </div>
      </div>

      <div className="scene-preview-help">
        <p>
          確認ポイント: 顔や重要な要素が切れていないか、テロップが下すぎないかをここで確認
        </p>
      </div>
    </section>
  );
}