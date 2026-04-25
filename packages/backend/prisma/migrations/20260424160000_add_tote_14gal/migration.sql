-- Add HDX 14-gallon tote as a pre-defined container type.
-- Postgres requires enum values to be added inside a committed transaction
-- before they can be used in a query — running `prisma migrate deploy` handles
-- this correctly.
ALTER TYPE "ContainerType" ADD VALUE 'TOTE_14GAL';
