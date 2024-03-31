-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_id_key" ON "Users"("id");
