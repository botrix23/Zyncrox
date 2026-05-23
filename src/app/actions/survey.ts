"use server";

import { db } from "@/db";
import { surveyQuestions, tenants } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getPlanFeatures } from "@/core/plans";

export async function updateSurveySettingsAction(tenantId: string, reviewsEnabled: boolean) {
  try {
    await db.update(tenants)
      .set({ reviewsEnabled, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    revalidatePath("/[locale]/admin/surveys", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating survey settings:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function getSurveyQuestionsAction(tenantId: string, onlyActive = false) {
  try {
    const whereClause = onlyActive 
      ? and(eq(surveyQuestions.tenantId, tenantId), eq(surveyQuestions.isActive, true))
      : eq(surveyQuestions.tenantId, tenantId);

    return await db.query.surveyQuestions.findMany({
      where: whereClause,
      orderBy: [asc(surveyQuestions.sortOrder)],
    });
  } catch (error) {
    console.error("Error fetching survey questions:", error);
    return [];
  }
}

export async function upsertSurveyQuestionAction(data: {
  id?: string;
  tenantId: string;
  questionText: string;
  questionType: 'STARS' | 'YES_NO' | 'TEXT' | 'NPS';
  category: 'STAFF' | 'BUSINESS';
  isRequired: boolean;
  isActive: boolean;
  sortOrder?: number;
}) {
  try {
    // Guard: NPS questions are exclusive to the Business (ENTERPRISE) plan
    if (data.questionType === 'NPS' && !data.id) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, data.tenantId),
        columns: { plan: true },
      });
      if (!getPlanFeatures(tenant?.plan).nps) {
        return { success: false, error: 'NPS_NOT_ALLOWED' };
      }
    }

    if (data.id) {
      // Update
      await db.update(surveyQuestions)
        .set({
          questionText: data.questionText,
          questionType: data.questionType,
          category: data.category,
          isRequired: data.isRequired,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(surveyQuestions.id, data.id));
    } else {
      // Create
      // Get max sort order
      const questions = await db.query.surveyQuestions.findMany({
        where: eq(surveyQuestions.tenantId, data.tenantId),
        orderBy: [asc(surveyQuestions.sortOrder)],
      });
      const nextSortOrder = questions.length > 0 
        ? Math.max(...questions.map(q => q.sortOrder)) + 1 
        : 0;

      await db.insert(surveyQuestions).values({
        tenantId: data.tenantId,
        questionText: data.questionText,
        questionType: data.questionType,
        category: data.category,
        isRequired: data.isRequired,
        isActive: data.isActive,
        sortOrder: data.sortOrder ?? nextSortOrder,
      });
    }

    revalidatePath("/[locale]/admin/surveys", "page");
    return { success: true };
  } catch (error) {
    console.error("Error upserting survey question:", error);
    return { success: false, error: "Failed to save question" };
  }
}

export async function deleteSurveyQuestionAction(id: string) {
  try {
    await db.delete(surveyQuestions).where(eq(surveyQuestions.id, id));
    revalidatePath("/[locale]/admin/surveys", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting survey question:", error);
    return { success: false, error: "Failed to delete question" };
  }
}

export async function reorderSurveyQuestionsAction(tenantId: string, questionIds: string[]) {
  try {
    // Perform updates in a transaction for atomicity
    await db.transaction(async (tx) => {
      for (let i = 0; i < questionIds.length; i++) {
        await tx.update(surveyQuestions)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(surveyQuestions.id, questionIds[i]), eq(surveyQuestions.tenantId, tenantId)));
      }
    });

    revalidatePath("/[locale]/admin/surveys", "page");
    return { success: true };
  } catch (error) {
    console.error("Error reordering survey questions:", error);
    return { success: false, error: "Failed to reorder questions" };
  }
}
