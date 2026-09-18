-- Dijalankan SEKALI saat initdb: masa berlaku JWT (detik) untuk PostgREST/auth.
\set jwt_exp `echo "$JWT_EXP"`

ALTER DATABASE postgres SET "app.settings.jwt_exp" TO :'jwt_exp';
