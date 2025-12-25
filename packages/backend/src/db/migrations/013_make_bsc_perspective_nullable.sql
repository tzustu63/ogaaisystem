-- Migration: Make bsc_perspective nullable in kpi_registry
-- Created: 2025-12-25
-- Purpose: Allow KPI creation without BSC perspective requirement

-- Make bsc_perspective nullable
ALTER TABLE kpi_registry ALTER COLUMN bsc_perspective DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN kpi_registry.bsc_perspective IS 'BSC Perspective (optional): financial, customer, internal_process, learning_growth';
