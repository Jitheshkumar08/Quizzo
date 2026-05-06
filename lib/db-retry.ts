import { Prisma } from "@prisma/client";

function isTransientDatabaseConnectionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P1001" || error.code === "P1002" || error.code === "P1017")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>) {
  const retryDelays = [250, 650];
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseConnectionError(error) || attempt === retryDelays.length) {
        throw error;
      }

      lastError = error;
      await wait(retryDelays[attempt]);
    }
  }

  throw lastError;
}
