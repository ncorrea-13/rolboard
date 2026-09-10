ALTER TABLE arcs ADD COLUMN status TEXT NOT NULL DEFAULT 'planificado'
    CHECK (status IN ('planificado', 'en_curso', 'cerrado'));

ALTER TABLE arcs ADD COLUMN subarc_order INTEGER;
