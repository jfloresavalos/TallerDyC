-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MECHANIC', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'PENDING_CORRECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MECHANIC',
    "branchId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientDNI" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "branchId" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "arrivalOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "mechanicId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionTime" TIMESTAMP(3),
    "status" "ServiceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "correctionRequested" BOOLEAN NOT NULL DEFAULT false,
    "correctionReason" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_clientDNI_idx" ON "Vehicle"("clientDNI");

-- CreateIndex
CREATE INDEX "Vehicle_branchId_status_idx" ON "Vehicle"("branchId", "status");

-- CreateIndex
CREATE INDEX "Service_vehicleId_idx" ON "Service"("vehicleId");

-- CreateIndex
CREATE INDEX "Service_mechanicId_idx" ON "Service"("mechanicId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
