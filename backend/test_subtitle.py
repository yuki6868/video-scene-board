from pathlib import Path
from app.services.subtitle_service import generate_subtitle_png

result = generate_subtitle_png(
    text="最近悩みがあるのだ。",
    style_id=3,
    output_dir=Path("outputs"),
)

print(result)