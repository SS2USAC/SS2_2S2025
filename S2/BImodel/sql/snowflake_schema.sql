-- Dimensiones normalizadas
CREATE TABLE Categoria (
    id_categoria INT PRIMARY KEY,
    nombre_categoria VARCHAR(50)
);

CREATE TABLE DimProducto (
    id_producto INT PRIMARY KEY,
    nombre_producto VARCHAR(100),
    id_categoria INT,
    marca VARCHAR(50),
    FOREIGN KEY (id_categoria) REFERENCES Categoria(id_categoria)
);

CREATE TABLE Pais (
    id_pais INT PRIMARY KEY,
    nombre_pais VARCHAR(50)
);

CREATE TABLE Ciudad (
    id_ciudad INT PRIMARY KEY,
    nombre_ciudad VARCHAR(50),
    id_pais INT,
    FOREIGN KEY (id_pais) REFERENCES Pais(id_pais)
);

CREATE TABLE DimCliente (
    id_cliente INT PRIMARY KEY,
    nombre_cliente VARCHAR(100),
    id_ciudad INT,
    FOREIGN KEY (id_ciudad) REFERENCES Ciudad(id_ciudad)
);

-- Tiempo y Vendedor (igual que estrella)
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
