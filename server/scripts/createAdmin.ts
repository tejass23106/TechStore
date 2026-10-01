import bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma.js";

const email = "tejass23106@gmail.com";

async function main() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is required. Set it in PowerShell before running this script."
    );
  }

  if (password.length < 6) {
    throw new Error("Admin password must be at least 6 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    const user = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        role: "ADMIN",
        passwordHash,
      },
    });

    console.log(`Admin account updated: ${user.email}`);
  } else {
    const user = await prisma.user.create({
      data: {
        name: "TechStore Admin",
        email,
        passwordHash,
        role: "ADMIN",
      },
    });

    console.log(`Admin account created: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error("Admin setup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });