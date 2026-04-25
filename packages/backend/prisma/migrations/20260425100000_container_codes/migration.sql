-- Add HDX 35-gallon tote as a container type.
ALTER TYPE "ContainerType" ADD VALUE 'TOTE_35GAL';

-- Container.label is now the auto-generated unique container code
-- (format: {PREFIX}-{NNNN}, e.g. T27-0012). Enforce uniqueness so codes
-- can't collide. The associated Item.description holds friendly text.
CREATE UNIQUE INDEX "containers_label_key" ON "containers"("label");
