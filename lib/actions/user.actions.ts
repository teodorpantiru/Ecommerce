"use server";

import {
  shippingAdressSchema,
  signInFormSchema,
  signUpFormSchema,
} from "../validator";
import { signIn, signOut, auth } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { hashSync } from "bcrypt-ts-edge";
import { prisma } from "@/db/prisma";
import { formatError } from "../utils";
import { ShippingAddress } from "@/types";

// Sign in the user with credentials

export async function signInWithCredentials(
  previousState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    await signIn("credentials", user);
    return {
      success: true,
      message: "Signed in successfully",
    };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: "Invalid email or password" };
  }
}

// Sign user out

export async function signOutUser() {
  await signOut();
}

// Sign Up user

export async function signUpUser(_: unknown, formData: FormData) {
  try {
    const parsed = signUpFormSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    // normalize email (optional but recommended)
    const normalizedEmail = String(parsed.email).trim().toLowerCase();

    // --- pre-check (avoids throwing) ---
    if (normalizedEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        return { success: false, message: "This email is already registered." };
      }
    }

    const plainPassword = parsed.password;
    const hashed = hashSync(parsed.password, 10);

    await prisma.user.create({
      data: {
        name: parsed.name,
        email: normalizedEmail, // use normalized
        password: hashed,
      },
    });

    await signIn("credentials", {
      email: normalizedEmail,
      password: plainPassword,
    });

    return { success: true, message: "User registered successfully" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (isRedirectError(error)) throw error;

    // --- P2002 fallback (race condition safe) ---
    if (error?.code === "P2002") {
      return { success: false, message: "This email is already registered." };
    }

    return { success: false, message: formatError(error) };
  }
}

// Get a user by id

export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");
  return user;
}

//Update user's address

export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error("User not found");

    //And this is where we want to take the data that's passed in. And we want to validate it through the shipping address schema.
    const address = shippingAdressSchema.parse(data);

    // Now we have the address and we want to update the db
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

    return {
      success: true,
      message: "User address updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
