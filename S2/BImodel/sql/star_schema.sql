-- Dimensiones
CREATE TABLE DimProducto (
    id_producto INT PRIMARY KEY,
    nombre_producto VARCHAR(100),
    categoria VARCHAR(50),
    marca VARCHAR(50)
);

CREATE TABLE DimCliente (
    id_cliente INT PRIMARY KEY,
    nombre_cliente VARCHAR(100),
    ciudad VARCHAR(50),
    pais VARCHAR(50)
);

CREATE TABLE DimTiempo (
    id_tiempo INT PRIMARY KEY,
    fecha DATE,
    dia INT,
    mes INT,
    año INT,
    trimestre INT
);

CREATE TABLE DimVendedor (
    id_vendedor INT PRIMARY KEY,
    nombre_vendedor VARCHAR(100),
    region VARCHAR(50)
);

-- Hechos
CREATE TABLE FactVentas (
    id_venta INT PRIMARY KEY,
    id_tiempo INT,
    id_producto INT,
    id_cliente INT,
    id_vendedor INT,
    cantidad INT,
    precio_unitario DECIMAL(10,2),
    total DECIMAL(10,2),
    FOREIGN KEY (id_tiempo) REFERENCES DimTiempo(id_tiempo),
    FOREIGN KEY (id_producto) REFERENCES DimProducto(id_producto),
    FOREIGN KEY (id_cliente) REFERENCES DimCliente(id_cliente),
    FOREIGN KEY (id_vendedor) REFERENCES DimVendedor(id_vendedor)
);
