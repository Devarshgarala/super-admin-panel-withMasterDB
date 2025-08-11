const workspaceSchemaTemplate = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Admin {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      String   @default("admin")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("admins")
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
`;

module.exports = { workspaceSchemaTemplate };