from pathlib import Path
from app.services.voice_service import generate_voice_file

result = generate_voice_file(
    text="テストなのだ",
    style_id=3,
    output_dir=Path("outputs")
)

print(result)