package repository

import (
	"database/sql"
	"encoding/json"
)

// toJSONText serializa un json.RawMessage a string para el driver de SQLite.
// Pasar []byte directo lo guardaría como BLOB pese a la afinidad TEXT de la
// columna (SQLite no convierte BLOB->TEXT en INSERT) — rompe la legibilidad
// con sqlite3 a mano que el resto del schema ya prioriza.
func toJSONText(r json.RawMessage) string {
	if len(r) == 0 {
		return "{}"
	}
	return string(r)
}

func toNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func fromNullString(n sql.NullString) *string {
	if !n.Valid {
		return nil
	}
	return &n.String
}

func toNullInt64(i *int64) sql.NullInt64 {
	if i == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: *i, Valid: true}
}

func fromNullInt64(n sql.NullInt64) *int64 {
	if !n.Valid {
		return nil
	}
	return &n.Int64
}
