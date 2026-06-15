"use server";

import { UserCreateSchema, UserUpdateSchema } from "@/schema/user.schema";
import { type GetUsersParams, UserService } from "@/services/user.service";

export async function getUsersAction(params: GetUsersParams) {
  try {
    const data = await UserService.getUsers(params);
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}

export async function createUserAction(formData: unknown) {
  try {
    const parsed = UserCreateSchema.parse(formData);
    const user = await UserService.createUser(parsed);
    return { success: true, data: user };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}

export async function updateUserAction(formData: unknown) {
  try {
    const parsed = UserUpdateSchema.parse(formData);
    const user = await UserService.updateUser(parsed);
    return { success: true, data: user };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}

export async function deleteUserAction(id: string) {
  try {
    const user = await UserService.deleteUser(id);
    return { success: true, data: user };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}
