"use client";

import { useQuery } from "@tanstack/react-query";
import { researchApi } from "@/lib/research";

/**
 * Server-state hooks. All research values arrive from the FastAPI research
 * service (which reads the generated research outputs) — never hardcoded here.
 */

const STALE_TIME = 5 * 60 * 1000;

export function useResearchSummary() {
  return useQuery({
    queryKey: ["research", "summary"],
    queryFn: researchApi.summary,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useResearchSessions() {
  return useQuery({
    queryKey: ["research", "sessions"],
    queryFn: researchApi.sessions,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useSignalDecay() {
  return useQuery({
    queryKey: ["research", "signal-decay"],
    queryFn: researchApi.signalDecay,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useMethodology() {
  return useQuery({
    queryKey: ["research", "methodology"],
    queryFn: researchApi.methodology,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useExecutionData() {
  return useQuery({
    queryKey: ["research", "execution"],
    queryFn: researchApi.execution,
    staleTime: STALE_TIME,
    retry: 1,
  });
}

export function useSignalSpace() {
  return useQuery({
    queryKey: ["research", "signal-space"],
    queryFn: researchApi.signalSpace,
    staleTime: STALE_TIME,
    retry: 1,
  });
}
