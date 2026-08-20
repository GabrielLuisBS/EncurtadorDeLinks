-- CreateTable
CREATE TABLE "CliqueDiaPorOrigem" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "dispositivo" VARCHAR NOT NULL,
    "pais" VARCHAR NOT NULL DEFAULT '',
    "total" INTEGER NOT NULL,

    CONSTRAINT "CliqueDiaPorOrigem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CliqueDiaPorOrigem_linkId_dia_idx" ON "CliqueDiaPorOrigem"("linkId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "CliqueDiaPorOrigem_linkId_dia_dispositivo_pais_key" ON "CliqueDiaPorOrigem"("linkId", "dia", "dispositivo", "pais");

-- AddForeignKey
ALTER TABLE "CliqueDiaPorOrigem" ADD CONSTRAINT "CliqueDiaPorOrigem_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
