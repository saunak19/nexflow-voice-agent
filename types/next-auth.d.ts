import { Role } from "@prisma/client"
import { type DefaultSession } from "next-auth"

// NextAuth v5 (Auth.js) augmentation requires targeting both the re-exported 
// types and the underlying @auth/core types for complete coverage in callbacks.

declare module "next-auth" {
  interface User {
    role?: Role
    tenantId?: string | null
  }
  interface Session {
    user: {
      role?: Role
      tenantId?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role
    tenantId?: string | null
  }
}

declare module "@auth/core/types" {
  interface User {
    role?: Role
    tenantId?: string | null
  }
  interface Session {
    user: {
      role?: Role
      tenantId?: string | null
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role
    tenantId?: string | null
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role?: Role
    tenantId?: string | null
  }
}
