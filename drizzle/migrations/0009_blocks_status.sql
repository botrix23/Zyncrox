-- Agregar columnas status y cancel_reason a la tabla blocks
-- Permite cancelar ausencias en lugar de borrarlas, manteniendo historial

ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "cancel_reason" varchar(255);
ALTER TABLE "blocks" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT now();
