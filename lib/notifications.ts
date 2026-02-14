import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

type NotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  body?: string;
  href?: string;
};

export async function createNotification(input: NotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type ?? NotificationType.SYSTEM,
        title: input.title,
        body: input.body,
        href: input.href,
      },
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}
