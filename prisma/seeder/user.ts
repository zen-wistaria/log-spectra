import { hash } from "bcrypt-ts";
import prisma from "../client";

const [username, password, name] = ["admin", "Admin321!", "Admin"];

export const user = async () => {
  try {
    await prisma.users.upsert({
      where: {
        username,
      },
      create: {
        username,
        password: await hash(password, 10),
        name,
      },
      update: {
        password: await hash(password, 10),
        name,
      },
    });
    console.log("User created");
  } catch (error) {
    console.error("Failed to create user: ", error);
  }
};
