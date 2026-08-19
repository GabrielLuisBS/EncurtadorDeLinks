-- CreateTable
CREATE TABLE "Link" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(16) NOT NULL,
    "urlDestino" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clique" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pais" VARCHAR,
    "referer" VARCHAR,
    "dispositivo" VARCHAR,

    CONSTRAINT "Clique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CliqueDia" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "CliqueDia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Link_slug_key" ON "Link"("slug");

-- CreateIndex
CREATE INDEX "Clique_linkId_idx" ON "Clique"("linkId");

-- CreateIndex
CREATE INDEX "Clique_linkId_quando_idx" ON "Clique"("linkId", "quando");

-- CreateIndex
CREATE INDEX "CliqueDia_linkId_dia_idx" ON "CliqueDia"("linkId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "CliqueDia_linkId_dia_key" ON "CliqueDia"("linkId", "dia");

-- AddForeignKey
ALTER TABLE "Clique" ADD CONSTRAINT "Clique_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueDia" ADD CONSTRAINT "CliqueDia_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
