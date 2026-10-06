# Política de seguridad

[English](SECURITY.md)

## Versiones soportadas

Solo el último release y la rama `main` reciben correcciones de seguridad, tanto la app de escritorio como las imágenes de Docker.

## Reportar una vulnerabilidad

**No abras un issue público.** Reportala en privado con el [reporte privado de vulnerabilidades de GitHub](https://github.com/ncorrea-13/rolboard/security/advisories/new).

Incluí:

- Cuál es el problema y qué podría hacer un atacante con él.
- Pasos para reproducirlo, o una prueba de concepto.
- La versión afectada y cómo corre Rolboard (escritorio o Docker).

Es un proyecto personal que mantengo en mi tiempo libre. Voy a confirmar el reporte dentro de una semana y avisarte hasta que esté corregido. Cuando salga la corrección, el advisory se publica con crédito para vos, salvo que prefieras quedar anónimo.

## Alcance

Dentro del alcance: autenticación y sesiones, aislamiento entre campañas, subida de archivos, lectura del vault y renderizado de notas, y los endpoints exclusivos del escritorio.

Fuera del alcance: problemas que requieren una máquina ya comprometida, y despliegues inseguros que van en contra del README (por ejemplo `ROLBOARD_USER=0` en Docker rootful, o `TRUST_PROXY_HEADERS=true` sin Cloudflare adelante).
