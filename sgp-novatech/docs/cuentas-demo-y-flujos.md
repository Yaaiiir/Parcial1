# Cuentas Demo y Flujos de Prueba

Este documento sirve para recorrer el sistema con datos de demostración ya cargados.

## Credenciales base

Todas las cuentas usan la misma contrasena:

```text
Password123!
```

## Cuentas sugeridas

### Administrador

- `admin@novatech.mx`

### Gerentes

- `gerente@novatech.mx`
- `gerente2@novatech.mx`

### Lideres

- `lider@novatech.mx`
- `lider2@novatech.mx`
- `lider3@novatech.mx`

### Empleados

- `empleado1@novatech.mx`
- `empleado2@novatech.mx`
- `empleado3@novatech.mx`
- `empleado4@novatech.mx`
- `empleado5@novatech.mx`
- `empleado6@novatech.mx`
- `empleado7@novatech.mx`
- `empleado8@novatech.mx`

### Usuario inactivo

- `empleado9@novatech.mx`

Esta cuenta permite validar restricciones de acceso para usuarios desactivados.

## Proyectos demo cargados

- `PRJ-001` Portal Web Cliente Bancario
- `PRJ-002` App Movil Inventario
- `PRJ-003` Sistema de Nomina Inteligente
- `PRJ-004` CRM Comercial B2B
- `PRJ-005` Portal de Mesa de Ayuda
- `PRJ-006` Dashboard Analytics Logistica

## Estados que ya vienen representados

- Proyectos `ACTIVO`, `PAUSADO` y `CERRADO`
- Tareas `PENDIENTE`, `EN_PROGRESO`, `EN_REVISION` y `COMPLETADA`
- Prioridades `ALTA`, `MEDIA` y `BAJA`
- Tareas vencidas y proximas a vencer
- Comentarios normales y comentario con borrado logico
- Notificaciones leidas y no leidas
- Usuario inactivo

## Flujos recomendados

## 1. Inicio de sesion y control por rol

1. Inicia sesion como `admin@novatech.mx`.
2. Confirma que entra al area administrativa.
3. Cierra sesion e inicia como `gerente@novatech.mx`, `lider@novatech.mx` y `empleado1@novatech.mx`.
4. Verifica que cada rol vea solo lo que le corresponde.
5. Intenta acceder manualmente a una ruta restringida con `empleado1@novatech.mx` para validar el `403`.

## 2. Gestion de usuarios

1. Entra como `admin@novatech.mx`.
2. Ve al modulo de usuarios.
3. Crea un usuario nuevo y confirma que el sistema genere una contrasena temporal.
4. Edita un usuario existente.
5. Desactiva o reactiva un usuario.
6. Intenta iniciar sesion con `empleado9@novatech.mx` para probar comportamiento de cuenta inactiva.

## 3. Vista de portafolio ejecutivo

1. Inicia como `gerente@novatech.mx` o `admin@novatech.mx`.
2. Abre la seccion de reportes.
3. Revisa las tarjetas de resumen por proyecto.
4. Identifica proyectos con alerta visual por alto porcentaje de tareas vencidas.
5. Haz clic en una tarjeta para navegar al detalle del proyecto.

## 4. Dashboard de reportes por proyecto

1. Desde reportes, abre un proyecto activo.
2. Valida metricas de avance, tareas vencidas y dias restantes.
3. Revisa la grafica por prioridad.
4. Exporta el reporte PDF desde el detalle del proyecto.
5. Comprueba el formato de nombre `Reporte_[NombreProyecto]_[Fecha]`.

## 5. Reportes segun liderazgo

1. Inicia como `lider@novatech.mx`.
2. Entra al detalle de `PRJ-001` o `PRJ-003`.
3. Abre el reporte del proyecto y confirma acceso permitido.
4. Intenta entrar al resumen completo de portafolio y valida restriccion si aplica.

## 6. Gestion de proyectos

1. Inicia como `gerente@novatech.mx`.
2. Abre el listado de proyectos.
3. Usa filtros por estado, lider y fecha.
4. Entra a un proyecto activo.
5. Edita datos generales del proyecto.
6. Cierra un proyecto y valida que el sistema archive tareas pendientes.

## 7. Asignacion y seguimiento de tareas

1. Inicia como `lider2@novatech.mx`.
2. Abre `PRJ-004` o `PRJ-002`.
3. Crea una tarea nueva con prioridad, fecha y etiquetas.
4. Asigna la tarea a un empleado.
5. Cambia estados entre pendiente, progreso, revision y completada.
6. Verifica que en proyectos pausados o cerrados no se puedan crear o editar tareas como si estuvieran activas.

## 8. Tablero y lista de tareas

1. Inicia como `empleado1@novatech.mx`.
2. Abre sus tareas asignadas.
3. Usa filtros y busqueda.
4. Cambia el estado de una tarea propia.
5. Revisa fechas de vencimiento y prioridades.

## 9. Comentarios y trazabilidad

1. Entra al detalle de una tarea con comentarios.
2. Agrega un comentario nuevo.
3. Elimina logicamente un comentario propio si el flujo lo permite.
4. Verifica que el historial se conserve y se muestre como comentario eliminado.

## 10. Notificaciones

1. Inicia como `lider2@novatech.mx`, `empleado4@novatech.mx` o `empleado8@novatech.mx`.
2. Revisa el icono de notificaciones en la barra superior.
3. Confirma que haya notificaciones sin leer.
4. Abre una notificacion y valida que cambie a leida.

## 11. Navegacion a detalle de proyecto

1. Desde reportes, proyectos o notificaciones, entra a un proyecto especifico.
2. Confirma que el detalle muestre lider, miembros, tareas, comentarios y acciones.
3. Repite con un proyecto `ACTIVO`, uno `PAUSADO` y uno `CERRADO` para comparar comportamiento.

## 12. Casos concretos recomendados por cuenta

- `admin@novatech.mx`: administracion de usuarios, acceso completo a reportes, revision global.
- `gerente@novatech.mx`: portafolio, reportes ejecutivos, filtros de proyectos, cierre de proyecto.
- `lider@novatech.mx`: seguimiento de `PRJ-001` y `PRJ-003`, revision de tareas, reportes de proyectos liderados.
- `lider2@novatech.mx`: gestion de `PRJ-002` y `PRJ-004`, creacion de tareas, notificaciones y prioridades.
- `lider3@novatech.mx`: revisar `PRJ-005` y `PRJ-006` para comparar activo vs cerrado.
- `empleado1@novatech.mx`: tareas activas en `PRJ-001` y `PRJ-002`.
- `empleado4@novatech.mx`: tarea asignada en inventario y notificacion sin leer.
- `empleado8@novatech.mx`: tarea en mesa de ayuda y experiencia de notificaciones.

## Datos utiles para demostracion

- Hay proyectos con tareas vencidas para visualizar alertas.
- Hay tareas completadas y otras en revision para ver avances reales.
- Hay un proyecto cerrado para comprobar modo de solo lectura.
- Hay un proyecto pausado para validar restricciones operativas.
- Hay comentarios historicos para demostrar trazabilidad.

## Si necesitas recargar la demo

Desde `backend/` ejecuta:

```bash
npx ts-node --files prisma/seed.ts
```

Esto vuelve a poblar la base local con el escenario demo completo.
