CREATE DATABASE SGFOOD2025_Estrella;
GO

USE SGFOOD2025_Estrella;
GO

CREATE TABLE Dim_HC_Tiempo (
    FechaKey DATE PRIMARY KEY,
    Año INT,
    Mes INT,
    NombreMes VARCHAR(20),
    Trimestre VARCHAR(10),
    DiaSemana VARCHAR(20)
);

CREATE TABLE Dim_HC_Producto (
    CodProducto_HC VARCHAR(10) PRIMARY KEY,
    NombreProducto VARCHAR(100),
    MarcaProducto VARCHAR(50),
    Categoria VARCHAR(50)
);

CREATE TABLE Dim_HC_Sucursal (
    CodSucursal_HC VARCHAR(10) PRIMARY KEY,
    NombreSucursal VARCHAR(100),
    Region VARCHAR(50),
    Departamento VARCHAR(50)
);

CREATE TABLE Dim_Proveedor (
    CodProveedor VARCHAR(10) PRIMARY KEY,
    NombreProveedor VARCHAR(100)
);

CREATE TABLE Dim_HV_Tiempo (
    FechaKey DATE PRIMARY KEY,
    Año INT,
    Mes INT,
    NombreMes VARCHAR(20),
    Trimestre VARCHAR(10),
    DiaSemana VARCHAR(20)
);

CREATE TABLE Dim_HV_Producto (
    CodProducto_HV VARCHAR(10) PRIMARY KEY,
    NombreProducto VARCHAR(100),
    MarcaProducto VARCHAR(50),
    Categoria VARCHAR(50)
);

CREATE TABLE Dim_HV_Sucursal (
    CodSucursal_HV VARCHAR(10) PRIMARY KEY,
    NombreSucursal VARCHAR(100),
    Region VARCHAR(50),
    Departamento VARCHAR(50)
);

CREATE TABLE Dim_Cliente (
    CodCliente VARCHAR(10) PRIMARY KEY,
    NombreCliente VARCHAR(100),
    TipoCliente VARCHAR(20)
);

CREATE TABLE Dim_Vendedor (
    CodVendedor VARCHAR(10) PRIMARY KEY,
    NombreVendedor VARCHAR(100)
);

CREATE TABLE Hechos_Compras (
    FechaKey DATE,
    CodProducto_HC VARCHAR(10),
    CodSucursal_HC VARCHAR(10),
    CodProveedor VARCHAR(10),
    UnidadesCompradas INT,
    CostoUnitario DECIMAL(10,2),
    TotalCosto AS (UnidadesCompradas * CostoUnitario),
    CONSTRAINT FK_HC_Fecha FOREIGN KEY (FechaKey) REFERENCES Dim_HC_Tiempo(FechaKey),
    CONSTRAINT FK_HC_Producto FOREIGN KEY (CodProducto_HC) REFERENCES Dim_HC_Producto(CodProducto_HC),
    CONSTRAINT FK_HC_Sucursal FOREIGN KEY (CodSucursal_HC) REFERENCES Dim_HC_Sucursal(CodSucursal_HC),
    CONSTRAINT FK_HC_Proveedor FOREIGN KEY (CodProveedor) REFERENCES Dim_Proveedor(CodProveedor)
);

CREATE TABLE Hechos_Ventas (
    FechaKey DATE,
    CodProducto_HV VARCHAR(10),
    CodSucursal_HV VARCHAR(10),
    CodCliente VARCHAR(10),
    CodVendedor VARCHAR(10),
    UnidadesVendidas INT,
    PrecioUnitario DECIMAL(10,2),
    TotalVenta AS (UnidadesVendidas * PrecioUnitario),
    CONSTRAINT FK_HV_Fecha FOREIGN KEY (FechaKey) REFERENCES Dim_HV_Tiempo(FechaKey),
    CONSTRAINT FK_HV_Producto FOREIGN KEY (CodProducto_HV) REFERENCES Dim_HV_Producto(CodProducto_HV),
    CONSTRAINT FK_HV_Sucursal FOREIGN KEY (CodSucursal_HV) REFERENCES Dim_HV_Sucursal(CodSucursal_HV),
    CONSTRAINT FK_HV_Cliente FOREIGN KEY (CodCliente) REFERENCES Dim_Cliente(CodCliente),
    CONSTRAINT FK_HV_Vendedor FOREIGN KEY (CodVendedor) REFERENCES Dim_Vendedor(CodVendedor)
);
