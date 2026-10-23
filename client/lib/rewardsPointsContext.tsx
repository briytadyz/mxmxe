import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { supabase } from "./supabase";

export type RewardsBalance = {
  organizationId: string;
  availablePoints: number;
} | null;

type RewardsPointsContextValue = {
  rewardsBalance: RewardsBalance;
  setRewardsBalance: Dispatch<SetStateAction<RewardsBalance>>;
  refreshRewardsBalance: () => Promise<void>;
};

const RewardsPointsContext = createContext<RewardsPointsContextValue | null>(null);

export const RewardsPointsProvider = ({ children }: { children: ReactNode }) => {
  const [rewardsBalance, setRewardsBalance] = useState<RewardsBalance>(null);
  const refreshRewardsBalance = useCallback(async () => {
    const { data: programs, error } = await supabase.rpc("get_my_hotel_loyalty_programs");
    if (error) return;
    const rewards = (programs || []) as Array<{ organizationId: string; availablePoints: number }>;
    setRewardsBalance((current) => {
      const program = rewards.find((candidate) => candidate.organizationId === current?.organizationId) || rewards[0];
      return program ? { organizationId: program.organizationId, availablePoints: program.availablePoints } : null;
    });
  }, []);

  return (
    <RewardsPointsContext.Provider value={{ rewardsBalance, setRewardsBalance, refreshRewardsBalance }}>
      {children}
    </RewardsPointsContext.Provider>
  );
};

export const useRewardsPoints = () => {
  const context = useContext(RewardsPointsContext);
  if (!context) throw new Error("useRewardsPoints must be used within RewardsPointsProvider");
  return context;
};
