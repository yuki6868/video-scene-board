import "./ScenePreview.css";

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
}

export default function ScenePreview({ scene, video }) {
  const width = video?.frame_width || 1080;
  const height = video?.frame_height || 1920;

  const backgroundUrl = buildFileUrl(scene?.background_path);

  const bgStyle = (() => {
    if (!backgroundUrl) return {};

    if (scene?.background_fit_mode === "blur") {
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
    <div className="preview-container">
      <div
        className="preview-frame"
        style={{
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="preview-bg" style={bgStyle} />

        {scene?.background_fit_mode === "blur" && backgroundUrl && (
          <img
            src={backgroundUrl}
            alt="背景プレビュー"
            className="preview-center-image"
          />
        )}

        {scene?.telop && (
          <div className="preview-telop">
            {scene.telop}
          </div>
        )}

        <div className="safe-area top" />
        <div className="safe-area bottom" />
      </div>
    </div>
  );
}