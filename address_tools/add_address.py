from extract_google_maps_info import generate_google_maps_info_csv

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
INPUT_DIR = PROJECT_ROOT / "input"


def generate_address_csv():
    generate_google_maps_info_csv(
        input_path=INPUT_DIR / "favorite.csv",
        output_name=INPUT_DIR / "web_places_input.csv",
    )

if __name__ == "__main__":
    generate_address_csv()