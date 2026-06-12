#!/bin/bash
# restore.sh — Descarga el backup de OneDrive y lo restaura en Postgres local
# Correr esto al inicio de trabajo en una nueva máquina

set -e

CONTAINER="zyncslot-postgres"
DB_USER="zyncslot_user"
DB_NAME="zyncslot_db"
BACKUP_DIR="$HOME/.zyncrox-backups"
BACKUP_FILE="$BACKUP_DIR/zyncrox_db_latest.sql"
ONEDRIVE_PATH="onedrive:Backups/Zyncrox"

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker no está corriendo. Ábrelo primero e intenta de nuevo."
  exit 1
fi

# Verificar que el contenedor está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "❌ Contenedor '$CONTAINER' no está activo. Corre 'docker compose up -d' primero."
  exit 1
fi

# Crear carpeta local si no existe
mkdir -p "$BACKUP_DIR"

echo "☁️  Descargando backup desde OneDrive..."
rclone copy "$ONEDRIVE_PATH/zyncrox_db_latest.sql" "$BACKUP_DIR" --progress

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ No se encontró backup en OneDrive. Asegúrate de haber hecho push desde la otra máquina."
  exit 1
fi

echo "🗄️  Restaurando base de datos..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"

echo "✅ Restore completado: $(date '+%Y-%m-%d %H:%M:%S')"
