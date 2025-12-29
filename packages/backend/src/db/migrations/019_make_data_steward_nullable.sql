-- Migration: Make data_steward nullable in kpi_registry
-- Created: 2025-12-29
-- Purpose: Allow KPI creation without data_steward (using data_steward_id instead)

-- Make data_steward nullable
ALTER TABLE kpi_registry ALTER COLUMN data_steward DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN kpi_registry.data_steward IS 'Data steward name (optional, deprecated - use data_steward_id instead)';
