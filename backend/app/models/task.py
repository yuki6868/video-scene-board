from sqlalchemy.sql import func
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    scene_id = Column(Integer, ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True, index=True)

    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)

    children = relationship(
        "Task",
        backref="parent",
        remote_side="Task.id"
    )

    title = Column(String(255), nullable=False)
    detail = Column(Text, nullable=True)

    task_type = Column(String(100), nullable=False, default="加工")
    priority = Column(String(50), nullable=False, default="中")
    status = Column(String(50), nullable=False, default="未着手")

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )