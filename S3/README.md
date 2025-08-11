# Micrososft SQL Server Integration Services (SSIS)

Microsoft SSIS es un paquete que ofreve un flujo visual e intuitivo para desarrollar una solución ETL adecuada para el contexto necesario el cual el usuario la requiera.

---

## Alcance

* **Fuente principal**: Flat File (CSV) *Compras*
* **Transformaciones clave**: Data Conversion, Derived Column (fix de fechas/valores), Conditional Split, Union All, Multicast, Sort, Lookup
* **Destino**: OLE DB Destination (DW/ODS). Por ahora se inserta **DimFecha**

---

## Arquitectura (alto nivel)

```mermaid
flowchart TB
  F["Flat File Source<br/>Compras CSV"]
  DC1["Data Conversion<br/>Compras DC"]
  DF["Derived Column<br/>Fecha Fix (corrige 'Z'->'2')"]
  DC2["Data Conversion<br/>Compras DC Fix"]
  UA1["Union All<br/>Compras Union All"]
  CS["Conditional Split<br/>Errores: ints y números negativos"]
  FIX["Derived Column<br/>Corrección de negativos"]
  UA2["Union All<br/>Compras UA"]
  MC["Multicast<br/>Compras Multicast"]
  SORT["Sort<br/>Fecha Sort (distinct)"]
  DCF["Derived Column<br/>Year/Month/MonthName/DayName"]
  LK["Lookup<br/>DimFecha existente?"]
  OLE["OLE DB Destination<br/>Fecha Insert"]

  F --> DC1
  DC1 -- Error Output --> DF --> DC2 --> UA1
  DC1 --> UA1
  UA1 --> CS
  CS -- Registros con error --> FIX --> UA2
  CS -- Registros sin error --> UA2
  UA2 --> MC
  MC --> SORT --> DCF --> LK
  LK -- No Match --> OLE
```


## Flujo de Ejecución (detallado)

1. **Extracción**

   * `Compras CSV`: lee archivo plano con tipificación inicial.
2. **Normalización de tipos y fechas**

   * `Compras DC`: castea columnas base. Filas que fallen en conversión **van por Error Output**.
   * `Fecha Fix` (Derived Column): corrige valores de fecha con carácter `'Z'` mal tipeado por `'2'` y otros formateos menores.
   * `Compras DC Fix`: segundo Data Conversion tras la corrección.
   * `Compras Union All`: une el flujo exitoso con el flujo corregido.
3. **Calidad de datos (valores negativos)**

   * `Conditional Split`: separa **registros con error** (p. ej. cantidades/costos negativos donde no aplica) y **registros sin error**.
   * `Derived Column` (corrección): normaliza negativos (por ejemplo, `ABS(Unidades)`, `ABS(Costo)` o reglas acordadas de negocio).
   * `Compras UA` (Union All): reune ambas corrientes ya válidas.
4. **Distribución**

   * `Compras Multicast`: ramifica a cargas de dimensiones/hechos. Implementada **DimFecha**.
5. **Dimensión Fecha**

   * `Fecha Sort`: ordena por fecha y habilita `Remove rows with duplicate sort values` para deduplicar.
   * `Fecha DC` (Derived Column): deriva `Anio`, `Mes`, `NombreMes`, `NombreDia` desde el campo `Fecha`.
   * `Fecha LK` (Lookup): busca en `DimFecha(FechaKey/FechaDate)`.

     * **Match**: descarta (ya existe).
     * **No Match Output**: envía a inserción.
   * `Fecha Insert` (OLE DB Destination): inserta nuevas filas en `DimFecha`.

---

## Reglas de Validación

* Conteo pos-`Compras UA` = conteo (`sin error`) + conteo (`corregidos`).
* `% de filas en Error Output de DC1` bajo umbral acordado (<1%).
* En DimFecha: `COUNT(DISTINCT Fecha)` = filas insertadas + filas existentes.

---

## Manejo de Errores

* **Data Conversion (DC1)**: redirección por **Error Output** hacia flujo de corrección (`Fecha Fix` + `DC2`).
* **Conditional Split**: ruta de **Registros con error** (negativos) para normalización; log de conteos por rama.
* **Logging**: habilitar en SSISDB (All Executions / All Messages). Guardar conteos por paso en tabla `etl.RunMetrics`.

---
