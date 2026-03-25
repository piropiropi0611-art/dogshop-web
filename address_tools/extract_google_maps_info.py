import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

import pandas as pd
from geopy.exc import (
    GeocoderRateLimited,
    GeocoderServiceError,
    GeocoderTimedOut,
    GeocoderUnavailable,
)
from geopy.geocoders import Nominatim

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
INPUT_DIR = PROJECT_ROOT / "input"
DEFAULT_INPUT = INPUT_DIR / "favorite.csv"
DEFAULT_OUTPUT = INPUT_DIR / "web_places_input.csv"
GEOCODER_DELAY_SECONDS = 2.0
GEOCODER_TIMEOUT_SECONDS = 10
MAX_RETRIES = 5
HTTP_HEADERS = {
    "User-Agent": "dogshop-address-tool/1.0 (+https://github.com/piropiropi0611-art/dogshop-web)"
}
RETRYABLE_ERRORS = (
    GeocoderTimedOut,
    GeocoderUnavailable,
    GeocoderServiceError,
)


def safe_string(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def decode_text(value):
    return urllib.parse.unquote(unescape(value))


def extract_coordinates_from_text(text):
    decoded = decode_text(text)

    patterns = [
        (r"/maps/search/([0-9.\-]+),([0-9.\-]+)", "url-search", False),
        (r"[?&]q=([0-9.\-]+),([0-9.\-]+)", "url-query", False),
        (r"center=([0-9.\-]+),([0-9.\-]+)", "html-static-center", False),
        (r"!3d([0-9.\-]+)!4d([0-9.\-]+)", "html-3d4d", False),
        (r"!2d([0-9.\-]+)!3d([0-9.\-]+)", "html-2d3d", True),
    ]

    for pattern, source, swap in patterns:
        match = re.search(pattern, decoded)
        if not match:
            continue

        first, second = match.groups()
        if swap:
            lat, lng = second, first
        else:
            lat, lng = first, second

        return float(lat), float(lng), source

    return None, None, ""


def extract_coordinates_from_google_maps_url(url):
    lat, lng, source = extract_coordinates_from_text(url)
    if lat is not None and lng is not None:
        return lat, lng, source

    return None, None, ""


def sleep_for_rate_limit(seconds):
    time.sleep(max(seconds, GEOCODER_DELAY_SECONDS))


def reverse_geocode_with_heartrails(lat, lng):
    query = urllib.parse.urlencode(
        {
            "method": "searchByGeoLocation",
            "x": lng,
            "y": lat,
        }
    )
    url = f"https://geoapi.heartrails.com/api/json?{query}"
    request = urllib.request.Request(url, headers=HTTP_HEADERS)
    with urllib.request.urlopen(request, timeout=GEOCODER_TIMEOUT_SECONDS) as response:
        payload = response.read().decode("utf-8")

    data = json.loads(payload)
    locations = data.get("response", {}).get("location", [])
    if not locations:
        return "", "HeartRails逆ジオコード", "住所候補なし"

    best = locations[0]
    address = "".join(
        part
        for part in [best.get("prefecture", ""), best.get("city", ""), best.get("town", "")]
        if part
    )
    if best.get("postal"):
        address = f"〒{best['postal']} {address}"

    return address, "HeartRails逆ジオコード", ""


def reverse_geocode_with_retry(geolocator, lat, lng):
    query = f"{lat}, {lng}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            location = geolocator.reverse(
                query,
                exactly_one=True,
                language="ja",
                timeout=GEOCODER_TIMEOUT_SECONDS,
            )
            sleep_for_rate_limit(GEOCODER_DELAY_SECONDS)
            if location:
                return location.address, "URL座標の逆ジオコード", ""
            return "", "URL座標の逆ジオコード", "逆ジオコード結果なし"
        except GeocoderRateLimited as error:
            retry_after = getattr(error, "retry_after", 0) or 0
            wait_seconds = max(retry_after, GEOCODER_DELAY_SECONDS * (attempt + 1), 5)
            print(
                f"  逆ジオコードがレート制限です。{wait_seconds:.1f}秒待機して再試行します。"
            )
            time.sleep(wait_seconds)
        except RETRYABLE_ERRORS as error:
            wait_seconds = GEOCODER_DELAY_SECONDS * (attempt + 1)
            print(f"  逆ジオコード再試行 {attempt}/{MAX_RETRIES}: {error}")
            time.sleep(wait_seconds)

    return "", "URL座標の逆ジオコード", "逆ジオコード失敗"


