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
  generateVoiceAsset,
  fetchVoiceAssets,
  selectVoiceAsset,
} from "./api/voiceAssetApi";

import AssetEditModal from "./components/modals/AssetEditModal";
import VideoModal from "./components/modals/VideoModal";
import SceneModal from "./components/modals/SceneModal";

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

const VOICE_STYLE_OPTIONS = [
  { label: "ずんだもん / ノーマル", value: 3 },
  { label: "ずんだもん / あまあま", value: 1 },
  { label: "ずんだもん / ツンツン", value: 7 },
  { label: "ずんだもん / セクシー", value: 5 },
  { label: "ずんだもん / ささやき", value: 22 },
  { label: "ずんだもん / ひそひそ", value: 38 },

  { label: "めたん / ノーマル", value: 2 },
  { label: "めたん / あまあま", value: 0 },
  { label: "めたん / ツンツン", value: 6 },
  { label: "めたん / セクシー", value: 4 },

  { label: "春日部つむぎ / ノーマル", value: 8 },

  { label: "玄野武宏 / ノーマル", value: 11 },
  { label: "玄野武宏 / 喜び", value: 39 },
  { label: "玄野武宏 / ツンギレ", value: 40 },
  { label: "玄野武宏 / 悲しみ", value: 41 },
];

