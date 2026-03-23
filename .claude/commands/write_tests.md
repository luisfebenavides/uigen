Genera tests unitarios para el archivo indicado en el argumento `$ARGUMENTS`. Si no se especifica ninguno, pide al usuario que indique qué archivo quiere testear.

## Proceso

1. **Lee el archivo objetivo** y entiende qué exporta: funciones, clases, componentes React, hooks, etc.
2. **Revisa los tests existentes** en `src/` para respetar el estilo del proyecto antes de escribir nada.
3. **Determina la ubicación correcta** del archivo de tests:
   - Si el archivo está en `src/lib/`, el test va en `src/lib/__tests__/`.
   - Si está en `src/components/foo/`, el test va en `src/components/foo/__tests__/`.
   - El nombre del archivo de tests es `<nombre-original>.test.ts` o `.test.tsx` según aplique.
4. **Escribe los tests** siguiendo estrictamente el estilo del proyecto (detallado abajo).
5. **Ejecuta los tests** con `npx vitest run <ruta-del-test>` y corrige cualquier error hasta que pasen.

## Estilo de tests del proyecto

### Imports
- Tests de utilidades/clases: `import { test, expect, vi } from "vitest"`
- Tests de componentes React: añadir `import { render, screen, fireEvent, cleanup } from "@testing-library/react"` y `import userEvent from "@testing-library/user-event"`
- Usar siempre el alias `@/` para imports del proyecto (nunca rutas relativas `../../`)

### Estructura
- Usar `test("descripción en español o inglés", () => { ... })` — **sin bloques `describe`** salvo que haya muchos grupos claramente diferenciados
- Para componentes React: añadir `afterEach(() => { cleanup(); })` al inicio
- Cada `test` debe ser independiente: crear sus propios datos, no compartir estado entre tests

### Qué testear
- **Utilidades/clases**: casos normales, casos borde (null, vacío, valores extremos), casos de error esperados
- **Componentes React**: renderizado inicial, interacciones del usuario (click, typing), cambios de props, comportamiento condicional
- **Hooks/contextos**: comportamiento del estado, efectos secundarios, callbacks
- Mockear dependencias externas con `vi.fn()` y verificar que se llamaron con los argumentos correctos
- NO testear detalles de implementación interna; testear comportamiento observable

### Convenciones
- Descripciones de test claras y específicas: `"calls handleSubmit when Enter is pressed"` no `"test submit"`
- Usar `vi.fn()` para callbacks y props de función
- Preferir `screen.getByRole`, `screen.getByText`, `screen.getByPlaceholderText` sobre `getByTestId`
- No usar `describe` si el archivo tiene menos de ~8 tests

## Ejemplo de referencia (componente)
```tsx
import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MiComponente } from "../MiComponente";

afterEach(() => {
  cleanup();
});

test("renders the component with default props", () => {
  render(<MiComponente label="Hola" />);
  expect(screen.getByText("Hola")).toBeDefined();
});

test("calls onClick when button is clicked", () => {
  const onClick = vi.fn();
  render(<MiComponente label="Click me" onClick={onClick} />);
  fireEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledOnce();
});
```

## Ejemplo de referencia (utilidad)
```ts
import { test, expect } from "vitest";
import { miFuncion } from "@/lib/mi-funcion";

test("returns expected value for normal input", () => {
  expect(miFuncion("input")).toBe("expected");
});

test("returns null for empty string", () => {
  expect(miFuncion("")).toBeNull();
});
```
