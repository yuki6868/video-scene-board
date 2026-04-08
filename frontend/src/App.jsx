import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { DndContext, useDraggable, useDroppable, closestCenter, DragOverlay} from "@dnd-kit/core";
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
import { fetchTasks, createTask, updateTask, deleteTask } from "./api/taskApi";
import { 
  fetchAssets, 
  createAsset,
  updateAsset,
  deleteAsset,
} from "./api/assetApi";


const initialSceneForm = {
  title: "",
  script: "",
  materials: "",
  position: 0,

  section_type: "",
  status: "未着手",
  duration_seconds: "",

  audio_path: "",
  character_name: "",
  character_expression: "",
  background_path: "",
  se_path: "",

  telop: "",
  direction: "",
  edit_note: "",
};

const initialVideoForm = {
  title: "",
  description: "",
  concept: "",
  target: "",
  goal: "",
  status: "draft",
};

const initialAssetForm = {
  title: "",
  asset_type: "material",
  status: "idea",
  location_type: "none",
  path_or_url: "",
  memo: "",
  file: null,
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

function TaskDroppableColumn({ status, count, children }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `task-column-${status}`,
    data: {
      type: "task-column",
      status,
    },
  });

  return (
    <section
      ref={setNodeRef}
      className={`task-column ${isOver ? "task-column-over" : ""}`}
    >
      <div className="task-column-header">
        <h3>{status}</h3>
        <span className="task-column-count">{count}件</span>
      </div>

      <div className="task-column-body">
        {children}
      </div>
    </section>
  );
}

