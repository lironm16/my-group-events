/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_CONTACT_EMAIL?: string;
    NEXT_PUBLIC_VAPID_PUBLIC_KEY?: string;
    WEB_PUSH_VAPID_PUBLIC_KEY?: string;
    WEB_PUSH_VAPID_PRIVATE_KEY?: string;
    NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?: string;
    WEB_PUSH_INCLUDE_INITIATOR?: string;
    NEXT_PUBLIC_APP_GENDERS?: string;
  }
}

