from app.services.task_generation import get_scene_initial_tasks

tasks = get_scene_initial_tasks(scene_id=1, scene_order=1)
print(tasks)