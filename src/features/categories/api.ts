import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type CategoryType = 1 | 2;

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

export type CreateCategoryPayload = {
  name: string;
  type: CategoryType;
};

async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>("/categories");
  return response.data;
}

async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const response = await apiClient.post<Category>("/categories", payload);
  return response.data;
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
}

export function useCreateCategoryMutation() {
  return useMutation({
    mutationFn: createCategory,
  });
}

export function categoryTypeLabel(type: CategoryType): string {
  if (type === 1) return "Income";
  return "Expense";
}
