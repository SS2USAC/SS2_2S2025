CREATE DATABASE SGFOOD2025;
GO

USE SGFOOD2025;
GO

CREATE TABLE Dim_Tiempo (
    FechaKey DATE PRIMARY KEY,
    Año INT,
    Mes INT,
    NombreMes NVARCHAR(20),
    Trimestre NVARCHAR(10),
    DiaSemana NVARCHAR(20)
);

CREATE TABLE Dim_Producto (
    CodProducto NVARCHAR(10) PRIMARY KEY,
    NombreProducto NVARCHAR(100),
    MarcaProducto NVARCHAR(50),
    Categoria NVARCHAR(50)
);

CREATE TABLE Dim_Sucursal (
    CodSucursal NVARCHAR(10) PRIMARY KEY,
    NombreSucursal NVARCHAR(100),
    Region NVARCHAR(50),
    Departamento NVARCHAR(50)
);

CREATE TABLE Dim_Proveedor (
    CodProveedor NVARCHAR(10) PRIMARY KEY,
    NombreProveedor NVARCHAR(100)
);

CREATE TABLE Dim_Cliente (
    CodCliente NVARCHAR(10) PRIMARY KEY,
    NombreCliente NVARCHAR(100),
    TipoCliente NVARCHAR(20)
);

CREATE TABLE Dim_Vendedor (
    CodVendedor NVARCHAR(10) PRIMARY KEY,
    NombreVendedor NVARCHAR(100)
);

CREATE TABLE Hechos_Compras (
    FechaKey DATE,
    CodProducto NVARCHAR(10),
    CodSucursal NVARCHAR(10),
    CodProveedor NVARCHAR(10),
    UnidadesCompradas INT,
    CostoUnitario DECIMAL(10,2),
    TotalCosto AS (UnidadesCompradas * CostoUnitario),
    CONSTRAINT FK_HC_Fecha FOREIGN KEY (FechaKey) REFERENCES Dim_Tiempo(FechaKey),
    CONSTRAINT FK_HC_Producto FOREIGN KEY (CodProducto) REFERENCES Dim_Producto(CodProducto),
    CONSTRAINT FK_HC_Sucursal FOREIGN KEY (CodSucursal) REFERENCES Dim_Sucursal(CodSucursal),
    CONSTRAINT FK_HC_Proveedor FOREIGN KEY (CodProveedor) REFERENCES Dim_Proveedor(CodProveedor)
);

CREATE TABLE Hechos_Ventas (
    FechaKey DATE,
    CodProducto NVARCHAR(10),
    CodSucursal NVARCHAR(10),
    CodCliente NVARCHAR(10),
    CodVendedor NVARCHAR(10),
    UnidadesVendidas INT,
    PrecioUnitario DECIMAL(10,2),
    TotalVenta AS (UnidadesVendidas * PrecioUnitario),
    CONSTRAINT FK_HV_Fecha FOREIGN KEY (FechaKey) REFERENCES Dim_Tiempo(FechaKey),
    CONSTRAINT FK_HV_Producto FOREIGN KEY (CodProducto) REFERENCES Dim_Producto(CodProducto),
    CONSTRAINT FK_HV_Sucursal FOREIGN KEY (CodSucursal) REFERENCES Dim_Sucursal(CodSucursal),
    CONSTRAINT FK_HV_Cliente FOREIGN KEY (CodCliente) REFERENCES Dim_Cliente(CodCliente),
    CONSTRAINT FK_HV_Vendedor FOREIGN KEY (CodVendedor) REFERENCES Dim_Vendedor(CodVendedor)
);


CREATE TABLE Pivote_Compras (
    Fecha DATE,
    CodProducto NVARCHAR(10),
    CodSucursal NVARCHAR(10),
    CodProveedor NVARCHAR(10),
    UnidadesCompradas INT,
    CostoUnitario DECIMAL(10,2)
);

CREATE TABLE Pivote_Ventas (
    Fecha DATE,
    CodProducto NVARCHAR(10),
    CodSucursal NVARCHAR(10),
    CodCliente NVARCHAR(10),
    CodVendedor NVARCHAR(10),
    UnidadesVendidas INT,
    PrecioUnitario DECIMAL(10,2)
);
