-- CreateTable
CREATE TABLE "CliqueDiaPorReferer" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "referer" VARCHAR NOT NULL DEFAULT '',
    "total" INTEGER NOT NULL,

    CONSTRAINT "CliqueDiaPorReferer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CliqueDiaPorReferer_linkId_dia_idx" ON "CliqueDiaPorReferer"("linkId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "CliqueDiaPorReferer_linkId_dia_referer_key" ON "CliqueDiaPorReferer"("linkId", "dia", "referer");

-- AddForeignKey
ALTER TABLE "CliqueDiaPorReferer" ADD CONSTRAINT "CliqueDiaPorReferer_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
