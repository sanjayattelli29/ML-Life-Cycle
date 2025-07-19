declare global {
  namespace NodeJS {
    interface ProcessEnv {
      RAZORPAY_KEY_ID: string;
      RAZORPAY_KEY_SECRET: string;
      NEXT_PUBLIC_RAZORPAY_KEY_ID: string;
    }
  }
}
