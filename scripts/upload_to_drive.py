"""
scripts/upload_to_drive.py (OAuth版)
使い方: python upload_to_drive.py <アップロードするファイルパス>
環境変数:
  GDRIVE_CLIENT_ID       … OAuthクライアントID
  GDRIVE_CLIENT_SECRET   … OAuthクライアントシークレット
  GDRIVE_REFRESH_TOKEN   … OAuth Playgroundで取得したリフレッシュトークン
  GDRIVE_FOLDER_ID       … アップロード先のGoogle DriveフォルダID
"""
import os
import sys

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEEP_GENERATIONS = 8


def get_credentials() -> Credentials:
    creds = Credentials(
        token=None,
        refresh_token=os.environ["GDRIVE_REFRESH_TOKEN"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GDRIVE_CLIENT_ID"],
        client_secret=os.environ["GDRIVE_CLIENT_SECRET"],
        scopes=["https://www.googleapis.com/auth/drive.file"],
    )
    creds.refresh(Request())
    return creds


def main():
    if len(sys.argv) < 2:
        print("使い方: python upload_to_drive.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    folder_id = os.environ["GDRIVE_FOLDER_ID"]

    creds = get_credentials()
    drive = build("drive", "v3", credentials=creds)

    file_metadata = {
        "name": os.path.basename(file_path),
        "parents": [folder_id],
    }
    media = MediaFileUpload(file_path, mimetype="application/sql", resumable=True)
    uploaded = drive.files().create(body=file_metadata, media_body=media, fields="id,name").execute()
    print(f"アップロード完了: {uploaded['name']} (id={uploaded['id']})")

    results = (
        drive.files()
        .list(
            q=f"'{folder_id}' in parents and trashed = false",
            orderBy="createdTime desc",
            fields="files(id, name, createdTime)",
            pageSize=100,
        )
        .execute()
    )
    files = results.get("files", [])
    for old_file in files[KEEP_GENERATIONS:]:
        drive.files().delete(fileId=old_file["id"]).execute()
        print(f"古いバックアップを削除: {old_file['name']}")


if __name__ == "__main__":
    main()
