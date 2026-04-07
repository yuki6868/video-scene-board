import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  fetchScenes,
  createScene,
  updateScene,
  deleteScene,
  reorderScenes,
  duplicateScene,
} from "./api/sceneApi";
import {
  fetchVideos,
  createVideo,
  updateVideo,
  deleteVideo,
  duplicateVideo,
} from "./api/videoApi";

const initialSceneForm = {
  title: "",
  script: "",
  materials: "",
};

const initialVideoForm = {
  title: "",
  description: "",
  status: "draft",
};

function truncateText(text, maxLength = 80) {
  if (!text) return "未設定";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getStatusLabel(status) {
  switch (status) {
    case "draft":
      return "下書き";
    case "in_progress":
      return "制作中";
    case "done":
      return "完了";
    default:
      return status;
  }
}

function getStatusClassName(status) {
  switch (status) {
    case "draft":
      return "status-badge status-draft";
    case "in_progress":
      return "status-badge status-in-progress";
    case "done":
      return "status-badge status-done";
    default:
      return "status-badge";
  }
}

function formatDateTime(value) {
  if (!value) return "未設定";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未設定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SortableItem({ scene, onOpenDetail, onDelete, onDuplicate, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: scene.id,
      disabled: dragDisabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article ref={setNodeRef} style={style} className="scene-card">
      <div className="scene-card-header">
        <button
          type="button"
          className={`drag-handle ${dragDisabled ? "is-disabled" : ""}`}
          {...attributes}
          {...listeners}
          disabled={dragDisabled}
          title={dragDisabled ? "検索中は並び替えできません" : "ドラッグで並び替え"}
        >
          ⠿
        </button>
        <span className="scene-meta">Scene #{scene.position + 1}</span>
      </div>

      <div
        className="scene-card-body"
        onClick={() => onOpenDetail(scene)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpenDetail(scene);
        }}
      >
        <h3>{scene.title}</h3>

        <div className="scene-section">
          <strong>台本</strong>
          <p>{truncateText(scene.script, 100)}</p>
        </div>

        <div className="scene-section">
          <strong>素材</strong>
          <p>{truncateText(scene.materials, 60)}</p>
        </div>
      </div>

      <div className="scene-updated-at">
        更新: {formatDateTime(scene.updated_at)}
      </div>

      <div className="card-actions">
        <button type="button" onClick={() => onOpenDetail(scene)}>
          詳細
        </button>
        <button
          type="button"
          className="duplicate-button"
          onClick={() => onDuplicate(scene.id)}
        >
          複製
        </button>
        <button
          type="button"
          className="delete-button"
          onClick={() => onDelete(scene.id)}
        >
          削除
        </button>
      </div>
    </article>
  );
}

function SceneModal({
  isOpen,
  form,
  editingSceneId,
  onChange,
  onSubmit,
  onClose,
}) {
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

          <div className="form-actions">
            <button type="submit">{editingSceneId ? "更新" : "追加"}</button>
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VideoModal({ isOpen, form, editingVideoId, onChange, onSubmit, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingVideoId ? "動画編集" : "動画追加"}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="scene-form modal-form" onSubmit={onSubmit}>
          <input
            name="title"
            placeholder="動画タイトル"
            value={form.title}
            onChange={onChange}
            required
          />

          <textarea
            name="description"
            placeholder="動画の説明"
            value={form.description}
            onChange={onChange}
            rows={5}
          />

          <select name="status" value={form.status} onChange={onChange}>
            <option value="draft">draft</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>

          <div className="form-actions">
            <button type="submit">{editingVideoId ? "更新" : "追加"}</button>
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
            >
              閉じる
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const [scenes, setScenes] = useState([]);
  const [sceneForm, setSceneForm] = useState(initialSceneForm);
  const [videoForm, setVideoForm] = useState(initialVideoForm);

  const [editingSceneId, setEditingSceneId] = useState(null);
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [searchText, setSearchText] = useState("");

  const isSearching = searchText.trim() !== "";

  const selectedVideo = useMemo(() => {
    return videos.find((video) => video.id === selectedVideoId) ?? null;
  }, [videos, selectedVideoId]);

  const [editingVideoId, setEditingVideoId] = useState(null);

  const loadVideos = async () => {
    try {
      const data = await fetchVideos();
      setVideos(data);

      if (data.length === 0) {
        setSelectedVideoId(null);
        setScenes([]);
        return;
      }

      setSelectedVideoId((prev) => {
        const exists = data.some((video) => video.id === prev);
        return exists ? prev : data[0].id;
      });
    } catch (error) {
      console.error(error);
      alert(error.message || "動画一覧の取得に失敗しました");
    }
  };

  const loadScenes = async (videoId) => {
    if (!videoId) {
      setScenes([]);
      return;
    }

    try {
      const data = await fetchScenes(videoId);
      setScenes(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン一覧の取得に失敗しました");
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  useEffect(() => {
    if (selectedVideoId) {
      loadScenes(selectedVideoId);
    } else {
      setScenes([]);
    }
  }, [selectedVideoId]);

  const filteredScenes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) return scenes;

    return scenes.filter((scene) => {
      return (
        (scene.title || "").toLowerCase().includes(keyword) ||
        (scene.script || "").toLowerCase().includes(keyword) ||
        (scene.materials || "").toLowerCase().includes(keyword)
      );
    });
  }, [scenes, searchText]);

  const resetSceneForm = () => {
    setSceneForm(initialSceneForm);
    setEditingSceneId(null);
  };

  const resetVideoForm = () => {
    setVideoForm(initialVideoForm);
  };

  const closeSceneModal = () => {
    setIsSceneModalOpen(false);
    resetSceneForm();
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setEditingVideoId(null);
    resetVideoForm();
  };

  const openCreateSceneModal = () => {
    if (!selectedVideoId) {
      alert("先に動画を作成してください");
      return;
    }

    resetSceneForm();
    setIsSceneModalOpen(true);
  };

  const openEditVideoModal = () => {
    if (!selectedVideo) return;

    setVideoForm({
      title: selectedVideo.title,
      description: selectedVideo.description || "",
      status: selectedVideo.status,
    });

    setEditingVideoId(selectedVideo.id);
    setIsVideoModalOpen(true);
  };

  const openDetailModal = (scene) => {
    setSceneForm({
      title: scene.title || "",
      script: scene.script || "",
      materials: scene.materials || "",
    });
    setEditingSceneId(scene.id);
    setIsSceneModalOpen(true);
  };

  const handleSceneChange = (e) => {
    const { name, value } = e.target;
    setSceneForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleVideoChange = (e) => {
    const { name, value } = e.target;
    setVideoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDragEnd = async (event) => {
    if (isSearching || !selectedVideoId) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = scenes.findIndex((s) => s.id === active.id);
    const newIndex = scenes.findIndex((s) => s.id === over.id);

    const newScenes = arrayMove(scenes, oldIndex, newIndex);
    const updated = newScenes.map((scene, index) => ({
      ...scene,
      position: index,
    }));

    setScenes(updated);

    try {
      await reorderScenes(
        selectedVideoId,
        updated.map((scene) => ({
          id: scene.id,
          position: scene.position,
        }))
      );
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン並び替えに失敗しました");
      loadScenes(selectedVideoId);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("このシーンを削除しますか？");
    if (!ok) return;

    try {
      await deleteScene(id);

      if (editingSceneId === id) {
        closeSceneModal();
      }

      await loadScenes(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン削除に失敗しました");
    }
  };

  const handleDuplicate = async (sceneId) => {
    try {
      await duplicateScene(sceneId);
      await loadScenes(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン複製に失敗しました");
    }
  };

  const handleSceneSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVideoId) {
      alert("先に動画を選択してください");
      return;
    }

    try {
      if (editingSceneId === null) {
        await createScene(selectedVideoId, {
          ...sceneForm,
          position: scenes.length,
        });
      } else {
        const target = scenes.find((s) => s.id === editingSceneId);

        await updateScene(editingSceneId, {
          ...sceneForm,
          position: target.position,
        });
      }

      closeSceneModal();
      await loadScenes(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "保存に失敗しました");
    }
  };

  const handleVideoSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingVideoId === null) {
        const created = await createVideo(videoForm);
        await loadVideos();
        setSelectedVideoId(created.id);
      } else {
        await updateVideo(editingVideoId, videoForm);
        await loadVideos();
      }

      closeVideoModal();
    } catch (error) {
      console.error(error);
      alert(error.message || "動画保存に失敗しました");
    }
  };

  const handleDuplicateVideo = async () => {
    if (!selectedVideoId) return;

    try {
      const duplicated = await duplicateVideo(selectedVideoId);
      await loadVideos();
      setSelectedVideoId(duplicated.id);
    } catch (error) {
      console.error(error);
      alert(error.message || "動画複製に失敗しました");
    }
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideoId) return;

    const deletingId = selectedVideoId;
    const ok = window.confirm("この動画を削除しますか？（シーンも全部消えます）");
    if (!ok) return;

    try {
      await deleteVideo(deletingId);

      const nextVideos = videos.filter((v) => v.id !== deletingId);
      await loadVideos();

      setSelectedVideoId(nextVideos.length > 0 ? nextVideos[0].id : null);
    } catch (error) {
      console.error(error);
      alert(error.message || "動画削除に失敗しました");
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Video Scene Board</h1>
          <p>複数動画を、シーンごとのカードで管理する</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setIsVideoModalOpen(true)}
          >
            ＋ 動画追加
          </button>
          <button
            type="button"
            className="add-scene-button"
            onClick={openCreateSceneModal}
          >
            ＋ シーン追加
          </button>
        </div>
      </header>

      <main className="scene-board">
        <section className="video-toolbar">
          <div className="video-selector">
            <label htmlFor="video-select">動画選択</label>
            <select
              id="video-select"
              value={selectedVideoId ?? ""}
              onChange={(e) => setSelectedVideoId(Number(e.target.value))}
            >
              {videos.length === 0 ? (
                <option value="">動画がありません</option>
              ) : (
                videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}（{getStatusLabel(video.status)}）
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedVideo && (
            <div className="selected-video-summary">
              <div className="selected-video-top">
                <strong>{selectedVideo.title}</strong>
                <span className={getStatusClassName(selectedVideo.status)}>
                  {getStatusLabel(selectedVideo.status)}
                </span>
              </div>

              <span>{selectedVideo.description || "説明なし"}</span>

              <div className="video-datetime-list">
                <span>作成: {formatDateTime(selectedVideo.created_at)}</span>
                <span>更新: {formatDateTime(selectedVideo.updated_at)}</span>
              </div>
            </div>
          )}

          {selectedVideo && (
            <div className="video-actions">
              <button onClick={openEditVideoModal}>
                編集
              </button>
              <button type="button" className="duplicate-button" onClick={handleDuplicateVideo}>
                複製
              </button>
              <button className="delete-button" onClick={handleDeleteVideo}>
                削除
              </button>
            </div>
          )}
        </section>

        <div className="scene-toolbar">
          <input
            type="text"
            className="scene-search"
            placeholder="タイトル・台本・素材で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            disabled={!selectedVideoId}
          />
          <span className="scene-count">
            {filteredScenes.length}件 / 全{scenes.length}件
          </span>
        </div>

        {isSearching && (
          <p className="search-notice">
            検索中は並び替えできません。並び替えるときは検索をクリアしてください。
          </p>
        )}

        {!selectedVideoId ? (
          <div className="empty-state">
            <p>まずは動画を1本作成してください。</p>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredScenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="scene-list">
                {filteredScenes.map((scene) => (
                  <SortableItem
                    key={scene.id}
                    scene={scene}
                    onOpenDetail={openDetailModal}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    dragDisabled={isSearching}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      <SceneModal
        isOpen={isSceneModalOpen}
        form={sceneForm}
        editingSceneId={editingSceneId}
        onChange={handleSceneChange}
        onSubmit={handleSceneSubmit}
        onClose={closeSceneModal}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        form={videoForm}
        editingVideoId={editingVideoId}
        onChange={handleVideoChange}
        onSubmit={handleVideoSubmit}
        onClose={closeVideoModal}
      />
    </div>
  );
}

export default App;