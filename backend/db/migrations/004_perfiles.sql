CREATE TABLE IF NOT EXISTS perfiles (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL DEFAULT '',
  password VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(500),
  profesion VARCHAR(200) DEFAULT '',
  bio TEXT DEFAULT '',
  localidad VARCHAR(200) DEFAULT '',
  sitio_web VARCHAR(500) DEFAULT '',
  instagram VARCHAR(300) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perfiles_email ON perfiles(email);
CREATE INDEX IF NOT EXISTS idx_perfiles_google_id ON perfiles(google_id);