function truncateText(text, maxLength = 80) {
  if (!text) return "未設定";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `http://127.0.0.1:8000/${path}`;
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

function SortableItem({ scene, progress, onOpenDetail, onDelete, onDuplicate, dragDisabled }) {
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

        {scene.background_path && (
          <div className="scene-preview-block">
            <strong>背景プレビュー</strong>
            <img
              src={buildFileUrl(scene.background_path)}
              alt={`${scene.title || "シーン"}の背景`}
              className="scene-preview-image"
            />
          </div>
        )}

        {scene.audio_path && (
          <audio
            controls
            src={buildFileUrl(scene.audio_path)}
            style={{ width: "100%", marginTop: "8px" }}
          />
        )}
      </div>

      <div className="scene-section">
        <strong>進捗バー</strong>
        <div className="scene-progress">
          <div className="scene-progress-track">
            <div
              className="scene-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="scene-progress-text">
            {progress.done}/{progress.total} 完了（{progress.percent}%）
          </p>
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
  const [expandedTaskIds, setExpandedTaskIds] = useState({});

  const [editingAsset, setEditingAsset] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    detail: "",
    task_type: "加工",
    priority: "中",
    status: "未着手",
    scene_id: null,
  });

  const [voiceAssets, setVoiceAssets] = useState([]);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const [voiceForm, setVoiceForm] = useState({
    text: "",
    style_id: 3,
    speed: 1.0,
    pitch: 0.0,
    intonation: 1.0,
    volume: 1.0,
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

  function toggleTaskExpanded(taskId) {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  function getSceneTaskProgress(sceneId) {
    const relatedTasks = tasks.filter((task) => task.scene_id === sceneId);
    const total = relatedTasks.length;

    if (total === 0) {
      return {
        total: 0,
        done: 0,
        percent: 0,
      };
    }

    const done = relatedTasks.filter((task) => task.status === "完了").length;

    return {
      total,
      done,
      percent: Math.round((done / total) * 100),
    };
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
      await loadTasksByVideo(selectedVideoId);
    } catch (e) {
      console.error(e);
      alert("更新失敗");
    }
  }

  async function loadTasksByVideo(videoId) {
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

    if (!active || !over) return;

    const activeTask = active.data.current?.task;
    const overStatus = over.data.current?.status;

    if (!activeTask || !overStatus) return;
    if (activeTask.status === overStatus) return;

    try {
      await updateTask(activeTask.id, { status: overStatus });
      await loadTasksByVideo(selectedVideoId);
      await loadScenesByVideo(selectedVideoId);

      if (selectedScene) {
        const refreshedScenes = await fetchScenes(selectedVideoId);
        const matchedScene = refreshedScenes.find(
          (scene) => scene.id === selectedScene.id
        );

        if (matchedScene) {
          setSelectedScene(matchedScene);
          setSceneForm({
            title: matchedScene.title || "",
            script: matchedScene.script || "",
            materials: matchedScene.materials || "",
            position: matchedScene.position ?? 0,
            section_type: matchedScene.section_type || "",
            status: matchedScene.status || "未着手",
            duration_seconds: matchedScene.duration_seconds ?? "",
            audio_path: matchedScene.audio_path || "",
            character_name: matchedScene.character_name || "",
            character_expression: matchedScene.character_expression || "",
            background_path: matchedScene.background_path || "",
            se_path: matchedScene.se_path || "",
            telop: matchedScene.telop || "",
            direction: matchedScene.direction || "",
            edit_note: matchedScene.edit_note || "",
          });
        }
      }
    } catch (error) {
      console.error(error);
      alert("ステータス更新に失敗しました");
    }
  }

  async function loadVoiceAssets(sceneId) {
    if (!sceneId) return;

    try {
      setVoiceError("");
      const data = await fetchVoiceAssets(sceneId);
      setVoiceAssets(data);
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    }
  }

  function handleVoiceFormChange(event) {
    const { name, value } = event.target;

    setVoiceForm((prev) => ({
      ...prev,
      [name]:
        name === "text"
          ? value
          : Number(value),
    }));
  }

  async function handleGenerateVoice() {
    if (!selectedScene) return;

    const textToUse =
      voiceForm.text?.trim() ||
      selectedScene.script ||
      selectedScene.telop ||
      "";

    if (!textToUse) {
      alert("セリフがありません");
      return;
    }

    try {
      setVoiceLoading(true);
      setVoiceError("");

      await generateVoiceAsset({
        scene_id: selectedScene.id,
        text: textToUse,
        style_id: Number(voiceForm.style_id),
        speed: Number(voiceForm.speed),
        pitch: Number(voiceForm.pitch),
        intonation: Number(voiceForm.intonation),
        volume: Number(voiceForm.volume),
      });

      await loadVoiceAssets(selectedScene.id);

      setVoiceForm((prev) => ({
        ...prev,
        text: textToUse,
      }));
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    } finally {
      setVoiceLoading(false);
    }
  }

  async function handleAssetUpdated() {
    if (!selectedVideoId) return;

    const refreshedScenes = await fetchScenes(selectedVideoId);
    setScenes(refreshedScenes);

    if (selectedScene) {
      const matchedScene = refreshedScenes.find(
        (scene) => scene.id === selectedScene.id
      );

      if (matchedScene) {
        setSelectedScene(matchedScene);
        setSceneForm({
          ...matchedScene,
          title: matchedScene.title || "",
          script: matchedScene.script || "",
          materials: matchedScene.materials || "",
          duration_seconds: matchedScene.duration_seconds ?? "",
        });
      }
    }
  }

  async function handleSelectVoiceAsset(voiceAssetId) {
    if (!selectedScene) return;

    try {
      const result = await selectVoiceAsset(voiceAssetId);
      const updatedScene = result.scene;

      await loadVoiceAssets(selectedScene.id);

      if (updatedScene) {
        setScenes((prev) =>
          prev.map((scene) =>
            scene.id === updatedScene.id ? updatedScene : scene
          )
        );

        setSelectedScene(updatedScene);

        setSceneForm((prev) => ({
          ...prev,
          ...updatedScene,
          title: updatedScene.title || "",
          script: updatedScene.script || "",
          materials: updatedScene.materials || "",
          duration_seconds: updatedScene.duration_seconds ?? "",
        }));
      }
    } catch (error) {
      console.error(error);
      setVoiceError(error.message);
    }
  }

  const loadScenesByVideo = async (videoId) => {
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
    if (!selectedVideoId) {
      setScenes([]);
      setTasks([]);
      setTasksError("");
      return;
    }

    loadScenesByVideo(selectedVideoId);
    loadTasksByVideo(selectedVideoId);
  }, [selectedVideoId]);


  useEffect(() => {
    if (selectedVideoId) {
      loadScenesByVideo(selectedVideoId);
      loadTasksByVideo(selectedVideoId);
    } else {
      setScenes([]);
      setTasks([]);
      setTasksError("");
    }
  }, [selectedVideoId]);

  useEffect(() => {
    if (!selectedScene) {
      setVoiceAssets([]);
      return;
    }

    setVoiceForm((prev) => ({
      ...prev,
      text: selectedScene.script || selectedScene.telop || "",
    }));

    loadVoiceAssets(selectedScene.id);
  }, [selectedScene]);

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

  function getChildProgress(task) {
    const children = task.children || [];
    const total = children.length;
    const done = children.filter((child) => child.status === "完了").length;

    return { total, done };
  }

  function buildTaskTree(tasks) {
    const taskMap = {};
    const roots = [];

    tasks.forEach((task) => {
      taskMap[task.id] = {
        ...task,
        children: [],
      };
    });

    tasks.forEach((task) => {
      const current = taskMap[task.id];

      if (task.parent_task_id && taskMap[task.parent_task_id]) {
        taskMap[task.parent_task_id].children.push(current);
      } else {
        roots.push(current);
      }
    });

    return roots;
  }

  function TaskTreeNode({
    task,
    expandedTaskIds,
    toggleTaskExpanded,
    handleUpdateTaskStatus,
    scenes,
  }) {
    const relatedScene = scenes.find((scene) => scene.id === task.scene_id);
    const hasChildren = task.children && task.children.length > 0;

    return (
      <div className={hasChildren ? "task-tree-node" : "task-child-card"}>
        <div className={hasChildren ? "task-card-header" : "task-child-header"}>
          <div className={hasChildren ? "task-title-row task-title-row-parent" : "task-child-title-wrap"}>
            {hasChildren ? (
              <button
                type="button"
                className="task-expand-button"
                onClick={() => toggleTaskExpanded(task.id)}
              >
                {expandedTaskIds[task.id] ? "▼" : "▶"}
              </button>
            ) : (
              <span className="task-child-bullet">•</span>
            )}

            <span className={hasChildren ? "" : "task-child-title"}>
              {task.title}
            </span>
          </div>

          <div className={hasChildren ? "task-badge-group" : "task-child-badges"}>
            <span className={getPriorityClassName(task.priority)}>
              優先度: {task.priority}
            </span>
            <span className={getTaskStatusClassName(task.status)}>
              {task.status}
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

        <p className={hasChildren ? "task-detail" : "task-child-detail"}>
          {task.detail || "詳細は未設定です。"}
        </p>

        <div className={hasChildren ? "task-actions task-group-actions" : "task-actions task-child-actions"}>
          {task.status !== "未着手" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "未着手")}>
              未着手
            </button>
          )}
          {task.status !== "作業中" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "作業中")}>
              作業中
            </button>
          )}
          {task.status !== "完了" && (
            <button type="button" onClick={() => handleUpdateTaskStatus(task, "完了")}>
              完了
            </button>
          )}
        </div>

        {hasChildren && expandedTaskIds[task.id] && (
          <div className="task-children">
            {task.children.map((child) => (
              <TaskTreeNode
                key={child.id}
                task={child}
                expandedTaskIds={expandedTaskIds}
                toggleTaskExpanded={toggleTaskExpanded}
                handleUpdateTaskStatus={handleUpdateTaskStatus}
                scenes={scenes}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const taskTree = useMemo(() => {
    return buildTaskTree(sortTasksByPriority(tasks));
  }, [tasks]);

  const sceneGroupTasks = useMemo(() => {
    return taskTree.filter((task) => task.task_type === "scene_group");
  }, [taskTree]);

  const taskColumns = useMemo(() => {
    return {
      未着手: sceneGroupTasks.filter((task) => task.status === "未着手"),
      作業中: sceneGroupTasks.filter((task) => task.status === "作業中"),
      完了: sceneGroupTasks.filter((task) => task.status === "完了"),
    };
  }, [sceneGroupTasks]);

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
      await loadTasksByVideo(selectedVideo.id);
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
      await loadTasksByVideo(selectedVideo.id);
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

      await loadTasksByVideo(selectedVideo.id);
      await loadScenesByVideo(selectedVideo.id);

      if (selectedScene) {
        const refreshedScenes = await fetchScenes(selectedVideo.id);
        const matchedScene = refreshedScenes.find((scene) => scene.id === selectedScene.id);

        if (matchedScene) {
          setSelectedScene(matchedScene);
          setSceneForm({
            title: matchedScene.title || "",
            script: matchedScene.script || "",
            materials: matchedScene.materials || "",
            position: matchedScene.position ?? 0,
            section_type: matchedScene.section_type || "",
            status: matchedScene.status || "未着手",
            duration_seconds: matchedScene.duration_seconds ?? "",
            audio_path: matchedScene.audio_path || "",
            character_name: matchedScene.character_name || "",
            character_expression: matchedScene.character_expression || "",
            background_path: matchedScene.background_path || "",
            se_path: matchedScene.se_path || "",
            telop: matchedScene.telop || "",
            direction: matchedScene.direction || "",
            edit_note: matchedScene.edit_note || "",
          });
        }
      }
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

      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン並び替えに失敗しました");
      loadScenesByVideo(selectedVideoId);
      loadTasksByVideo(selectedVideoId);
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

      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
    } catch (error) {
      console.error(error);
      alert(error.message || "シーン削除に失敗しました");
    }
  };

  const handleDuplicate = async (sceneId) => {
    try {
      await duplicateScene(sceneId);
      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
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
      await loadScenesByVideo(selectedVideoId);
      await loadTasksByVideo(selectedVideoId);
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

                            const hasChildren = task.children && task.children.length > 0;

                            return (
                              <div key={task.id}>
                                {hasChildren ? (
                                  <article className={`task-card ${getTaskPriorityCardClass(task.priority)}`}>
                                    <div className="task-card-header">
                                      <span className="drag-handle task-drag-handle is-disabled">⠿</span>

                                      <div className="task-title-row task-title-row-parent">
                                        <button
                                          type="button"
                                          className="task-expand-button"
                                          onClick={() => toggleTaskExpanded(task.id)}
                                        >
                                          {expandedTaskIds[task.id] ? "▼" : "▶"}
                                        </button>

                                        <h4>
                                          {task.title}
                                          <span className="task-progress-inline">
                                            {" "}
                                            ({getChildProgress(task).done}/{getChildProgress(task).total})
                                          </span>
                                        </h4>
                                      </div>

                                      <div className="task-badge-group">
                                        <span className={getPriorityClassName(task.priority)}>
                                          優先度: {task.priority}
                                        </span>
                                        <span className={getTaskStatusClassName(task.status)}>
                                          {task.status}
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

                                    {expandedTaskIds[task.id] && (
                                      <div className="task-children">
                                        {task.children.map((child) => (
                                          <TaskTreeNode
                                            key={child.id}
                                            task={child}
                                            expandedTaskIds={expandedTaskIds}
                                            toggleTaskExpanded={toggleTaskExpanded}
                                            handleUpdateTaskStatus={handleUpdateTaskStatus}
                                            scenes={scenes}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </article>
                                ) : (
                                  // 子なし単独タスク: ドラッグ可
                                  <DraggableTaskCard task={task}>
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
                                            <span className={getTaskStatusClassName(task.status)}>
                                              {task.status}
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

                                          {task.status !== "未着手" && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateTaskStatus(task, "未着手")}
                                            >
                                              未着手へ
                                            </button>
                                          )}

                                          {task.status !== "作業中" && (
                                            <button
                                              type="button"
                                              onClick={() => handleUpdateTaskStatus(task, "作業中")}
                                            >
                                              作業中へ
                                            </button>
                                          )}

                                          {task.status !== "完了" && (
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
                                )}

                                {/* {hasChildren && expandedTaskIds[task.id] && (
                                  <div className="task-children">
                                    {task.children.map((child) => (
                                      <div key={child.id} className="task-child-card">
                                        <div className="task-child-header">
                                          <div className="task-child-title-wrap">
                                            <span className="task-child-bullet">•</span>
                                            <span className="task-child-title">{child.title}</span>
                                          </div>

                                          <div className="task-child-badges">
                                            <span className={getPriorityClassName(child.priority)}>
                                              優先度: {child.priority}
                                            </span>
                                            <span className={getTaskStatusClassName(child.status)}>
                                              {child.status}
                                            </span>
                                          </div>
                                        </div>

                                        {child.detail && (
                                          <p className="task-child-detail">
                                            {child.detail}
                                          </p>
                                        )}

                                        <div className="task-actions task-child-actions">
                                          {child.status !== "未着手" && (
                                            <button type="button" onClick={() => handleUpdateTaskStatus(child, "未着手")}>
                                              未着手
                                            </button>
                                          )}

                                          {child.status !== "作業中" && (
                                            <button type="button" onClick={() => handleUpdateTaskStatus(child, "作業中")}>
                                              作業中
                                            </button>
                                          )}

                                          {child.status !== "完了" && (
                                            <button type="button" onClick={() => handleUpdateTaskStatus(child, "完了")}>
                                              完了
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )} */}
                              </div>
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
                    progress={getSceneTaskProgress(scene.id)}
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
        loadTasks={() => loadTasksByVideo(selectedVideoId)}
        onAssetUpdated={handleAssetUpdated}
        tasks={tasks}
        handleUpdateTaskStatus={handleUpdateTaskStatus}
        voiceForm={voiceForm}
        voiceLoading={voiceLoading}
        voiceError={voiceError}
        voiceAssets={voiceAssets}
        voiceStyleOptions={VOICE_STYLE_OPTIONS}
        onVoiceFormChange={handleVoiceFormChange}
        onGenerateVoice={handleGenerateVoice}
        onSelectVoiceAsset={handleSelectVoiceAsset}
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