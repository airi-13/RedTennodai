"""
scripts/upload_to_drive.py
使い方: python upload_to_drive.py <アップロードするファイルパス>
環境変数:
  GDRIVE_SERVICE_ACCOUNT_JSON  … Googleサービスアカウントの鍵(JSON文字列そのもの)
  GDRIVE_FOLDER_ID             … アップロード先のGoogle DriveフォルダID
"""
import json
import os
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

KEEP_GENERATIONS = 8


def main():
    if len(sys.argv) < 2:
        print("使い方: python upload_to_drive.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    folder_id = os.environ["GDRIVE_FOLDER_ID"]
    sa_info = json.loads(os.environ["GDRIVE_SERVICE_ACCOUNT_JSON"])

    creds = service_account.Credentials.from_service_account_info(
        sa_info, scopes=["https://www.googleapis.com/auth/drive"]
    )
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
