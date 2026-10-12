-- Oneshots: título propio y estado planificado/jugado independiente de session_type.
-- planned solo se usa con session_type = 'oneshot'; el resto de los tipos sigue usando 'planning'.
ALTER TABLE sessions ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE sessions ADD COLUMN planned INTEGER NOT NULL DEFAULT 0 CHECK (planned IN (0, 1));
