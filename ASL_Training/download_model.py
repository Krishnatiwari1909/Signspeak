"""
Downloads the holistic_landmarker.task model file required by extract_optimized.py.
Tries multiple sources in order. Run this once before running extract_optimized.py.

Usage:
    python download_model.py
"""
import os
import sys
import urllib.request

OUT = 'holistic_landmarker.task'
EXPECTED_MIN_SIZE = 20 * 1024 * 1024  # at least 20MB

SOURCES = [
    # Primary: Google Cloud Storage (float16, smaller)
    "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task",
    # Fallback: float32 version
    "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float32/latest/holistic_landmarker.task",
]


def download(url, out):
    print(f"Trying: {url}")

    def progress(count, block, total):
        if total > 0:
            pct = min(int(count * block * 100 / total), 100)
            downloaded = min(count * block, total)
            sys.stdout.write(f"\r  {pct}% ({downloaded // 1024} KB / {total // 1024} KB)")
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(url, out, progress)
        print()  # newline after progress bar
        size = os.path.getsize(out)
        print(f"  Downloaded: {size // 1024} KB")
        if size < EXPECTED_MIN_SIZE:
            print(f"  WARNING: File seems too small ({size} bytes). May be incomplete.")
            os.remove(out)
            return False
        return True
    except Exception as e:
        print(f"\n  FAILED: {e}")
        if os.path.exists(out):
            os.remove(out)
        return False


def main():
    if os.path.exists(OUT):
        size = os.path.getsize(OUT)
        if size >= EXPECTED_MIN_SIZE:
            print(f"Model already exists ({size // 1024} KB). Nothing to do.")
            return
        else:
            print(f"Existing file too small ({size} bytes), re-downloading...")
            os.remove(OUT)

    for url in SOURCES:
        if download(url, OUT):
            print(f"\nSuccess! Model saved to: {os.path.abspath(OUT)}")
            return

    print("\nAll downloads failed.")
    print("Please manually download the model file from:")
    print("  https://ai.google.dev/edge/mediapipe/solutions/vision/holistic_landmarker")
    print(f"and save it as: {os.path.abspath(OUT)}")
    sys.exit(1)


if __name__ == '__main__':
    main()