def forward_geocode_with_retry(geolocator, title):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            location = geolocator.geocode(title, timeout=GEOCODER_TIMEOUT_SECONDS)
            sleep_for_rate_limit(GEOCODER_DELAY_SECONDS)
            if location:
                return (
                    location.address,
                    float(location.latitude),
                    float(location.longitude),
                    "タイトル検索",
                    "",
                )
            return "", None, None, "タイトル検索", "検索不可"
        except GeocoderRateLimited as error:
            retry_after = getattr(error, "retry_after", 0) or 0
            wait_seconds = max(retry_after, GEOCODER_DELAY_SECONDS * (attempt + 1), 5)
            print(
                f"  タイトル検索がレート制限です。{wait_seconds:.1f}秒待機して再試行します。"
            )
            time.sleep(wait_seconds)
        except RETRYABLE_ERRORS as error:
            wait_seconds = GEOCODER_DELAY_SECONDS * (attempt + 1)
            print(f"  タイトル検索再試行 {attempt}/{MAX_RETRIES}: {error}")
            time.sleep(wait_seconds)

    return "", None, None, "タイトル検索", "検索失敗"


def build_output_dataframe(input_path):
    print("CSVファイルを読み込んでいます...")
    df = pd.read_csv(Path(input_path))
    df = df.dropna(subset=["タイトル"]).copy()
    df["タイトル"] = df["タイトル"].map(safe_string)
    df = df[df["タイトル"] != ""].reset_index(drop=True)

    for column in ["住所", "緯度", "経度", "座標取得元", "住所取得元", "取得状態"]:
        if column not in df.columns:
            df[column] = ""

    return df


def generate_google_maps_info_csv(
    input_path=DEFAULT_INPUT,
    output_name=DEFAULT_OUTPUT,
    limit=None,
):
    geolocator = Nominatim(user_agent=HTTP_HEADERS["User-Agent"])
    df = build_output_dataframe(input_path)

    if limit is not None:
        df = df.head(limit).copy()

    print(f"全{len(df)}件の住所・座標を取得します。")
    print("Google Maps URLを優先し、足りない場合だけAPI検索を使います。\n")

    reverse_cache = {}

    for index, row in df.iterrows():
        title = safe_string(row.get("タイトル"))
        url = safe_string(row.get("URL"))

        address = ""
        lat = None
        lng = None
        coord_source = ""
        address_source = ""
        status = ""

        if url:
            try:
                lat, lng, coord_source = extract_coordinates_from_google_maps_url(url)
            except Exception as error:
                status = f"URL解析失敗: {error}"

        if lat is not None and lng is not None:
            cache_key = (round(lat, 7), round(lng, 7))
            if cache_key not in reverse_cache:
                try:
                    reverse_cache[cache_key] = reverse_geocode_with_heartrails(lat, lng)
                except Exception:
                    reverse_cache[cache_key] = reverse_geocode_with_retry(geolocator, lat, lng)
            address, address_source, reverse_status = reverse_cache[cache_key]
            if reverse_status:
                status = reverse_status

        if not address:
            fallback_address, fallback_lat, fallback_lng, fallback_source, fallback_status = (
                forward_geocode_with_retry(geolocator, title)
            )
            if fallback_address:
                address = fallback_address
                address_source = fallback_source
                status = ""
                if lat is None and fallback_lat is not None and fallback_lng is not None:
                    lat = fallback_lat
                    lng = fallback_lng
                    coord_source = fallback_source
            elif not status:
                status = fallback_status

        df.at[index, "住所"] = address if address else "検索不可"
        df.at[index, "緯度"] = "" if lat is None else lat
        df.at[index, "経度"] = "" if lng is None else lng
        df.at[index, "座標取得元"] = coord_source
        df.at[index, "住所取得元"] = address_source
        df.at[index, "取得状態"] = status if status else "OK"

        print(
            f"{index + 1}/{len(df)}: {title} -> "
            f"住所={df.at[index, '住所']} / 座標=({df.at[index, '緯度']}, {df.at[index, '経度']})"
        )

    df.to_csv(Path(output_name), index=False, encoding="utf-8-sig")
    print(f"\n完了しました。『{output_name}』として保存しました。")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Google Maps URLから住所と座標を抽出してCSVへ保存します。"
    )
    parser.add_argument("--input", default=DEFAULT_INPUT, help="入力CSVファイル")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="出力CSVファイル")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="先頭から指定件数だけ処理します。動作確認用です。",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generate_google_maps_info_csv(
        input_path=args.input,
        output_name=args.output,
        limit=args.limit,
    )
