import type { Prisma } from "@prisma/client";
import { hash } from "bcrypt-ts";
import prisma from "@/lib/prisma";
import type { UserCreate, UserUpdate } from "@/schema/user.schema";

export interface GetUsersParams {
  page: number;
  limit: number;
  search: string;
  sort: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: using for user services
export class UserService {
  static async getUsers({ page, limit, search }: GetUsersParams) {
    const where: Prisma.UsersWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.users.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.users.count({ where }),
    ]);

    return {
      data: data.map(({ password, ...user }) => user),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  static async createUser(data: UserCreate) {
    const hashedPassword = await hash(data.password, 10);
    // biome-ignore lint/correctness/noUnusedVariables: password is not used for return to client
    const { password, ...user } = await prisma.users.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
    return user;
  }

  static async updateUser(data: UserUpdate) {
    const { id, password, ...rest } = data;
    const updateData: Prisma.UsersUpdateInput = { ...rest };

    if (password && password.length > 0) {
      updateData.password = await hash(password, 10);
    }

    const { password: _, ...user } = await prisma.users.update({
      where: { id },
      data: updateData,
    });
    return user;
  }

  static async deleteUser(id: string) {
    // biome-ignore lint/correctness/noUnusedVariables: password is not used for return to client
    const { password, ...user } = await prisma.users.delete({
      where: { id },
    });
    return user;
  }
}
