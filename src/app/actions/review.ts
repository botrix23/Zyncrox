"use server";

import { db } from "@/db";
import { reviews, bookings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createReviewAction(data: {
  tenantId: string;
  bookingId: string;
  staffId: string;
  rating: number; // Primary/Global rating
  comment?: string;
  responses?: Array<{ 
    questionId: string; 
    answer: any; 
    questionText?: string; 
    questionType?: string; 
    category?: string;
  }>;
}) {
  try {
    // Check if review already exists for this booking
    const existing = await db.query.reviews.findFirst({
      where: eq(reviews.bookingId, data.bookingId)
    });

    if (existing) {
      return { success: false, error: "REVIEW_ALREADY_EXISTS" };
    }

    // Calculate average rating from responses if rating is not provided
    let finalRating = data.rating;
    if (data.responses && data.responses.length > 0) {
      // Filtrar solo preguntas de tipo ESTRELLA para el promedio general
      const starRatings = data.responses
        .filter(r => r.questionType === 'STARS' && typeof r.answer === 'number')
        .map(r => r.answer as number);
      
      if (starRatings.length > 0) {
        // Promedio simple redondeado
        const avg = starRatings.reduce((a, b) => a + b, 0) / starRatings.length;
        finalRating = Math.round(avg * 10) / 10; // Guardamos un decimal para mayor precisión en el dashboard
      }
    }

    const [newReview] = await db.insert(reviews).values({
      tenantId: data.tenantId,
      bookingId: data.bookingId,
      staffId: data.staffId,
      rating: String(finalRating),
      comment: data.comment,
      responses: data.responses || [],
    }).returning();

    revalidatePath("/[locale]/admin/staff", "page");
    return { success: true, review: newReview };
  } catch (error) {
    console.error("Error creating review:", error);
    return { success: false, error: "Failed to create review" };
  }
}

export async function getStaffReviewsAction(staffId: string) {
  try {
    return await db.query.reviews.findMany({
      where: eq(reviews.staffId, staffId),
      orderBy: (reviews, { desc }) => [desc(reviews.createdAt)]
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
}
