"use server";

import { signInFormSchema, signUpFormSchema } from "../validator";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { hashSync } from "bcrypt-ts-edge";
import { prisma } from "@/db/prisma";
import { formatError } from "../utils";

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
