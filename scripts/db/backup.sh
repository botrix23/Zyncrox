#!/bin/bash
# backup.sh — Dump de Postgres y subida a OneDrive
# Se ejecuta automáticamente desde el hook post-push de Git

set -e

CONTAINER="zyncslot-postgres"
DB_USER="zyncslot_user"
DB_NAME="zyncslot_db"
BACKUP_DIR="$HOME/.zyncrox-backups"
BACKUP_FILE="$BACKUP_DIR/zyncrox_db_latest.sql"
ONEDRIVE_PATH="onedrive:Backups/Zyncrox"

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
  echo "⚠️  Docker no está corriendo. Saltando backup de base de datos."
  exit 0
fi

# Verificar que el contenedor está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "⚠️  Contenedor '$CONTAINER' no está activo. Saltando backup."
  exit 0
fi

# Crear carpeta local de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "📦 Haciendo dump de la base de datos..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

echo "☁️  Subiendo backup a OneDrive..."
rclone copy "$BACKUP_FILE" "$ONEDRIVE_PATH" --progress

echo "✅ Backup completado: $(date '+%Y-%m-%d %H:%M:%S')"