function DraggableTaskCard({ task, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `task-${task.id}`,
    data: {
      type: "task",
      task,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`task-draggable ${isDragging ? "is-dragging" : ""}`}
      style={{
        width: "100%",
        opacity: isDragging ? 0 : 1,
      }}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
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

function getPriorityClassName(priority) {
  switch (priority) {
    case "高":
      return "task-badge task-priority-high";
    case "中":
      return "task-badge task-priority-medium";
    case "低":
      return "task-badge task-priority-low";
    default:
      return "task-badge";
  }
}

function getPriorityOrder(priority) {
  switch (priority) {
    case "高":
      return 0;
    case "中":
      return 1;
    case "低":
      return 2;
    default:
      return 3;
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

function getSceneStatusClassName(status) {
  switch (status) {
    case "未着手":
      return "scene-status-badge scene-status-todo";
    case "作業中":
      return "scene-status-badge scene-status-doing";
    case "完了":
      return "scene-status-badge scene-status-done";
    default:
      return "scene-status-badge";
  }
}

function formatDateTime(value) {
  if (!value) return "未設定";

  const normalizedValue =
    typeof value === "string" && !value.endsWith("Z") && !value.includes("+")
      ? `${value}Z`
      : value;

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return "未設定";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
        <div className="scene-title-row">
          <h3>{scene.title}</h3>
          <span className={getSceneStatusClassName(scene.status)}>
            {scene.status || "未設定"}
          </span>
        </div>

        <div className="scene-info-list">
          <div className="scene-info-item">
            <span className="scene-info-label">セクション</span>
            <span className="scene-info-value">{scene.section_type || "未設定"}</span>
          </div>

          <div className="scene-info-item">
            <span className="scene-info-label">秒数</span>
            <span className="scene-info-value">
              {scene.duration_seconds != null ? `${scene.duration_seconds}秒` : "未設定"}
            </span>
          </div>

          <div className="scene-info-item">
            <span className="scene-info-label">キャラ</span>
            <span className="scene-info-value">
              {scene.character_name
                ? scene.character_expression
                  ? `${scene.character_name}（${scene.character_expression}）`
                  : scene.character_name
                : "未設定"}
            </span>
          </div>
        </div>

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
        <button type="button" className="submit-button" onClick={() => onOpenDetail(scene)}>
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
  videoId,
  editingSceneId,
  onChange,
  onSubmit,
  onClose,
}) {
  const [assets, setAssets] = useState([]);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [editingAssetId, setEditingAssetId] = useState(null);

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
      alert(editingAssetId === null ? "素材の作成に失敗しました" : "素材の更新に失敗しました");
    }
  }

  function handleAssetEditStart(asset) {
    setEditingAssetId(asset.id);
    setAssetForm({
      title: asset.title || "",
      asset_type: asset.asset_type || "material",
      status: asset.status || "idea",
      location_type: asset.location_type || "none",
      path_or_url: asset.path_or_url || "",
      memo: asset.memo || "",
    });
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

          <select
            name="status"
            value={form.status}
            onChange={onChange}
          >
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
            ) : assets.length === 0 ? (
              <p>素材はまだありません</p>
            ) : (
              <ul className="asset-list">
                {assets.map((asset) => (
                  <li key={asset.id} className="asset-item">
                    <div><strong>{asset.title}</strong></div>
                    <div className={`asset-type type-${asset.asset_type}`}>
                      種別: {getAssetTypeLabel(asset.asset_type)}
                    </div>
                    console.log(asset.asset_type);
                    <div className={`asset-status status-${asset.status}`}>
                      状態: {getAssetStatusLabel(asset.status)}
                    </div>
                    {asset.path_or_url && <div>パス: {asset.path_or_url}</div>}
                    {asset.memo && <div>メモ: {asset.memo}</div>}

                    <div className="asset-item-actions">
                      <button
                        type="button"
                        className="submit-button"
                        onClick={() => handleAssetEditStart(asset)}
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

          <input
            name="concept"
            placeholder="コンセプト"
            value={form.concept || ""}
            onChange={onChange}
          />

          <input
            name="target"
            placeholder="ターゲット"
            value={form.target || ""}
            onChange={onChange}
          />

          <input
            name="goal"
            placeholder="狙い"
            value={form.goal || ""}
            onChange={onChange}
          />

          <select name="status" value={form.status} onChange={onChange}>
            <option value="draft">draft</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>

          <div className="form-actions">
            <button type="submit" className="submit-button">{editingVideoId ? "更新" : "追加"}</button>
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

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");

  const [editingSceneId, setEditingSceneId] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [isSceneModalOpen, setIsSceneModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const [searchText, setSearchText] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [activeTask, setActiveTask] = useState(null);

  const [newTask, setNewTask] = useState({
    title: "",
    detail: "",
    task_type: "加工",
    priority: "中",
    status: "未着手",
    scene_id: null,
  });

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
        setTasks([]);
        setTasksError("");
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

  function handleStartEdit(task) {
    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title,
      detail: task.detail || "",
      priority: task.priority,
      task_type: task.task_type,
      scene_id: task.scene_id,
    });
  }

  function handleCancelEdit() {
    setEditingTaskId(null);
    setEditingTask(null);
  }

  async function handleSaveEdit(taskId) {
    try {
      await updateTask(taskId, editingTask);
      setEditingTaskId(null);
      setEditingTask(null);
      await loadTasks(selectedVideoId);
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  }

  async function loadTasks(videoId) {
    setTasksLoading(true);
    setTasksError("");

    try {
      const data = await fetchTasks({ videoId });
      setTasks(data);
    } catch (error) {
      console.error(error);
      setTasksError("TODO一覧の取得に失敗しました。");
    } finally {
      setTasksLoading(false);
    }
  }

  async function handleTaskDragEnd(event) {
    const { active, over } = event;
    console.log("drag end", { active, over });

    if (!active || !over) return;

    const activeTask = active.data.current?.task;
    const overStatus = over.data.current?.status;

    console.log("activeTask", activeTask);
    console.log("overStatus", overStatus);

    if (!activeTask || !overStatus) return;
    if (activeTask.status === overStatus) return;

    try {
      await updateTask(activeTask.id, { status: overStatus });
      await loadTasks(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert("ステータス更新に失敗しました");
    }
  }

  const loadScenes = async (videoId) => {
    if (!videoId) {
      setScenes([]);
      setTasks([]);
      setTasksError("");
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
      loadTasks(selectedVideoId);
    } else {
      setScenes([]);
      setTasks([]);
      setTasksError("");
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

  const sortTasksByPriority = (taskList) => {
    return [...taskList].sort((a, b) => {
      const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
      if (priorityDiff !== 0) return priorityDiff;

      return b.id - a.id;
    });
  };

  const taskColumns = useMemo(() => {
    return {
      未着手: sortTasksByPriority(tasks.filter((task) => task.status === "未着手")),
      作業中: sortTasksByPriority(tasks.filter((task) => task.status === "作業中")),
      完了: sortTasksByPriority(tasks.filter((task) => task.status === "完了")),
    };
  }, [tasks]);

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
      concept: selectedVideo.concept || "",
      target: selectedVideo.target || "",
      goal: selectedVideo.goal || "",
      status: selectedVideo.status,
    });

    setEditingVideoId(selectedVideo.id);
    setIsVideoModalOpen(true);
  };

  const openDetailModal = (scene) => {
    setSelectedScene(scene);

    setSceneForm({
      ...scene,
      title: scene.title || "",
      script: scene.script || "",
      materials: scene.materials || "",
      duration_seconds: scene.duration_seconds ?? "",
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

  function getTaskPriorityCardClass(priority) {
    switch (priority) {
      case "高":
        return "task-card-priority-high";
      case "中":
        return "task-card-priority-medium";
      case "低":
        return "task-card-priority-low";
      default:
        return "";
    }
  }

  async function handleDeleteTask(taskId) {
    if (!selectedVideo) return;

    const ok = confirm("本当に削除しますか？");
    if (!ok) return;

    try {
      await deleteTask(taskId);
      await loadTasks(selectedVideo.id);
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    }
  }

  async function handleCreateTask() {
    if (!selectedVideo) return;

    if (!newTask.title.trim()) {
      alert("タイトルは必須です");
      return;
    }

    try {
      await createTask({
        ...newTask,
        video_id: selectedVideo.id,
      });

      // リセット
      setNewTask({
        title: "",
        detail: "",
        task_type: "加工",
        priority: "中",
        status: "未着手",
        scene_id: null,
      });

      // 再取得
      await loadTasks(selectedVideo.id);
    } catch (e) {
      console.error(e);
      alert("作成失敗");
    }
  }

  async function handleUpdateTaskStatus(task, newStatus) {
    try {
      await updateTask(task.id, {
        status: newStatus,
      });

      await loadTasks(selectedVideo.id);
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...sceneForm,
      duration_seconds: sceneForm.duration_seconds
        ? parseInt(sceneForm.duration_seconds)
        : null,
    };

    await createScene(payload);
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
      loadTasks(selectedVideoId);
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
      await loadTasks(selectedVideoId);
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

    const payload = {
      ...sceneForm,
      duration_seconds:
        sceneForm.duration_seconds === "" || sceneForm.duration_seconds == null
          ? null
          : Number(sceneForm.duration_seconds),
    };

    try {
      if (editingSceneId === null) {
        await createScene(selectedVideoId, {
          ...payload,
          position: scenes.length,
        });
      } else {
        const targetScene = scenes.find((s) => s.id === editingSceneId);

        if (!targetScene) {
          alert("更新対象のシーンが見つかりません");
          return;
        }

        await updateScene(editingSceneId, {
          ...payload,
          position: targetScene.position,
        });
      }

      closeSceneModal();
      await loadScenes(selectedVideoId);
      await loadTasks(selectedVideoId);
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
              <button className="submit-button"onClick={openEditVideoModal}>
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

          {selectedVideo && (
            <section className="task-panel">
              <div className="task-panel-header">
                <div>
                  <h2>TODOボード</h2>
                  <p>ステータスごとにタスクを確認できます。</p>
                </div>
              </div>

              <div className="task-create-form">
                <h3>TODO追加</h3>

                <input
                  type="text"
                  placeholder="タイトル"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />

                <textarea
                  placeholder="詳細"
                  value={newTask.detail}
                  onChange={(e) => setNewTask({ ...newTask, detail: e.target.value })}
                />

                <select
                  value={newTask.scene_id || ""}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      scene_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">動画全体</option>
                  {scenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      Scene #{scene.position + 1} {scene.title}
                    </option>
                  ))}
                </select>

                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>

                <button type="button" className="submit-button" onClick={handleCreateTask}>
                  追加
                </button>
              </div>

              {tasksLoading ? (
                <p className="empty-state">TODOを読み込み中です...</p>
              ) : tasksError ? (
                <p className="error-message">{tasksError}</p>
              ) : (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={(event) => {
                    setActiveTask(event.active.data.current?.task ?? null);
                  }}
                  onDragCancel={() => {
                    setActiveTask(null);
                  }}
                  onDragEnd={async (event) => {
                    const draggedTask = event.active.data.current?.task ?? null;
                    setActiveTask(null);

                    if (!draggedTask) return;

                    await handleTaskDragEnd(event);
                  }}
                >
                  <div className="task-board">
                    {["未着手", "作業中", "完了"].map((status) => (
                      <TaskDroppableColumn
                        key={status}
                        status={status}
                        count={taskColumns[status].length}
                      >
                        {taskColumns[status].length === 0 ? (
                          <p className="task-column-empty">タスクはありません</p>
                        ) : (
                          taskColumns[status].map((task) => {
                            const relatedScene = scenes.find(
                              (scene) => scene.id === task.scene_id
                            );

                            const isEditing = editingTaskId === task.id;

                            if (isEditing) {
                              return (
                                <DraggableTaskCard key={task.id} task={task}>
                                  {({ attributes, listeners }) => (
                                    <article className={`task-card ${getTaskPriorityCardClass(task.priority)}`}>
                                      <div className="task-card-header">
                                        <button
                                          type="button"
                                          className="drag-handle task-drag-handle"
                                          {...attributes}
                                          {...listeners}
                                          title="ドラッグで移動"
                                        >
                                          ⠿
                                        </button>

                                        <h4>編集中</h4>
                                      </div>

                                      <input
                                        type="text"
                                        value={editingTask.title}
                                        onChange={(e) =>
                                          setEditingTask({ ...editingTask, title: e.target.value })
                                        }
                                        placeholder="タイトル"
                                      />

                                      <textarea
                                        value={editingTask.detail}
                                        onChange={(e) =>
                                          setEditingTask({ ...editingTask, detail: e.target.value })
                                        }
                                        placeholder="詳細"
                                      />

                                      <select
                                        value={editingTask.scene_id || ""}
                                        onChange={(e) =>
                                          setEditingTask({
                                            ...editingTask,
                                            scene_id: e.target.value ? Number(e.target.value) : null,
                                          })
                                        }
                                      >
                                        <option value="">動画全体</option>
                                        {scenes.map((scene) => (
                                          <option key={scene.id} value={scene.id}>
                                            Scene #{scene.position + 1} {scene.title}
                                          </option>
                                        ))}
                                      </select>

                                      <select
                                        value={editingTask.priority}
                                        onChange={(e) =>
                                          setEditingTask({
                                            ...editingTask,
                                            priority: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="高">高</option>
                                        <option value="中">中</option>
                                        <option value="低">低</option>
                                      </select>

                                      <select
                                        value={editingTask.task_type}
                                        onChange={(e) =>
                                          setEditingTask({
                                            ...editingTask,
                                            task_type: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="加工">加工</option>
                                        <option value="音声">音声</option>
                                        <option value="素材">素材</option>
                                        <option value="確認">確認</option>
                                      </select>

                                      <div className="task-actions">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEdit(task.id)}
                                        >
                                          保存
                                        </button>

                                        <button
                                          type="button"
                                          onClick={handleCancelEdit}
                                        >
                                          キャンセル
                                        </button>
                                      </div>
                                    </article>
                                  )}
                                </DraggableTaskCard>
                              );
                            }

                            return (
                              <DraggableTaskCard key={task.id} task={task}>
                                {({ attributes, listeners }) => (
                                  <article className={`task-card ${getTaskPriorityCardClass(task.priority)}`}>
                                    <div className="task-card-header">
                                      <button
                                        type="button"
                                        className="drag-handle task-drag-handle"
                                        {...attributes}
                                        {...listeners}
                                        title="ドラッグで移動"
                                      >
                                        ⠿
                                      </button>

                                      <h4>{task.title}</h4>

                                      <div className="task-badge-group">
                                        <span className={getPriorityClassName(task.priority)}>
                                          優先度: {task.priority}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="task-meta">
                                      <span className="task-meta-item">
                                        種別: {task.task_type || "未設定"}
                                      </span>
                                      <span className="task-meta-item">
                                        対象:{" "}
                                        {relatedScene
                                          ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
                                          : "動画全体"}
                                      </span>
                                    </div>

                                    <p className="task-detail">
                                      {task.detail || "詳細は未設定です。"}
                                    </p>

                                    <div className="task-actions">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(task)}
                                      >
                                        編集
                                      </button>

                                      {status !== "未着手" && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTaskStatus(task, "未着手")}
                                        >
                                          未着手へ
                                        </button>
                                      )}

                                      {status !== "作業中" && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTaskStatus(task, "作業中")}
                                        >
                                          作業中へ
                                        </button>
                                      )}

                                      {status !== "完了" && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTaskStatus(task, "完了")}
                                        >
                                          完了へ
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        className="delete-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(task.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </article>
                                )}
                              </DraggableTaskCard>
                            );
                          })
                        )}
                      </TaskDroppableColumn>
                    ))}
                  </div>

                  <DragOverlay>
                    {activeTask ? (
                      <article
                        className={`task-card ${getTaskPriorityCardClass(activeTask.priority)}`}
                        style={{
                          width: 420,
                          maxWidth: "calc(100vw - 32px)",
                        }}
                      >
                        <div className="task-card-header">
                          <h4>{activeTask.title}</h4>
                          <div className="task-badge-group">
                            <span className={getPriorityClassName(activeTask.priority)}>
                              優先度: {activeTask.priority}
                            </span>
                          </div>
                        </div>

                        <div className="task-meta">
                          <span className="task-meta-item">
                            種別: {activeTask.task_type || "未設定"}
                          </span>
                          <span className="task-meta-item">
                            対象:{" "}
                            {(() => {
                              const relatedScene = scenes.find(
                                (scene) => scene.id === activeTask.scene_id
                              );
                              return relatedScene
                                ? `Scene #${relatedScene.position + 1} ${relatedScene.title}`
                                : "動画全体";
                            })()}
                          </span>
                        </div>

                        <p className="task-detail">
                          {activeTask.detail || "詳細は未設定です。"}
                        </p>
                      </article>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </section>
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
        videoId={selectedVideoId}
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