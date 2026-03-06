-- CreateTable
CREATE TABLE "CarBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarBrand_name_key" ON "CarBrand"("name");

-- CreateIndex
CREATE INDEX "CarBrand_name_idx" ON "CarBrand"("name");

-- CreateIndex
CREATE INDEX "CarModel_brandId_idx" ON "CarModel"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "CarModel_name_brandId_key" ON "CarModel"("name", "brandId");

-- AddForeignKey
ALTER TABLE "CarModel" ADD CONSTRAINT "CarModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "CarBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
