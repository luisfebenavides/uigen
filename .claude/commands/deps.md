Analiza las dependencias del proyecto en tres áreas y dame un resumen consolidado:

1. **Desactualizadas**: Ejecuta `npm outdated` y lista los paquetes con versión actual, versión deseada y última versión disponible. Indica cuáles son actualizaciones de parche, menor o mayor (breaking changes).

2. **No utilizadas**: Revisa el `package.json` y busca en el código fuente (`src/`) qué paquetes del `dependencies` y `devDependencies` no aparecen importados en ningún archivo. Ignora paquetes que se usan indirectamente (por ejemplo, plugins de build, tipos `@types/*` relacionados a paquetes usados, `prisma` si hay esquemas, etc.).

3. **Vulnerabilidades**: Ejecuta `npm audit --json` y resume las vulnerabilidades encontradas por severidad (critical, high, moderate, low), indicando qué paquete las tiene y si hay fix disponible.

Al final, dame una lista de acciones recomendadas ordenadas por prioridad.
